import test from 'node:test';
import assert from 'node:assert/strict';

import {
  captureStagePointerDown,
  createInitialStageGesture,
  finishStagePointerUp,
  preventStageDragEvent,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_stage_interactions.js';
import {
  isPdfFileLike,
  loadPdfFileFromDrop,
  loadPdfFileFromInput,
  readInputSelectedFile,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_file_interactions.js';
import {
  installOrderPdfOverlayFocusTrap,
  installOrderPdfOverlayKeyboardGuards,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_shell_interactions.js';

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
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 100, height: 20 }),
  };
  return el;
}

function createRafWindow() {
  const listeners = new Map<string, Array<(event: any) => void>>();
  const callbacks = new Map<number, FrameRequestCallback>();
  const cancelled: number[] = [];
  let handle = 0;
  return {
    listeners,
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
    addEventListener(type: string, fn: (event: any) => void) {
      const list = listeners.get(type) || [];
      list.push(fn);
      listeners.set(type, list);
    },
    removeEventListener(type: string, fn: (event: any) => void) {
      const list = listeners.get(type) || [];
      listeners.set(
        type,
        list.filter(entry => entry !== fn)
      );
    },
    dispatch(type: string, event: any) {
      for (const fn of listeners.get(type) || []) fn(event);
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

test('order pdf stage/file interactions keep close intent and PDF validation behavior canonical', async () => {
  const gesture = createInitialStageGesture();
  const stage = { name: 'stage' };

  captureStagePointerDown(gesture, {
    button: 0,
    pointerId: 7,
    clientX: 10,
    clientY: 20,
    target: stage,
    currentTarget: stage,
  });
  assert.equal(
    finishStagePointerUp(gesture, {
      pointerId: 7,
      target: stage,
      currentTarget: stage,
    }),
    true
  );

  const dragMarks: string[] = [];
  preventStageDragEvent({
    preventDefault: () => dragMarks.push('prevent'),
    stopPropagation: () => dragMarks.push('stop'),
  });
  assert.deepEqual(dragMarks, ['prevent', 'stop']);

  const pdfFile = { type: 'application/pdf', name: 'ok.pdf' } as File;
  const imageFile = { type: 'image/png', name: 'nope.png' } as File;
  assert.equal(isPdfFileLike(pdfFile), true);
  assert.equal(isPdfFileLike(imageFile), false);

  const inputTarget = {
    files: [pdfFile] as unknown as FileList,
    value: 'C:/fake/ok.pdf',
  };
  assert.equal(readInputSelectedFile({ target: inputTarget }), pdfFile);
  assert.equal(inputTarget.value, '');

  const toasts: Array<{ message: string; level: string }> = [];
  const loaded: File[] = [];
  await loadPdfFileFromInput({
    event: { target: { files: [imageFile] as unknown as FileList, value: 'x' } },
    fb: { toast: (message, level) => toasts.push({ message, level }) },
    loadPdfIntoEditor: async file => loaded.push(file),
  });
  await loadPdfFileFromDrop({
    event: { dataTransfer: { files: [pdfFile] } as unknown as DataTransfer },
    fb: { toast: (message, level) => toasts.push({ message, level }) },
    loadPdfIntoEditor: async file => loaded.push(file),
  });
  assert.deepEqual(toasts, [{ message: 'בחר קובץ PDF', level: 'error' }]);
  assert.deepEqual(loaded, [pdfFile]);
});

test('order pdf focus trap cleanup cancels late initial-focus raf work and keyboard guards respect modal state', () => {
  const reported: Array<{ op: string; error: unknown }> = [];
  const win = createRafWindow();
  const prev = createFocusableElement('prev');
  const orderNo = createFocusableElement('order-no');
  const other = createFocusableElement('other');
  const page = createFocusableElement('page');
  page.contains = node => node === orderNo || node === other || node === page;
  page.querySelectorAll = () => [orderNo as any, other as any];
  const root = createFocusableElement('root');
  root.contains = node => page.contains(node) || node === root;
  root.querySelector = selector => (selector === '.wp-pdf-editor-page' ? (page as any) : null);

  const globalModal = createFocusableElement('customPromptModal');
  const inlineModal = createFocusableElement('orderPdfInlineConfirmModal');
  const elements = new Map<string, FakeElement>([
    ['customPromptModal', globalModal],
    ['orderPdfInlineConfirmModal', inlineModal],
  ]);

  const doc = {
    defaultView: win,
    activeElement: prev,
    getElementById(id: string) {
      return elements.get(id) || null;
    },
  } as unknown as Document;

  const cleanupFocus = installOrderPdfOverlayFocusTrap({
    open: true,
    docMaybe: doc,
    winMaybe: win as unknown as Window,
    overlayRef: { current: root as unknown as HTMLDivElement },
    orderNoInputRef: { current: orderNo as unknown as HTMLInputElement },
    prevFocusRef: { current: prev as unknown as HTMLElement },
    didInitialFocusRef: { current: false },
    reportNonFatal: (op, error) => reported.push({ op, error }),
  });

  assert.deepEqual(win.pendingIds, [1]);
  win.runFrame(1);
  assert.equal(orderNo.focusCount, 1);
  assert.deepEqual(win.pendingIds, [2]);

  cleanupFocus();
  assert.equal(prev.focusCount, 1);
  assert.deepEqual(win.cancelled, [1, 2]);
  win.runFrame(2);
  assert.equal(orderNo.focusCount, 1);
  assert.deepEqual(reported, []);

  const keyboardMarks: string[] = [];
  const cleanupKeyboard = installOrderPdfOverlayKeyboardGuards({
    open: true,
    docMaybe: doc,
    winMaybe: win as unknown as Window,
    inlineConfirm: { open: true } as any,
    confirmInlineOk: () => keyboardMarks.push('ok'),
    confirmInlineCancel: () => keyboardMarks.push('cancel'),
    close: () => keyboardMarks.push('close'),
    reportNonFatal: (op, error) => reported.push({ op, error }),
  });

  const enterEvent = {
    key: 'Enter',
    preventDefault: () => keyboardMarks.push('prevent-enter'),
    stopPropagation: () => keyboardMarks.push('stop-enter'),
  };
  win.dispatch('keydown', enterEvent);
  assert.deepEqual(keyboardMarks, ['prevent-enter', 'stop-enter', 'ok']);

  keyboardMarks.length = 0;
  cleanupKeyboard();

  globalModal.classList.toggle?.('open', true);
  const cleanupEscape = installOrderPdfOverlayKeyboardGuards({
    open: true,
    docMaybe: doc,
    winMaybe: win as unknown as Window,
    inlineConfirm: null,
    confirmInlineOk: () => keyboardMarks.push('ok'),
    confirmInlineCancel: () => keyboardMarks.push('cancel'),
    close: () => keyboardMarks.push('close'),
    reportNonFatal: (op, error) => reported.push({ op, error }),
  });
  const escapeEvent = {
    key: 'Escape',
    preventDefault: () => keyboardMarks.push('prevent-escape'),
    stopPropagation: () => keyboardMarks.push('stop-escape'),
  };
  win.dispatch('keydown', escapeEvent);
  assert.deepEqual(keyboardMarks, []);
  cleanupEscape();
  assert.deepEqual(reported, []);
});
