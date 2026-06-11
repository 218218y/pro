import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appendOrderPdfDrawingPointsFromClientBatch,
  appendUniqueOrderPdfDrawingPoint,
  areOrderPdfDrawingRectSizesEqual,
  areOrderPdfDrawingRectsEqual,
  buildOrderPdfStrokeFromDrawingPoints,
  buildOrderPdfDrawingPointFromClient,
  buildOrderPdfSketchStrokeCounts,
  buildOrderPdfSketchStrokeMap,
  buildOrderPdfSketchSurfaceSizeFromDrawingRect,
  buildOrderPdfSketchTextBoxMap,
  clearOrderPdfSketchRedoKey,
  haveOrderPdfSketchStrokeCountsChanged,
  normalizeOrderPdfDrawingRect,
  popOrderPdfSketchRedoStroke,
  pushOrderPdfSketchRedoStroke,
  readOrderPdfDrawingRect,
  updateOrderPdfDrawingPointsFromClientBatch,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_runtime.ts';
import type {
  OrderPdfSketchStroke,
  OrderPdfSketchTextBox,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_contracts.ts';

function makeStroke(label: string): OrderPdfSketchStroke {
  return {
    tool: label === 'marker' ? 'marker' : 'pen',
    color: label === 'marker' ? '#facc15' : '#111827',
    width: label === 'marker' ? 6 : 2,
    points: [
      { x: 0.1, y: 0.2 },
      { x: 0.2, y: 0.3 },
    ],
  };
}

test('[order-pdf] sketch panel runtime builds per-page stroke maps and counts canonically', () => {
  const draft = {
    projectName: '',
    orderNumber: '',
    orderDate: '',
    deliveryAddress: '',
    phone: '',
    mobile: '',
    autoDetails: '',
    manualDetails: '',
    manualEnabled: false,
    notes: '',
    sketchAnnotations: {
      renderSketch: { strokes: [makeStroke('pen')] },
      openClosed: { strokes: [makeStroke('marker'), makeStroke('pen')] },
    },
  };

  const map = buildOrderPdfSketchStrokeMap(draft);
  assert.equal(map.renderSketch.length, 1);
  assert.equal(map.openClosed.length, 2);
  assert.deepEqual(buildOrderPdfSketchStrokeCounts(map), { renderSketch: 1, openClosed: 2 });
  assert.equal(
    haveOrderPdfSketchStrokeCountsChanged(
      { renderSketch: 1, openClosed: 2 },
      { renderSketch: 1, openClosed: 2 }
    ),
    false
  );
  assert.equal(
    haveOrderPdfSketchStrokeCountsChanged(
      { renderSketch: 1, openClosed: 2 },
      { renderSketch: 2, openClosed: 2 }
    ),
    true
  );
});

test('[order-pdf] sketch panel runtime redo stack helpers clone, trim, and clear per page key', () => {
  const base = makeStroke('pen');
  const redoA = pushOrderPdfSketchRedoStroke({ redoStacks: {}, key: 'renderSketch', stroke: base });
  const redoB = pushOrderPdfSketchRedoStroke({
    redoStacks: redoA,
    key: 'renderSketch',
    stroke: makeStroke('marker'),
  });
  const redoC = pushOrderPdfSketchRedoStroke({ redoStacks: redoB, key: 'openClosed', stroke: base });

  assert.equal(redoC.renderSketch?.length, 2);
  assert.equal(redoC.openClosed?.length, 1);

  const popped = popOrderPdfSketchRedoStroke({ redoStacks: redoC, key: 'renderSketch' });
  assert.ok(popped.stroke);
  assert.equal(popped.redoStacks.renderSketch?.length, 1);
  assert.notEqual(popped.stroke, redoC.renderSketch?.[1]);
  assert.ok(popped.stroke && 'points' in popped.stroke);
  if (popped.stroke && 'points' in popped.stroke) {
    assert.deepEqual(popped.stroke.points, redoC.renderSketch?.[1]?.points);
  }

  const cleared = clearOrderPdfSketchRedoKey(popped.redoStacks, 'openClosed');
  assert.equal(cleared.openClosed, undefined);
  assert.equal(cleared.renderSketch?.length, 1);
});

test('[order-pdf] sketch panel runtime drawing point collector skips jitter but keeps meaningful motion', () => {
  const points = [{ x: 0.25, y: 0.5 }];

  assert.equal(appendUniqueOrderPdfDrawingPoint(points, { x: 0.2502, y: 0.5002 }), false);
  assert.equal(points.length, 1);

  assert.equal(appendUniqueOrderPdfDrawingPoint(points, { x: 0.253, y: 0.506 }), true);
  assert.equal(points.length, 2);
  assert.deepEqual(points[1], { x: 0.253, y: 0.506 });
});

test('[order-pdf] sketch panel runtime normalizes client drawing points once per measured host rect', () => {
  assert.deepEqual(
    buildOrderPdfDrawingPointFromClient({
      clientX: 160,
      clientY: 90,
      rect: { left: 100, top: 50, width: 200, height: 100 },
    }),
    { x: 0.3, y: 0.4 }
  );

  assert.deepEqual(
    buildOrderPdfDrawingPointFromClient({
      clientX: 40,
      clientY: 190,
      rect: { left: 100, top: 50, width: 200, height: 100 },
    }),
    { x: 0, y: 1 }
  );

  assert.equal(
    buildOrderPdfDrawingPointFromClient({
      clientX: 160,
      clientY: 90,
      rect: { left: 100, top: 50, width: 0, height: 100 },
    }),
    null
  );
});

test('[order-pdf] sketch panel runtime appends coalesced client batches without rereading layout per point', () => {
  const points = [{ x: 0.25, y: 0.5 }];
  const changed = appendOrderPdfDrawingPointsFromClientBatch({
    points,
    events: [
      { clientX: 150, clientY: 100 },
      { clientX: 150.02, clientY: 100.02 },
      { clientX: 180, clientY: 140 },
    ],
    rect: { left: 100, top: 50, width: 200, height: 100 },
  });

  assert.equal(changed, true);
  assert.deepEqual(points, [
    { x: 0.25, y: 0.5 },
    { x: 0.4, y: 0.9 },
  ]);

  assert.equal(
    appendOrderPdfDrawingPointsFromClientBatch({
      points,
      events: [{ clientX: 180, clientY: 140 }],
      rect: null,
    }),
    false
  );
});

test('[order-pdf] sketch panel runtime tracks geometric tools as anchor/end drags and emits normalized paths', () => {
  const points = [] as Array<{ x: number; y: number }>;
  const changed = updateOrderPdfDrawingPointsFromClientBatch({
    tool: 'square',
    points,
    events: [
      { clientX: 120, clientY: 70 },
      { clientX: 180, clientY: 130 },
      { clientX: 210, clientY: 170 },
    ],
    rect: { left: 100, top: 50, width: 200, height: 200 },
  });

  assert.equal(changed, true);
  assert.deepEqual(points, [
    { x: 0.1, y: 0.1 },
    { x: 0.55, y: 0.6 },
  ]);

  const stroke = buildOrderPdfStrokeFromDrawingPoints({
    tool: 'square',
    color: '#111827',
    width: 4,
    points,
  });
  const roundedPoints = stroke?.points.map(point => ({
    x: Number(point.x.toFixed(3)),
    y: Number(point.y.toFixed(3)),
  }));
  assert.deepEqual(roundedPoints, [
    { x: 0.1, y: 0.1 },
    { x: 0.55, y: 0.1 },
    { x: 0.55, y: 0.55 },
    { x: 0.1, y: 0.55 },
    { x: 0.1, y: 0.1 },
  ]);
});

test('[order-pdf] sketch panel runtime keeps the latest geometric drag point when coalesced batches contain stale history', () => {
  const points = [
    { x: 0.2, y: 0.2 },
    { x: 0.75, y: 0.5 },
  ];

  const changed = updateOrderPdfDrawingPointsFromClientBatch({
    tool: 'ellipse',
    points,
    events: [
      { clientX: 120, clientY: 70 },
      { clientX: 260, clientY: 150 },
    ],
    rect: { left: 100, top: 50, width: 200, height: 200 },
  });

  assert.equal(changed, true);
  assert.deepEqual(points[1], { x: 0.8, y: 0.5 });
});

function makeTextBox(label: string): OrderPdfSketchTextBox {
  return {
    id: `txt-${label}`,
    createdAt: label === 'later' ? 20 : 10,
    x: 0.1,
    y: 0.2,
    width: 0.28,
    height: 0.14,
    color: '#111827',
    fontSize: 18,
    text: label,
  };
}

test('[order-pdf] sketch panel runtime builds per-page text-box maps and folds them into redo counts', () => {
  const draft = {
    projectName: '',
    orderNumber: '',
    orderDate: '',
    deliveryAddress: '',
    phone: '',
    mobile: '',
    autoDetails: '',
    manualDetails: '',
    manualEnabled: false,
    notes: '',
    sketchAnnotations: {
      renderSketch: { strokes: [makeStroke('pen')], textBoxes: [makeTextBox('render')] },
      openClosed: { strokes: [], textBoxes: [makeTextBox('open'), makeTextBox('later')] },
    },
  };

  const strokesMap = buildOrderPdfSketchStrokeMap(draft);
  const textBoxMap = buildOrderPdfSketchTextBoxMap(draft);
  assert.equal(textBoxMap.renderSketch.length, 1);
  assert.equal(textBoxMap.openClosed.length, 2);
  assert.deepEqual(buildOrderPdfSketchStrokeCounts(strokesMap, textBoxMap), {
    renderSketch: 2,
    openClosed: 2,
  });
});

test('[order-pdf] sketch panel runtime normalizes and compares measured drawing rects canonically', () => {
  const rect = normalizeOrderPdfDrawingRect({ left: 12, top: 24, width: 360, height: 220 });
  assert.deepEqual(rect, { left: 12, top: 24, width: 360, height: 220 });
  assert.equal(normalizeOrderPdfDrawingRect({ left: 12, top: 24, width: Number.NaN, height: 220 }), null);

  const sameRect = { left: 12, top: 24, width: 360, height: 220 };
  const movedRect = { left: 18, top: 30, width: 360, height: 220 };
  const resizedRect = { left: 12, top: 24, width: 420, height: 220 };

  assert.equal(areOrderPdfDrawingRectsEqual(rect, sameRect), true);
  assert.equal(areOrderPdfDrawingRectsEqual(rect, movedRect), false);
  assert.equal(areOrderPdfDrawingRectSizesEqual(rect, movedRect), true);
  assert.equal(areOrderPdfDrawingRectSizesEqual(rect, resizedRect), false);
  assert.deepEqual(buildOrderPdfSketchSurfaceSizeFromDrawingRect(rect), { width: 360, height: 220 });
  assert.equal(
    buildOrderPdfSketchSurfaceSizeFromDrawingRect({ left: 0, top: 0, width: 0, height: 220 }),
    null
  );
});

test('[order-pdf] sketch panel runtime reads drawing rects once from the measured host surface', () => {
  let reads = 0;
  const host = {
    getBoundingClientRect: () => {
      reads += 1;
      return { left: 40, top: 80, width: 520, height: 280 };
    },
  } as unknown as Element;

  assert.deepEqual(readOrderPdfDrawingRect(host), { left: 40, top: 80, width: 520, height: 280 });
  assert.equal(reads, 1);
  assert.equal(readOrderPdfDrawingRect(null), null);
});
