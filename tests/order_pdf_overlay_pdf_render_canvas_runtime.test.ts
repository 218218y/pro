import test from 'node:test';
import assert from 'node:assert/strict';

import { scheduleOrderPdfCanvasRender } from '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_render.js';

function createCanvas() {
  const ops: string[] = [];
  const ctx = {
    save() {
      ops.push('save');
    },
    restore() {
      ops.push('restore');
    },
    fillRect() {
      ops.push('fillRect');
    },
    set fillStyle(_value: string) {
      ops.push('fillStyle');
    },
  };
  const canvas = {
    width: 0,
    height: 0,
    style: { width: '', height: '' },
    getContext(kind: string) {
      assert.equal(kind, '2d');
      return ctx;
    },
  };
  return { canvas, ops };
}

test('order pdf canvas render runtime: uses injected browser timers and renders once through the queued canvas path', async () => {
  const scheduled: Array<() => void> = [];
  const clearCalls: number[] = [];
  const App: any = {
    deps: {
      browser: {
        setTimeout(fn: () => void) {
          scheduled.push(fn);
          return scheduled.length;
        },
        clearTimeout(id?: number) {
          clearCalls.push(typeof id === 'number' ? id : -1);
        },
      },
    },
  };

  const { canvas, ops } = createCanvas();
  const renderCalls: any[] = [];
  const page = {
    getViewport({ scale }: { scale: number }) {
      return { width: 100 * scale, height: 40 * scale };
    },
    render(args: unknown) {
      renderCalls.push(args);
      return { promise: Promise.resolve() };
    },
  };
  const container = { style: { width: '', height: '' } };
  const pdfRenderTaskRef = { current: null as any };
  const pdfRenderQueueRef = { current: Promise.resolve() };
  const pdfRenderReqIdRef = { current: 0 };

  const cleanup = scheduleOrderPdfCanvasRender({
    openRef: { current: true },
    canvasRef: { current: canvas as any },
    containerRef: { current: container as any },
    pageRef: { current: page as any },
    pdfRenderTaskRef,
    pdfRenderQueueRef,
    pdfRenderReqIdRef,
    zoom: 1,
    app: App,
    fb: { toast() {} },
    reportNonFatal() {},
  });

  assert.equal(scheduled.length, 1);
  scheduled[0]?.();
  await pdfRenderQueueRef.current;

  assert.equal(renderCalls.length, 1);
  assert.equal(canvas.width, 100);
  assert.equal(canvas.height, 40);
  assert.equal(canvas.style.width, '100px');
  assert.equal(canvas.style.height, '40px');
  assert.equal(container.style.width, '100px');
  assert.equal(container.style.height, '40px');
  assert.deepEqual(ops, ['save', 'fillStyle', 'fillRect', 'restore']);
  assert.equal(pdfRenderTaskRef.current, null);

  cleanup();
  assert.deepEqual(clearCalls, [1]);
});

test('order pdf canvas render runtime: stale timer callback becomes a no-op after cleanup', async () => {
  let scheduled: (() => void) | null = null;
  const clearCalls: number[] = [];
  const App: any = {
    deps: {
      browser: {
        setTimeout(fn: () => void) {
          scheduled = fn;
          return 41;
        },
        clearTimeout(id?: number) {
          clearCalls.push(typeof id === 'number' ? id : -1);
        },
      },
    },
  };

  const { canvas } = createCanvas();
  let renderCount = 0;
  const page = {
    getViewport() {
      return { width: 100, height: 40 };
    },
    render() {
      renderCount += 1;
      return { promise: Promise.resolve() };
    },
  };
  const pdfRenderTaskRef = { current: null as any };
  const pdfRenderQueueRef = { current: Promise.resolve() };
  const cleanup = scheduleOrderPdfCanvasRender({
    openRef: { current: true },
    canvasRef: { current: canvas as any },
    containerRef: { current: { style: { width: '', height: '' } } as any },
    pageRef: { current: page as any },
    pdfRenderTaskRef,
    pdfRenderQueueRef,
    pdfRenderReqIdRef: { current: 0 },
    zoom: 1,
    app: App,
    fb: { toast() {} },
    reportNonFatal() {},
  });

  cleanup();
  assert.deepEqual(clearCalls, [41]);
  scheduled?.();
  await pdfRenderQueueRef.current;

  assert.equal(renderCount, 0);
  assert.equal(pdfRenderTaskRef.current, null);
});
