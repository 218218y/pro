import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createOrderPdfOverlayInitialFocusSession,
  focusOrderPdfOverlayOrderNumberInput,
  resolveOrderPdfOverlayKeyboardGuardAction,
  trapOrderPdfOverlayTabKey,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_shell_interactions_runtime.ts';

type FakeElement = {
  id: string;
  nodeType: number;
  offsetParent: object | null;
  classList: { contains: (name: string) => boolean; toggle?: (name: string, force?: boolean) => void };
  focusCount: number;
  selectCount: number;
  scrollCount: number;
  focus: () => void;
  select: () => void;
  scrollIntoView: (_opts?: unknown) => void;
  contains: (node: unknown) => boolean;
  querySelector: <T = FakeElement>(_selector: string) => T | null;
  querySelectorAll: <T = FakeElement>(_selector: string) => T[];
  getBoundingClientRect: () => { top: number; left: number; width: number; height: number };
};

function createFocusableElement(id: string, options?: { classes?: string[] }): FakeElement {
  const classes = new Set(options?.classes || []);
  const el: FakeElement = {
    id,
    nodeType: 1,
    offsetParent: {},
    classList: {
      contains: name => classes.has(name),
      toggle: (name, force) => {
        if (force === false) classes.delete(name);
        else classes.add(name);
      },
    },
    focusCount: 0,
    selectCount: 0,
    scrollCount: 0,
    focus() {
      el.focusCount += 1;
    },
    select() {
      el.selectCount += 1;
    },
    scrollIntoView() {
      el.scrollCount += 1;
    },
    contains: node => node === el,
    querySelector: () => null,
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 10, height: 10 }),
  };
  return el;
}

function createRafWindow() {
  const callbacks = new Map<number, FrameRequestCallback>();
  const cancelled: number[] = [];
  let handle = 0;
  return {
    cancelled,
    requestAnimationFrame(cb: FrameRequestCallback) {
      handle += 1;
      callbacks.set(handle, cb);
      return handle;
    },
    cancelAnimationFrame(id: number) {
      cancelled.push(id);
      callbacks.delete(id);
    },
    runFrame(id: number) {
      const cb = callbacks.get(id);
      if (!cb) return;
      callbacks.delete(id);
      cb(16);
    },
    get pendingIds() {
      return Array.from(callbacks.keys());
    },
    getComputedStyle() {
      return { visibility: 'visible', display: 'block' };
    },
  };
}

test('[order-pdf] shell runtime resolves keyboard guard actions canonically', () => {
  const globalModal = createFocusableElement('customPromptModal');
  const doc = {
    getElementById(id: string) {
      return id === 'customPromptModal' ? (globalModal as unknown as HTMLElement) : null;
    },
  } as unknown as Document;

  assert.equal(
    resolveOrderPdfOverlayKeyboardGuardAction({
      event: { key: 'Enter' } as KeyboardEvent,
      inlineConfirm: { open: true } as any,
      doc,
    }),
    'confirm-ok'
  );
  assert.equal(
    resolveOrderPdfOverlayKeyboardGuardAction({
      event: { key: 'Escape' } as KeyboardEvent,
      inlineConfirm: { open: true } as any,
      doc,
    }),
    'confirm-cancel'
  );
  assert.equal(
    resolveOrderPdfOverlayKeyboardGuardAction({
      event: { key: 'Escape' } as KeyboardEvent,
      inlineConfirm: null,
      doc,
    }),
    'close'
  );
  globalModal.classList.toggle?.('open', true);
  assert.equal(
    resolveOrderPdfOverlayKeyboardGuardAction({
      event: { key: 'Escape' } as KeyboardEvent,
      inlineConfirm: null,
      doc,
    }),
    null
  );
});

test('[order-pdf] shell runtime focus session cancels stale raf callbacks deterministically', () => {
  const win = createRafWindow();
  const orderNo = createFocusableElement('order-no');
  const reported: Array<{ op: string; error: unknown }> = [];
  const session = createOrderPdfOverlayInitialFocusSession({
    win: win as unknown as Window,
    orderNoInputRef: { current: orderNo as unknown as HTMLInputElement },
    reportNonFatal: (op, error) => reported.push({ op, error }),
  });

  session.schedule();
  assert.deepEqual(win.pendingIds, [1]);
  win.runFrame(1);
  assert.equal(orderNo.focusCount, 1);
  assert.deepEqual(win.pendingIds, [2]);

  session.cancel();
  assert.deepEqual(win.cancelled, [1, 2]);
  win.runFrame(2);
  assert.equal(orderNo.focusCount, 1);
  assert.deepEqual(reported, []);
});

test('[order-pdf] shell runtime tab trap redirects focus back into overlay scope', () => {
  const win = createRafWindow();
  const orderNo = createFocusableElement('order-no');
  const other = createFocusableElement('other');
  const page = createFocusableElement('page');
  page.contains = node => node === page || node === orderNo || node === other;
  page.querySelectorAll = () => [orderNo as any, other as any];
  const root = createFocusableElement('root');
  root.contains = node => node === root || page.contains(node);
  root.querySelector = selector => (selector === '.wp-pdf-editor-page' ? (page as any) : null);
  const globalModal = createFocusableElement('customPromptModal');
  const inlineModal = createFocusableElement('orderPdfInlineConfirmModal');
  const doc = {
    activeElement: createFocusableElement('outside') as unknown as HTMLElement,
    getElementById(id: string) {
      if (id === 'customPromptModal') return globalModal as unknown as HTMLElement;
      if (id === 'orderPdfInlineConfirmModal') return inlineModal as unknown as HTMLElement;
      return null;
    },
  } as unknown as Document;
  const marks: string[] = [];

  const trapped = trapOrderPdfOverlayTabKey({
    event: {
      key: 'Tab',
      shiftKey: false,
      preventDefault: () => marks.push('prevent'),
      stopPropagation: () => marks.push('stop'),
    } as any,
    doc,
    win: win as unknown as Window,
    overlayRef: { current: root as unknown as HTMLDivElement },
    orderNoInputRef: { current: orderNo as unknown as HTMLInputElement },
    reportNonFatal: () => {},
  });

  assert.equal(trapped, true);
  assert.deepEqual(marks, ['prevent', 'stop']);
  assert.equal(orderNo.focusCount, 1);
});

test('[order-pdf] shell runtime focus helper is resilient when no order input exists', () => {
  const reported: Array<{ op: string; error: unknown }> = [];
  assert.equal(
    focusOrderPdfOverlayOrderNumberInput({
      orderNoInputRef: { current: null },
      reportNonFatal: (op, error) => reported.push({ op, error }),
    }),
    false
  );
  assert.deepEqual(reported, []);
});
