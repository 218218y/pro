import test from 'node:test';
import assert from 'node:assert/strict';

import { assertLacksAll, assertMatchesAll, readSource } from './_source_bundle.js';

const main = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_runtime.ts',
  import.meta.url
);
const tools = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_runtime_tools.ts',
  import.meta.url
);
const annotations = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_runtime_annotations.ts',
  import.meta.url
);
const drawing = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_runtime_drawing.ts',
  import.meta.url
);

test('order pdf sketch panel runtime keeps tools, annotations, and drawing ownership split', () => {
  assertMatchesAll(assert, main, [
    /order_pdf_overlay_sketch_panel_runtime_annotations\.js/,
    /order_pdf_overlay_sketch_panel_runtime_drawing\.js/,
    /order_pdf_overlay_sketch_panel_runtime_tools\.js/,
    /resolveOrderPdfSketchControlState/,
    /buildOrderPdfSketchStrokeMap/,
    /buildOrderPdfDrawingPointFromClient/,
  ]);
  assertLacksAll(assert, main, [
    /export function buildOrderPdfSketchStrokeMap\(/,
    /export function buildOrderPdfDrawingPointFromClient\(/,
    /export function resolveOrderPdfSketchControlState\(/,
  ]);

  assertMatchesAll(assert, tools, [
    /export function resolveOrderPdfSketchToolTransition\(/,
    /export function resolveOrderPdfSketchCanvasPointerIntent\(/,
    /export function resolveOrderPdfSketchControlState\(/,
  ]);
  assertLacksAll(assert, tools, [
    /export function buildOrderPdfSketchStrokeMap\(/,
    /export function buildOrderPdfDrawingPointFromClient\(/,
    /export function popOrderPdfSketchRedoStroke\(/,
  ]);

  assertMatchesAll(assert, annotations, [
    /export function buildOrderPdfSketchPreviewEntryMap\(/,
    /export function buildOrderPdfSketchStrokeMap\(/,
    /export function popOrderPdfSketchRedoStroke\(/,
  ]);
  assertLacksAll(assert, annotations, [
    /export function resolveOrderPdfSketchControlState\(/,
    /export function buildOrderPdfDrawingPointFromClient\(/,
  ]);

  assertMatchesAll(assert, drawing, [
    /export function normalizeOrderPdfDrawingRect\(/,
    /export function buildOrderPdfStrokeFromDrawingPoints\(/,
    /export function updateOrderPdfDrawingPointsFromClientBatch\(/,
  ]);
  assertLacksAll(assert, drawing, [
    /export function buildOrderPdfSketchStrokeMap\(/,
    /export function resolveOrderPdfSketchControlState\(/,
    /export function popOrderPdfSketchRedoStroke\(/,
  ]);
});
