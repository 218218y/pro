import test from 'node:test';
import assert from 'node:assert/strict';

import { assertLacksAll, assertMatchesAll, readSource } from './_source_bundle.js';

const main = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_annotation_state_core_runtime.ts',
  import.meta.url
);
const shared = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_annotation_state_shared.ts',
  import.meta.url
);
const shapes = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_annotation_state_shapes_runtime.ts',
  import.meta.url
);
const textBoxes = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_annotation_state_text_boxes_runtime.ts',
  import.meta.url
);
const serialization = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_annotation_state_serialization_runtime.ts',
  import.meta.url
);

test('order pdf sketch annotation state core keeps shared, shapes, text boxes, and serialization ownership split', () => {
  assertMatchesAll(assert, main, [
    /order_pdf_overlay_sketch_annotation_state_shared\.js/,
    /order_pdf_overlay_sketch_annotation_state_shapes_runtime\.js/,
    /order_pdf_overlay_sketch_annotation_state_text_boxes_runtime\.js/,
    /order_pdf_overlay_sketch_annotation_state_serialization_runtime\.js/,
  ]);
  assertLacksAll(assert, main, [
    /export function normalizeOrderPdfSketchStroke\(/,
    /export function normalizeOrderPdfSketchTextBox\(/,
    /export function readOrderPdfSketchAnnotations\(/,
    /export function areOrderPdfSketchAnnotationsEqual\(/,
  ]);

  assertMatchesAll(assert, shared, [
    /export const ORDER_PDF_SKETCH_ANNOTATION_PAGE_KEYS/,
    /export function isOrderPdfSketchStroke\(/,
    /export function listOrderPdfSketchTextBoxes\(/,
  ]);
  assertLacksAll(assert, shared, [
    /export function normalizeOrderPdfSketchStroke\(/,
    /export function normalizeOrderPdfSketchTextBox\(/,
    /export function readOrderPdfSketchAnnotations\(/,
  ]);

  assertMatchesAll(assert, shapes, [
    /export function buildOrderPdfSketchShapePoints\(/,
    /export function normalizeOrderPdfSketchStroke\(/,
  ]);
  assertLacksAll(assert, shapes, [
    /export function normalizeOrderPdfSketchTextBox\(/,
    /export function readOrderPdfSketchAnnotations\(/,
    /export function areOrderPdfSketchAnnotationsEqual\(/,
  ]);

  assertMatchesAll(assert, textBoxes, [
    /export function normalizeOrderPdfSketchTextBox\(/,
    /export function createOrderPdfSketchTextBoxAtPoint\(/,
    /export function areOrderPdfSketchTextBoxesEqual\(/,
  ]);
  assertLacksAll(assert, textBoxes, [
    /export function normalizeOrderPdfSketchStroke\(/,
    /export function readOrderPdfSketchAnnotations\(/,
    /export function areOrderPdfSketchAnnotationsEqual\(/,
  ]);

  assertMatchesAll(assert, serialization, [
    /export function readOrderPdfSketchAnnotations\(/,
    /export function cloneOrderPdfSketchAnnotations\(/,
    /export function areOrderPdfSketchAnnotationsEqual\(/,
  ]);
  assertLacksAll(assert, serialization, [
    /export function createOrderPdfSketchTextBoxAtPoint\(/,
    /export function buildOrderPdfSketchShapePoints\(/,
    /export function isOrderPdfSketchStroke\(/,
  ]);
});
