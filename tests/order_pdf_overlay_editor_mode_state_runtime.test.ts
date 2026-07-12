import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createOrderPdfOverlayEditorModeState,
  isOrderPdfPageAnnotationModeOpen,
  orderPdfOverlayEditorModeReducer,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_editor_mode_state.ts';

test('order PDF editor mode starts from externally-owned sketch visibility', () => {
  assert.deepEqual(createOrderPdfOverlayEditorModeState(false), { kind: 'idle' });
  assert.deepEqual(createOrderPdfOverlayEditorModeState(true), {
    kind: 'sketch-preview',
    pendingPdfPageAnnotation: false,
  });
});

test('PDF annotation waits for an open sketch preview to close', () => {
  const sketchMode = createOrderPdfOverlayEditorModeState(true);
  const waiting = orderPdfOverlayEditorModeReducer(sketchMode, {
    type: 'toggle-pdf-page-annotation',
  });
  assert.deepEqual(waiting, { kind: 'sketch-preview', pendingPdfPageAnnotation: true });
  assert.equal(isOrderPdfPageAnnotationModeOpen(waiting), false);
  const afterClose = orderPdfOverlayEditorModeReducer(waiting, {
    type: 'reconcile-sketch-visibility',
    open: false,
  });
  assert.deepEqual(afterClose, { kind: 'pdf-page-annotation' });
  assert.equal(isOrderPdfPageAnnotationModeOpen(afterClose), true);
});

test('an externally opened sketch preview preempts PDF page annotation', () => {
  const pdfMode = orderPdfOverlayEditorModeReducer(createOrderPdfOverlayEditorModeState(false), {
    type: 'toggle-pdf-page-annotation',
  });
  const sketchMode = orderPdfOverlayEditorModeReducer(pdfMode, {
    type: 'reconcile-sketch-visibility',
    open: true,
  });
  assert.deepEqual(sketchMode, { kind: 'sketch-preview', pendingPdfPageAnnotation: false });
  assert.equal(isOrderPdfPageAnnotationModeOpen(sketchMode), false);
});

test('requesting sketch preview closes PDF annotation before the external toggle resolves', () => {
  const pdfMode = orderPdfOverlayEditorModeReducer(createOrderPdfOverlayEditorModeState(false), {
    type: 'toggle-pdf-page-annotation',
  });
  const prepared = orderPdfOverlayEditorModeReducer(pdfMode, {
    type: 'prepare-sketch-preview-toggle',
  });
  assert.deepEqual(prepared, { kind: 'idle' });
  assert.equal(isOrderPdfPageAnnotationModeOpen(prepared), false);
});

test('canceling a pending PDF request does not reopen it after the sketch closes', () => {
  const waiting = orderPdfOverlayEditorModeReducer(createOrderPdfOverlayEditorModeState(true), {
    type: 'toggle-pdf-page-annotation',
  });
  const canceled = orderPdfOverlayEditorModeReducer(waiting, {
    type: 'close-pdf-page-annotation',
  });
  const afterClose = orderPdfOverlayEditorModeReducer(canceled, {
    type: 'reconcile-sketch-visibility',
    open: false,
  });
  assert.deepEqual(afterClose, { kind: 'idle' });
});
