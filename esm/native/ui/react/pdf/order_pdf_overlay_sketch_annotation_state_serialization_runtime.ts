import type {
  OrderPdfSketchAnnotations,
  OrderPdfSketchStroke,
  OrderPdfSketchTextBox,
} from './order_pdf_overlay_contracts.js';
import {
  asUnknownRecord,
  ORDER_PDF_SKETCH_ANNOTATION_PAGE_KEYS,
} from './order_pdf_overlay_sketch_annotation_state_shared.js';
import { normalizeOrderPdfSketchStroke } from './order_pdf_overlay_sketch_annotation_state_shapes_runtime.js';
import {
  areOrderPdfSketchTextBoxesEqual,
  normalizeOrderPdfSketchTextBox,
} from './order_pdf_overlay_sketch_annotation_state_text_boxes_runtime.js';

export function readOrderPdfSketchAnnotations(value: unknown): OrderPdfSketchAnnotations | undefined {
  const rec = asUnknownRecord(value);
  if (!rec) return undefined;
  const next: OrderPdfSketchAnnotations = {};

  for (const key of ORDER_PDF_SKETCH_ANNOTATION_PAGE_KEYS) {
    const layer = asUnknownRecord(rec[key]);
    const rawStrokes = layer?.strokes;
    const rawTextBoxes = layer?.textBoxes;
    const strokes = Array.isArray(rawStrokes)
      ? rawStrokes
          .map(raw => normalizeOrderPdfSketchStroke(raw))
          .filter((stroke): stroke is OrderPdfSketchStroke => !!stroke)
      : [];
    const textBoxes = Array.isArray(rawTextBoxes)
      ? rawTextBoxes
          .map((raw, index) => normalizeOrderPdfSketchTextBox({ value: raw, key, index }))
          .filter((textBox): textBox is OrderPdfSketchTextBox => !!textBox)
      : [];
    if (!strokes.length && !textBoxes.length) continue;
    next[key] = { strokes, ...(textBoxes.length ? { textBoxes } : {}) };
  }

  return Object.keys(next).length ? next : undefined;
}

export function cloneOrderPdfSketchAnnotations(
  value: OrderPdfSketchAnnotations | null | undefined
): OrderPdfSketchAnnotations | undefined {
  return readOrderPdfSketchAnnotations(value);
}

function areOrderPdfSketchStrokesEqual(a: OrderPdfSketchStroke, b: OrderPdfSketchStroke): boolean {
  if (
    a.id !== b.id ||
    !Object.is(a.createdAt, b.createdAt) ||
    a.tool !== b.tool ||
    a.color !== b.color ||
    !Object.is(a.width, b.width)
  ) {
    return false;
  }
  if (a.points.length !== b.points.length) return false;
  for (const [index, left] of a.points.entries()) {
    const right = b.points[index];
    if (!right || !Object.is(left.x, right.x) || !Object.is(left.y, right.y)) return false;
  }
  return true;
}

export function areOrderPdfSketchAnnotationsEqual(
  a: OrderPdfSketchAnnotations | null | undefined,
  b: OrderPdfSketchAnnotations | null | undefined
): boolean {
  const left = readOrderPdfSketchAnnotations(a);
  const right = readOrderPdfSketchAnnotations(b);
  if (!left && !right) return true;
  if (!left || !right) return false;

  for (const key of ORDER_PDF_SKETCH_ANNOTATION_PAGE_KEYS) {
    const leftStrokes = left[key]?.strokes || [];
    const rightStrokes = right[key]?.strokes || [];
    const leftTextBoxes = left[key]?.textBoxes || [];
    const rightTextBoxes = right[key]?.textBoxes || [];
    if (leftStrokes.length !== rightStrokes.length) return false;
    if (leftTextBoxes.length !== rightTextBoxes.length) return false;
    for (const [index, leftStroke] of leftStrokes.entries()) {
      const rightStroke = rightStrokes[index];
      if (!rightStroke || !areOrderPdfSketchStrokesEqual(leftStroke, rightStroke)) return false;
    }
    for (const [index, leftTextBox] of leftTextBoxes.entries()) {
      const rightTextBox = rightTextBoxes[index];
      if (!rightTextBox || !areOrderPdfSketchTextBoxesEqual(leftTextBox, rightTextBox)) return false;
    }
  }

  return true;
}
