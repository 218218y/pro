import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isOrderPdfSketchHistoryShortcut,
  isOrderPdfSketchRedoShortcut,
  isOrderPdfSketchUndoShortcut,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_shortcuts.ts';

test('[order-pdf] sketch undo shortcut matches english and hebrew ctrl/cmd+z', () => {
  assert.equal(isOrderPdfSketchUndoShortcut({ ctrlKey: true, code: 'KeyZ', key: 'z' }), true);
  assert.equal(isOrderPdfSketchUndoShortcut({ metaKey: true, key: 'Z' }), true);
  assert.equal(isOrderPdfSketchUndoShortcut({ ctrlKey: true, key: 'ז' }), true);
  assert.equal(isOrderPdfSketchUndoShortcut({ ctrlKey: true, key: 'z', shiftKey: true }), false);
});

test('[order-pdf] sketch redo shortcut matches ctrl/cmd+y and ctrl/cmd+shift+z in english and hebrew', () => {
  assert.equal(isOrderPdfSketchRedoShortcut({ ctrlKey: true, code: 'KeyY', key: 'y' }), true);
  assert.equal(isOrderPdfSketchRedoShortcut({ ctrlKey: true, key: 'ט' }), true);
  assert.equal(isOrderPdfSketchRedoShortcut({ metaKey: true, code: 'KeyZ', key: 'z', shiftKey: true }), true);
  assert.equal(isOrderPdfSketchRedoShortcut({ ctrlKey: true, key: 'ז', shiftKey: true }), true);
  assert.equal(isOrderPdfSketchRedoShortcut({ ctrlKey: true, key: 'z' }), false);
});

test('[order-pdf] sketch history shortcuts are always consumed while the sketch panel is open', () => {
  assert.equal(isOrderPdfSketchHistoryShortcut({ ctrlKey: true, key: 'z' }), true);
  assert.equal(isOrderPdfSketchHistoryShortcut({ ctrlKey: true, key: 'y' }), true);
  assert.equal(isOrderPdfSketchHistoryShortcut({ ctrlKey: true, key: 'ז', shiftKey: true }), true);
  assert.equal(isOrderPdfSketchHistoryShortcut({ ctrlKey: true, key: 'x' }), false);
});
