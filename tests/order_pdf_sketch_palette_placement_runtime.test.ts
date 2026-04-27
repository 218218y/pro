import test from 'node:test';
import assert from 'node:assert/strict';

import {
  areOrderPdfSketchToolbarPlacementsEqual,
  resolveOrderPdfSketchFloatingPalettePlacement,
  resolveOrderPdfSketchToolbarPlacement,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_measurement_runtime.ts';
import {
  paintOrderPdfSketchCanvasFrame,
  shouldRepaintOrderPdfSketchCanvas,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_canvas_runtime.ts';

test('[order-pdf] sketch floating palette placement anchors left of the toolbar trigger without leaving the viewport', () => {
  const placement = resolveOrderPdfSketchFloatingPalettePlacement({
    win: { innerWidth: 1280, innerHeight: 900 } as Window,
    triggerRect: { top: 300, left: 1180, right: 1224, height: 44 },
    paletteWidth: 188,
    paletteHeight: 160,
  });

  assert.equal(placement.left, 980);
  assert.equal(placement.top, 242);
  assert.equal(placement.maxHeight, 876);
});

test('[order-pdf] sketch floating palette placement clamps inside the viewport when there is not enough space', () => {
  const placement = resolveOrderPdfSketchFloatingPalettePlacement({
    win: { innerWidth: 260, innerHeight: 240 } as Window,
    triggerRect: { top: 18, left: 54, right: 98, height: 44 },
    paletteWidth: 220,
    paletteHeight: 280,
  });

  assert.equal(placement.left, 12);
  assert.equal(placement.top, 12);
  assert.equal(placement.maxHeight, 216);
});

test('[order-pdf] sketch toolbar placement tracks the visible stage band instead of sticking to the initial viewport slot', () => {
  const stage = {
    getBoundingClientRect: () => ({ top: 140, bottom: 740, right: 1040 }),
  } as HTMLDivElement;
  const placement = resolveOrderPdfSketchToolbarPlacement({
    win: { innerWidth: 1440, innerHeight: 900 } as Window,
    stage,
    toolbarHeight: 220,
  });

  assert.deepEqual(placement, {
    mode: 'fixed',
    top: 330,
    left: 18,
    right: 418,
    maxHeight: 564,
  });
});

test('[order-pdf] sketch toolbar placement falls back to inline mode on narrow viewports', () => {
  const placement = resolveOrderPdfSketchToolbarPlacement({
    win: { innerWidth: 820, innerHeight: 900 } as Window,
    stage: null,
    toolbarHeight: 200,
  });

  assert.deepEqual(placement, { mode: 'inline', top: 76, left: 0, right: 0, maxHeight: 0 });
});

test('[order-pdf] sketch toolbar placement equality treats left-anchored toolbars as real geometry changes', () => {
  assert.equal(
    areOrderPdfSketchToolbarPlacementsEqual(
      { mode: 'fixed', top: 140, left: 36, right: 18, maxHeight: 440 },
      { mode: 'fixed', top: 140, left: 64, right: 18, maxHeight: 440 }
    ),
    false
  );
  assert.equal(
    areOrderPdfSketchToolbarPlacementsEqual(
      { mode: 'fixed', top: 140, left: 36, right: 18, maxHeight: 440 },
      { mode: 'fixed', top: 140, left: 36, right: 18, maxHeight: 440 }
    ),
    true
  );
});

test('[order-pdf] sketch canvas repaint helper suppresses redraws for cloned-but-equal annotation payloads', () => {
  const host = { id: 'host' } as unknown as HTMLDivElement;
  const canvas = { id: 'canvas' } as unknown as HTMLCanvasElement;
  const prev = {
    host,
    canvas,
    width: 240,
    height: 160,
    pxWidth: 480,
    pxHeight: 320,
    strokes: [
      {
        id: 'stroke-1',
        createdAt: 1,
        tool: 'pen',
        color: '#111827',
        width: 2,
        points: [
          { x: 0.1, y: 0.2 },
          { x: 0.4, y: 0.6 },
        ],
      },
    ],
    textBoxes: [
      {
        id: 'txt-1',
        createdAt: 2,
        x: 0.2,
        y: 0.3,
        width: 0.28,
        height: 0.14,
        color: '#dc2626',
        fontSize: 18,
        text: 'note',
      },
    ],
    pendingStroke: {
      id: 'pending-1',
      createdAt: 3,
      tool: 'marker',
      color: '#2563eb',
      width: 4,
      points: [
        { x: 0.2, y: 0.3 },
        { x: 0.25, y: 0.4 },
      ],
    },
  };

  const next = {
    ...prev,
    strokes: prev.strokes.map(stroke => ({
      ...stroke,
      points: stroke.points.map(point => ({ ...point })),
    })),
    textBoxes: prev.textBoxes.map(textBox => ({ ...textBox })),
    pendingStroke: prev.pendingStroke
      ? {
          ...prev.pendingStroke,
          points: prev.pendingStroke.points.map(point => ({ ...point })),
        }
      : null,
  };

  assert.equal(shouldRepaintOrderPdfSketchCanvas({ prev, next }), false);
  assert.equal(
    shouldRepaintOrderPdfSketchCanvas({
      prev,
      next: {
        ...next,
        strokes: next.strokes.map((stroke, index) =>
          index === 0
            ? {
                ...stroke,
                points: stroke.points.map((point, pointIndex) =>
                  pointIndex === 1 ? { ...point, x: point.x + 0.01 } : point
                ),
              }
            : stroke
        ),
      },
    }),
    true
  );
});
test('[order-pdf] sketch canvas repaint helper suppresses duplicate redraws until geometry or payload really changes', () => {
  const host = { id: 'host' } as unknown as HTMLDivElement;
  const canvas = { id: 'canvas' } as unknown as HTMLCanvasElement;
  const strokes = [{ tool: 'pen', color: '#111827', width: 2, points: [{ x: 0.1, y: 0.2 }] }];
  const pendingStroke = { tool: 'marker', color: '#dc2626', width: 4, points: [{ x: 0.2, y: 0.3 }] };
  const prev = {
    host,
    canvas,
    width: 240,
    height: 160,
    pxWidth: 480,
    pxHeight: 320,
    strokes,
    textBoxes: [],
    pendingStroke,
  };

  assert.equal(shouldRepaintOrderPdfSketchCanvas({ prev, next: { ...prev } }), false);
  assert.equal(
    shouldRepaintOrderPdfSketchCanvas({
      prev,
      next: {
        ...prev,
        pendingStroke: null,
      },
    }),
    true
  );
  assert.equal(
    shouldRepaintOrderPdfSketchCanvas({
      prev,
      next: {
        ...prev,
        pxWidth: 512,
      },
    }),
    true
  );
});

test('[order-pdf] sketch canvas frame only commits once a real 2d context exists', () => {
  const clearCalls: Array<[number, number, number, number]> = [];
  const canvas = {
    width: 0,
    height: 0,
    style: { width: '', height: '' },
    getContext: () => null,
  } as unknown as HTMLCanvasElement;

  const draw = {
    host: { id: 'host' } as unknown as HTMLDivElement,
    canvas,
    width: 240,
    height: 160,
    pxWidth: 480,
    pxHeight: 320,
    strokes: [],
    textBoxes: [],
    pendingStroke: null,
  };

  assert.equal(paintOrderPdfSketchCanvasFrame(draw), false);
  assert.equal(canvas.width, 480);
  assert.equal(canvas.height, 320);
  assert.equal(canvas.style.width, '240px');
  assert.equal(canvas.style.height, '160px');

  canvas.getContext = () =>
    ({
      clearRect: (...args: [number, number, number, number]) => clearCalls.push(args),
    }) as unknown as CanvasRenderingContext2D;

  assert.equal(paintOrderPdfSketchCanvasFrame(draw), true);
  assert.deepEqual(clearCalls, [[0, 0, 480, 320]]);
});
