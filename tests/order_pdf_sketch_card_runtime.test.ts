import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveOrderPdfSketchCardCanvasToolClassName,
  resolveOrderPdfSketchCardPendingStroke,
  resolveOrderPdfSketchCardStageWidth,
  shouldCommitOrderPdfSketchCardStroke,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_runtime.ts';

test('[order-pdf] sketch card runtime resolves the stage width from measured host size before falling back to entry defaults', () => {
  assert.equal(resolveOrderPdfSketchCardStageWidth({ hostWidth: 320, entryWidth: 240 }), 320);
  assert.equal(resolveOrderPdfSketchCardStageWidth({ hostWidth: 0, entryWidth: 240 }), 240);
  assert.equal(resolveOrderPdfSketchCardStageWidth({ hostWidth: null, entryWidth: null }), 595);
});

test('[order-pdf] sketch card runtime resolves stable canvas class names for the active tool family', () => {
  assert.equal(resolveOrderPdfSketchCardCanvasToolClassName('text'), ' is-text');
  assert.equal(resolveOrderPdfSketchCardCanvasToolClassName('eraser'), ' is-eraser');
  assert.equal(resolveOrderPdfSketchCardCanvasToolClassName('marker'), ' is-marker');
  assert.equal(resolveOrderPdfSketchCardCanvasToolClassName('line'), ' is-pen');
});

test('[order-pdf] sketch card runtime suppresses pending strokes while text mode is active', () => {
  assert.equal(
    resolveOrderPdfSketchCardPendingStroke({
      drawConfig: { tool: 'text', color: '#111827', width: 2 },
      points: [{ x: 0.1, y: 0.2 }],
      rect: { left: 0, top: 0, width: 100, height: 100 },
    }),
    null
  );
});

test('[order-pdf] sketch card runtime materializes pending strokes from normalized drawing points', () => {
  assert.deepEqual(
    resolveOrderPdfSketchCardPendingStroke({
      drawConfig: { tool: 'pen', color: '#111827', width: 2 },
      points: [
        { x: 0.1, y: 0.2 },
        { x: 0.3, y: 0.4 },
      ],
      rect: { left: 0, top: 0, width: 100, height: 100 },
    }),
    {
      tool: 'pen',
      color: '#111827',
      width: 2,
      points: [
        { x: 0.1, y: 0.2 },
        { x: 0.3, y: 0.4 },
      ],
    }
  );
});

test('[order-pdf] sketch card runtime skips empty erase commits but keeps real drawing commits', () => {
  assert.equal(
    shouldCommitOrderPdfSketchCardStroke({
      stroke: {
        tool: 'eraser',
        color: '#111827',
        width: 2,
        points: [{ x: 0.1, y: 0.2 }],
      },
      committedStrokeCount: 0,
    }),
    false
  );
  assert.equal(
    shouldCommitOrderPdfSketchCardStroke({
      stroke: {
        tool: 'eraser',
        color: '#111827',
        width: 2,
        points: [{ x: 0.1, y: 0.2 }],
      },
      committedStrokeCount: 2,
    }),
    true
  );
});
