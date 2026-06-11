import test from 'node:test';
import assert from 'node:assert/strict';

import { paintOrderPdfSketchAnnotations } from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_annotations.js';
import {
  appendOrderPdfSketchStroke,
  areOrderPdfSketchAnnotationsEqual,
  buildOrderPdfSketchShapePoints,
  clearOrderPdfSketchStrokes,
  cloneOrderPdfSketchAnnotations,
  createOrderPdfSketchTextBoxAtPoint,
  createOrderPdfSketchTextBoxFromRect,
  deleteOrderPdfSketchTextBox,
  listOrderPdfSketchStrokes,
  listOrderPdfSketchTextBoxes,
  readOrderPdfSketchAnnotations,
  undoOrderPdfSketchStroke,
  upsertOrderPdfSketchTextBox,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_annotation_state_runtime.js';
import { resolveOrderPdfSketchImageTailPageMap } from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_image_slots_runtime.js';

function makeStroke() {
  return {
    tool: 'pen' as const,
    color: '#2563eb',
    width: 4,
    points: [
      { x: 0.1, y: 0.2 },
      { x: 0.6, y: 0.7 },
    ],
  };
}

test('[order-pdf] sketch annotations append, undo, and clear per page', () => {
  const stroke = makeStroke();
  const withOne = appendOrderPdfSketchStroke({ draft: null, key: 'renderSketch', stroke });
  assert.equal(listOrderPdfSketchStrokes(withOne, 'renderSketch').length, 1);
  assert.equal(listOrderPdfSketchStrokes(withOne, 'openClosed').length, 0);

  const withTwo = appendOrderPdfSketchStroke({ draft: withOne, key: 'openClosed', stroke });
  assert.equal(listOrderPdfSketchStrokes(withTwo, 'renderSketch').length, 1);
  assert.equal(listOrderPdfSketchStrokes(withTwo, 'openClosed').length, 1);

  const undone = undoOrderPdfSketchStroke(withTwo, 'renderSketch');
  assert.equal(listOrderPdfSketchStrokes(undone, 'renderSketch').length, 0);
  assert.equal(listOrderPdfSketchStrokes(undone, 'openClosed').length, 1);

  const cleared = clearOrderPdfSketchStrokes(withTwo, 'openClosed');
  assert.equal(listOrderPdfSketchStrokes(cleared, 'renderSketch').length, 1);
  assert.equal(listOrderPdfSketchStrokes(cleared, 'openClosed').length, 0);
});

test('[order-pdf] sketch tail pages map to render/open preview slots in order', () => {
  assert.deepEqual(resolveOrderPdfSketchImageTailPageMap([3, 4]), { renderSketch: 3, openClosed: 4 });
  assert.deepEqual(resolveOrderPdfSketchImageTailPageMap([7]), { renderSketch: 7 });
  assert.deepEqual(resolveOrderPdfSketchImageTailPageMap([]), {});
});

test('[order-pdf] sketch annotations paint normalized strokes onto canvas coords', () => {
  const log: string[] = [];
  const ctx = {
    lineCap: 'butt',
    lineJoin: 'miter',
    lineWidth: 0,
    strokeStyle: '',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    save() {
      log.push('save');
    },
    restore() {
      log.push('restore');
    },
    beginPath() {
      log.push('beginPath');
    },
    moveTo(x: number, y: number) {
      log.push(`moveTo:${x},${y}`);
    },
    lineTo(x: number, y: number) {
      log.push(`lineTo:${x},${y}`);
    },
    arc(x: number, y: number, r: number) {
      log.push(`arc:${x},${y},${r}`);
    },
    stroke() {
      log.push(`stroke:${String(this.strokeStyle)}:${this.lineWidth}`);
    },
    fill() {
      log.push(`fill:${String(this.fillStyle)}`);
    },
    fillRect(x: number, y: number, width: number, height: number) {
      log.push(`fillRect:${x},${y},${width},${height}`);
    },
    strokeRect(x: number, y: number, width: number, height: number) {
      log.push(`strokeRect:${x},${y},${width},${height}`);
    },
    fillText(textValue: string, x: number, y: number) {
      log.push(`fillText:${textValue}:${x},${y}`);
    },
    measureText(textValue: string) {
      return { width: String(textValue).length * 7 };
    },
  } as unknown as CanvasRenderingContext2D;

  paintOrderPdfSketchAnnotations({ ctx, canvasWidth: 200, canvasHeight: 100, strokes: [makeStroke()] });

  assert.ok(log.includes('save'));
  assert.ok(log.includes('restore'));
  assert.ok(log.includes('moveTo:20,20'));
  assert.ok(log.includes('lineTo:120,70'));
  assert.ok(log.some(entry => entry.startsWith('stroke:#2563eb')));
});

test('[order-pdf] sketch annotation helpers normalize geometric tools into reusable canvas paths', () => {
  const square = buildOrderPdfSketchShapePoints({
    tool: 'square',
    points: [
      { x: 0.1, y: 0.2 },
      { x: 0.6, y: 0.9 },
    ],
  });
  assert.deepEqual(square, [
    { x: 0.1, y: 0.2 },
    { x: 0.6, y: 0.2 },
    { x: 0.6, y: 0.9 },
    { x: 0.1, y: 0.9 },
    { x: 0.1, y: 0.2 },
  ]);

  const circle = buildOrderPdfSketchShapePoints({
    tool: 'circle',
    points: [
      { x: 0.2, y: 0.2 },
      { x: 0.8, y: 0.7 },
    ],
  });
  assert.ok(circle.length > 20);
  assert.deepEqual(circle[0], circle[circle.length - 1]);

  const normalized = readOrderPdfSketchAnnotations({
    renderSketch: {
      strokes: [
        {
          tool: 'line',
          color: '#111827',
          width: 3,
          points: [
            { x: 0.1, y: 0.2 },
            { x: 0.8, y: 0.9 },
            { x: 0.3, y: 0.4 },
          ],
        },
      ],
    },
  });
  assert.deepEqual(normalized?.renderSketch?.strokes?.[0]?.points, [
    { x: 0.1, y: 0.2 },
    { x: 0.3, y: 0.4 },
  ]);
});

test('[order-pdf] sketch annotation helpers sanitize and compare persisted annotations', () => {
  const raw = {
    renderSketch: {
      strokes: [
        makeStroke(),
        { tool: 'pen', color: '#111827', width: 3, points: [{ x: -1, y: 2 }] },
        { tool: 'bad', color: '', width: 0, points: [] },
      ],
    },
  };

  const normalized = readOrderPdfSketchAnnotations(raw);
  const strokes = normalized?.renderSketch?.strokes || [];
  assert.equal(strokes.length, 2);
  assert.match(String(strokes[0]?.id || ''), /^stk-/);
  assert.equal(typeof strokes[0]?.createdAt, 'number');
  assert.deepEqual(
    strokes.map(stroke => ({
      tool: stroke.tool,
      color: stroke.color,
      width: stroke.width,
      points: stroke.points,
    })),
    [makeStroke(), { tool: 'pen', color: '#111827', width: 3, points: [{ x: 0, y: 1 }] }]
  );

  const cloned = cloneOrderPdfSketchAnnotations(normalized);
  assert.notEqual(cloned, normalized);
  assert.ok(areOrderPdfSketchAnnotationsEqual(normalized, cloned));
});

test('[order-pdf] sketch annotation painter switches to destination-out for eraser strokes', () => {
  const log: string[] = [];
  const ctx = {
    lineCap: 'butt',
    lineJoin: 'miter',
    lineWidth: 0,
    strokeStyle: '',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    stroke() {
      log.push(`stroke:${String(this.globalCompositeOperation)}:${String(this.strokeStyle)}`);
    },
    fill() {
      log.push(`fill:${String(this.globalCompositeOperation)}:${String(this.fillStyle)}`);
    },
  } as unknown as CanvasRenderingContext2D;

  paintOrderPdfSketchAnnotations({
    ctx,
    canvasWidth: 200,
    canvasHeight: 100,
    strokes: [
      {
        tool: 'eraser',
        color: '#2563eb',
        width: 8,
        points: [
          { x: 0.2, y: 0.2 },
          { x: 0.6, y: 0.6 },
        ],
      },
    ],
  });

  assert.deepEqual(log, ['stroke:destination-out:#000000']);
});

test('[order-pdf] persisted geometric paths stay intact after normalization', () => {
  const normalized = readOrderPdfSketchAnnotations({
    renderSketch: {
      strokes: [
        {
          tool: 'square',
          color: '#111827',
          width: 3,
          points: [
            { x: 0.1, y: 0.2 },
            { x: 0.6, y: 0.2 },
            { x: 0.6, y: 0.9 },
            { x: 0.1, y: 0.9 },
            { x: 0.1, y: 0.2 },
          ],
        },
      ],
    },
  });

  assert.deepEqual(normalized?.renderSketch?.strokes?.[0]?.points, [
    { x: 0.1, y: 0.2 },
    { x: 0.6, y: 0.2 },
    { x: 0.6, y: 0.9 },
    { x: 0.1, y: 0.9 },
    { x: 0.1, y: 0.2 },
  ]);
});

test('[order-pdf] sketch text boxes can be created from drag rects and keep bold state in comparisons', () => {
  const created = createOrderPdfSketchTextBoxFromRect({
    rect: { x: 0.82, y: 0.9, width: 0.3, height: 0.2 },
    color: '#111827',
    fontSize: 22,
    bold: true,
  });
  assert.ok(created.x <= 0.7);
  assert.ok(created.y <= 0.8);
  assert.equal(created.width, 0.3);
  assert.equal(created.height, 0.2);
  assert.equal(created.bold, true);

  const normalized = readOrderPdfSketchAnnotations({
    renderSketch: {
      textBoxes: [created],
    },
  });
  const cloned = cloneOrderPdfSketchAnnotations(normalized);
  assert.ok(areOrderPdfSketchAnnotationsEqual(normalized, cloned));

  const toggled = readOrderPdfSketchAnnotations({
    renderSketch: {
      textBoxes: [{ ...created, bold: false }],
    },
  });
  assert.equal(areOrderPdfSketchAnnotationsEqual(normalized, toggled), false);
});

test('[order-pdf] sketch annotation reducers return the same draft on text-box no-op operations', () => {
  const created = createOrderPdfSketchTextBoxAtPoint({ point: { x: 0.18, y: 0.22 }, color: '#111827' });
  const draft = upsertOrderPdfSketchTextBox({
    draft: null,
    key: 'renderSketch',
    textBox: {
      ...created,
      text: 'same',
      fontSize: 16,
    },
  });

  const sameUpsert = upsertOrderPdfSketchTextBox({
    draft,
    key: 'renderSketch',
    textBox: listOrderPdfSketchTextBoxes(draft, 'renderSketch')[0]!,
  });
  assert.equal(sameUpsert, draft);

  const missingDelete = deleteOrderPdfSketchTextBox({ draft, key: 'renderSketch', id: 'missing-id' });
  assert.equal(missingDelete, draft);

  const missingDeleteEmpty = deleteOrderPdfSketchTextBox({ draft, key: 'renderSketch', id: '' });
  assert.equal(missingDeleteEmpty, draft);
});

test('[order-pdf] sketch annotation reducers return the same draft on empty clear and undo no-ops', () => {
  const stroke = makeStroke();
  const draft = appendOrderPdfSketchStroke({ draft: null, key: 'renderSketch', stroke });

  const clearMissing = clearOrderPdfSketchStrokes(draft, 'openClosed');
  assert.equal(clearMissing, draft);

  const emptyDraft = clearOrderPdfSketchStrokes(draft, 'renderSketch');
  const undoMissing = undoOrderPdfSketchStroke(emptyDraft, 'renderSketch');
  assert.equal(undoMissing, emptyDraft);
});

test('[order-pdf] invalid sketch annotation writes do not synthesize a new draft', () => {
  const base = upsertOrderPdfSketchTextBox({
    draft: null,
    key: 'renderSketch',
    textBox: {
      ...createOrderPdfSketchTextBoxAtPoint({ point: { x: 0.12, y: 0.16 }, color: '#111827' }),
      text: 'base',
    },
  });

  const invalidStroke = appendOrderPdfSketchStroke({
    draft: base,
    key: 'renderSketch',
    stroke: {
      tool: 'pen',
      color: '#111827',
      width: 3,
      points: [],
    } as never,
  });
  assert.equal(invalidStroke, base);

  const invalidTextBox = upsertOrderPdfSketchTextBox({
    draft: base,
    key: 'renderSketch',
    textBox: {
      ...listOrderPdfSketchTextBoxes(base, 'renderSketch')[0]!,
      width: Number.NaN,
    },
  });
  assert.equal(invalidTextBox, base);
});

test('[order-pdf] sketch text boxes are persisted, listed, painted, and deleted per page', () => {
  const created = createOrderPdfSketchTextBoxAtPoint({ point: { x: 0.2, y: 0.3 }, color: '#dc2626' });
  const withText = upsertOrderPdfSketchTextBox({
    draft: null,
    key: 'renderSketch',
    textBox: {
      ...created,
      height: 0.28,
      text: 'בדיקה',
    },
  });

  const textBoxes = listOrderPdfSketchTextBoxes(withText, 'renderSketch');
  assert.equal(textBoxes.length, 1);
  assert.equal(textBoxes[0]?.text, 'בדיקה');

  const log: string[] = [];
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    font: '',
    textAlign: 'right',
    textBaseline: 'top',
    save() {},
    restore() {},
    fillRect(x: number, y: number, width: number, height: number) {
      log.push(`fillRect:${x},${y},${width},${height}`);
    },
    strokeRect(x: number, y: number, width: number, height: number) {
      log.push(`strokeRect:${x},${y},${width},${height}`);
    },
    fillText(value: string, x: number, y: number) {
      log.push(`fillText:${value}:${x},${y}`);
    },
    measureText(value: string) {
      return { width: String(value).length * 8 };
    },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    stroke() {},
    fill() {},
  } as unknown as CanvasRenderingContext2D;

  paintOrderPdfSketchAnnotations({
    ctx,
    canvasWidth: 200,
    canvasHeight: 100,
    strokes: [],
    textBoxes,
  });

  assert.ok(!log.some(entry => entry.startsWith('fillRect:')));
  assert.ok(log.some(entry => entry.startsWith('fillText:בדיקה:')));
  assert.ok(!textBoxes[0]?.bold);

  const removed = deleteOrderPdfSketchTextBox({ draft: withText, key: 'renderSketch', id: created.id });
  assert.equal(listOrderPdfSketchTextBoxes(removed, 'renderSketch').length, 0);
});
