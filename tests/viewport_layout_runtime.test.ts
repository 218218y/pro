import test from 'node:test';
import assert from 'node:assert/strict';

import { observeViewportLayout } from '../esm/native/ui/react/viewport_layout_runtime.ts';

type ListenerEntry = {
  type: string;
  listener: EventListenerOrEventListenerObject;
  capture?: boolean;
};

function createWindowStub() {
  const listeners: ListenerEntry[] = [];
  const cancelled: number[] = [];
  let nextFrame = 0;
  const queue = new Map<number, FrameRequestCallback>();
  return {
    innerWidth: 1280,
    innerHeight: 720,
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: AddEventListenerOptions | boolean
    ) {
      listeners.push({ type, listener, capture: options === true ? true : options?.capture });
    },
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      const index = listeners.findIndex(entry => entry.type === type && entry.listener === listener);
      if (index >= 0) listeners.splice(index, 1);
    },
    requestAnimationFrame(callback: FrameRequestCallback) {
      const id = ++nextFrame;
      queue.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id: number) {
      cancelled.push(id);
      queue.delete(id);
    },
    flushFrame(id?: number) {
      const target = id ?? [...queue.keys()][0] ?? 0;
      if (!target) return;
      const callback = queue.get(target);
      queue.delete(target);
      callback?.(0);
    },
    get listeners() {
      return listeners.slice();
    },
    get cancelled() {
      return cancelled.slice();
    },
    get queuedFrames() {
      return [...queue.keys()];
    },
  };
}

function createDocumentStub(win: ReturnType<typeof createWindowStub>) {
  const listeners: ListenerEntry[] = [];
  return {
    defaultView: win as unknown as Window,
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: AddEventListenerOptions | boolean
    ) {
      listeners.push({ type, listener, capture: options === true ? true : options?.capture });
    },
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      const index = listeners.findIndex(entry => entry.type === type && entry.listener === listener);
      if (index >= 0) listeners.splice(index, 1);
    },
    get listeners() {
      return listeners.slice();
    },
  };
}

test('viewport layout runtime coalesces resize/scroll/resize-observer updates onto one animation frame and cleans up listeners', () => {
  const win = createWindowStub();
  const doc = createDocumentStub(win);
  const observedTargets: Element[] = [];
  let observerCallback: ResizeObserverCallback | null = null;
  let disconnects = 0;

  class ResizeObserverStub {
    constructor(callback: ResizeObserverCallback) {
      observerCallback = callback;
    }
    observe(target: Element) {
      observedTargets.push(target);
    }
    disconnect() {
      disconnects += 1;
    }
  }

  const globalWithResizeObserver = globalThis as typeof globalThis & {
    ResizeObserver?: typeof ResizeObserver;
  };
  const previousResizeObserver = globalWithResizeObserver.ResizeObserver;
  globalWithResizeObserver.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

  const updates: string[] = [];
  const targetA = { getBoundingClientRect: () => ({}) } as Element;
  const targetB = { getBoundingClientRect: () => ({}) } as Element;

  const cleanup = observeViewportLayout({
    doc: doc as unknown as Document,
    win: win as unknown as Window,
    onUpdate: () => {
      updates.push(`update:${updates.length}`);
    },
    resizeTargets: [targetA, targetA, null, targetB],
  });

  assert.equal(win.queuedFrames.length, 1);
  win.flushFrame();
  assert.deepEqual(updates, ['update:0']);
  assert.deepEqual(
    observedTargets,
    [targetA, targetB],
    'duplicate resize targets should be observed only once'
  );
  assert.equal(
    win.listeners.some(entry => entry.type === 'resize'),
    true
  );
  assert.equal(
    doc.listeners.some(entry => entry.type === 'scroll' && entry.capture),
    true
  );

  const resizeListener = win.listeners.find(entry => entry.type === 'resize')?.listener;
  assert.ok(resizeListener);
  (resizeListener as EventListener)(new Event('resize'));
  (resizeListener as EventListener)(new Event('resize'));
  assert.equal(win.queuedFrames.length, 1, 'repeated resize events should collapse to one queued frame');
  win.flushFrame();
  assert.deepEqual(updates, ['update:0', 'update:1']);

  observerCallback?.([], {} as ResizeObserver);
  assert.equal(win.queuedFrames.length, 1);
  cleanup();
  globalWithResizeObserver.ResizeObserver = previousResizeObserver;
  assert.equal(disconnects, 1);
  assert.equal(win.listeners.length, 0);
  assert.equal(doc.listeners.length, 0);
  assert.equal(win.cancelled.length >= 1, true, 'cleanup should cancel any queued frame');
});
