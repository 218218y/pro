import test from 'node:test';
import assert from 'node:assert/strict';

import {
  nextOrderPdfSketchCanvasFrameVersion,
  resolveOrderPdfSketchCanvasDrawState,
  resolveOrderPdfSketchCanvasPixels,
  resolveOrderPdfSketchCanvasRect,
  shouldRunOrderPdfSketchCanvasFrame,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_canvas_runtime.ts';

test('[order-pdf] sketch canvas runtime reuses cached measured rect before falling back to fresh DOM reads', () => {
  let refreshCount = 0;
  const host = { id: 'host' } as HTMLDivElement;
  const cachedRect = { left: 10, top: 20, width: 320, height: 180 };
  const refreshedRect = { left: 50, top: 60, width: 640, height: 360 };

  assert.deepEqual(
    resolveOrderPdfSketchCanvasRect({
      host,
      measuredRect: null,
      cachedRect,
      refreshRect: () => {
        refreshCount += 1;
        return refreshedRect;
      },
    }),
    cachedRect
  );
  assert.equal(refreshCount, 0);

  assert.deepEqual(
    resolveOrderPdfSketchCanvasRect({
      host,
      measuredRect: null,
      cachedRect: null,
      refreshRect: () => {
        refreshCount += 1;
        return refreshedRect;
      },
    }),
    refreshedRect
  );
  assert.equal(refreshCount, 1);
});

test('[order-pdf] sketch canvas runtime resolves DPR-aware draw state canonically', () => {
  const host = { id: 'host' } as HTMLDivElement;
  const canvas = { id: 'canvas' } as HTMLCanvasElement;
  const pixels = resolveOrderPdfSketchCanvasPixels({ width: 241, height: 159, devicePixelRatio: 1.5 });
  assert.deepEqual(pixels, { pxWidth: 362, pxHeight: 239 });

  const draw = resolveOrderPdfSketchCanvasDrawState({
    host,
    canvas,
    rect: { left: 0, top: 0, width: 240.7, height: 158.6 },
    devicePixelRatio: 1.5,
    strokes: [],
    textBoxes: [],
    pendingStroke: null,
  });
  assert.deepEqual(
    { width: draw.width, height: draw.height, pxWidth: draw.pxWidth, pxHeight: draw.pxHeight },
    { width: 241, height: 159, pxWidth: 362, pxHeight: 239 }
  );
});

test('[order-pdf] sketch canvas runtime invalidates stale RAF callbacks with monotonic versions', () => {
  const first = nextOrderPdfSketchCanvasFrameVersion(0);
  const second = nextOrderPdfSketchCanvasFrameVersion(first);
  assert.equal(first, 1);
  assert.equal(second, 2);
  assert.equal(shouldRunOrderPdfSketchCanvasFrame({ scheduledVersion: first, activeVersion: second }), false);
  assert.equal(shouldRunOrderPdfSketchCanvasFrame({ scheduledVersion: second, activeVersion: second }), true);
});
