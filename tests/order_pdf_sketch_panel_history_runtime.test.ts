import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearOrderPdfSketchRedoStateSnapshotKey,
  createOrderPdfSketchRedoStateSnapshot,
  noteOrderPdfSketchRedoStateSnapshotAppend,
  noteOrderPdfSketchRedoStateSnapshotUndo,
  resolveOrderPdfSketchHistoryShortcutAction,
  syncOrderPdfSketchRedoStateSnapshot,
  takeOrderPdfSketchRedoStateSnapshotStroke,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_history_runtime.ts';
import type {
  OrderPdfSketchStroke,
  OrderPdfSketchTextBox,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_contracts.ts';

function makeStroke(label: string): OrderPdfSketchStroke {
  return {
    id: `stroke-${label}`,
    createdAt: label === 'late' ? 20 : 10,
    tool: 'pen',
    color: '#111827',
    width: 2,
    points: [{ x: 0.1, y: 0.2 }],
  };
}

function makeTextBox(label: string): OrderPdfSketchTextBox {
  return {
    id: `txt-${label}`,
    createdAt: 15,
    x: 0.1,
    y: 0.2,
    width: 0.3,
    height: 0.12,
    color: '#111827',
    fontSize: 18,
    text: label,
  };
}

test('[order-pdf] sketch panel history runtime keeps redo snapshots canonical across append, undo, take, and sync', () => {
  const strokesByKey = { renderSketch: [makeStroke('base')], openClosed: [] };
  const textBoxesByKey = { renderSketch: [], openClosed: [makeTextBox('note')] };

  let state = createOrderPdfSketchRedoStateSnapshot({ strokesByKey, textBoxesByKey });
  assert.deepEqual(state.expectedCounts, { renderSketch: 1, openClosed: 1 });

  state = noteOrderPdfSketchRedoStateSnapshotAppend({ state, key: 'renderSketch' });
  assert.equal(state.expectedCounts.renderSketch, 2);

  state = noteOrderPdfSketchRedoStateSnapshotUndo({ state, key: 'renderSketch', stroke: makeStroke('undo') });
  assert.equal(state.expectedCounts.renderSketch, 1);
  assert.equal(state.redoStacks.renderSketch?.length, 1);

  const taken = takeOrderPdfSketchRedoStateSnapshotStroke({ state, key: 'renderSketch' });
  assert.equal(taken.stroke?.id, 'stroke-undo');
  assert.equal(taken.state.expectedCounts.renderSketch, 2);
  assert.equal(taken.state.redoStacks.renderSketch, undefined);

  state = clearOrderPdfSketchRedoStateSnapshotKey({ state: taken.state, key: 'openClosed' });
  assert.equal(state.redoStacks.openClosed, undefined);

  const synced = syncOrderPdfSketchRedoStateSnapshot({
    state,
    strokesByKey: { renderSketch: [], openClosed: [] },
    textBoxesByKey: { renderSketch: [], openClosed: [] },
  });
  assert.deepEqual(synced.expectedCounts, { renderSketch: 0, openClosed: 0 });
  assert.deepEqual(synced.redoStacks, {});
});

test('[order-pdf] sketch panel history runtime resolves undo/redo shortcuts only when the active page can consume them', () => {
  const undoEvent = {
    key: 'z',
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
    altKey: false,
  } as globalThis.KeyboardEvent;
  const redoEvent = {
    key: 'z',
    ctrlKey: true,
    metaKey: false,
    shiftKey: true,
    altKey: false,
  } as globalThis.KeyboardEvent;

  assert.equal(
    resolveOrderPdfSketchHistoryShortcutAction({
      event: undoEvent,
      activeHasStrokes: true,
      activeHasRedo: false,
    }),
    'undo'
  );
  assert.equal(
    resolveOrderPdfSketchHistoryShortcutAction({
      event: undoEvent,
      activeHasStrokes: false,
      activeHasRedo: false,
    }),
    null
  );
  assert.equal(
    resolveOrderPdfSketchHistoryShortcutAction({
      event: redoEvent,
      activeHasStrokes: false,
      activeHasRedo: true,
    }),
    'redo'
  );
});
