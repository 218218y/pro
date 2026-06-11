import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 59 order pdf sketch canvas runtime ownership split is anchored', () => {
  const facade = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_canvas_runtime.ts');
  const types = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_canvas_runtime_types.ts');
  const equality = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_canvas_runtime_equality.ts');
  const paint = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_canvas_runtime_paint.ts');
  const resolve = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_canvas_runtime_resolve.ts');
  const consumers = [
    read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_canvas_hooks.ts'),
    read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_hooks.ts'),
  ].join('\n');

  assert.ok(lineCount(facade) <= 6, 'canvas runtime facade must stay tiny');
  assert.match(facade, /order_pdf_overlay_sketch_panel_canvas_runtime_types\.js/);
  assert.match(facade, /order_pdf_overlay_sketch_panel_canvas_runtime_equality\.js/);
  assert.match(facade, /order_pdf_overlay_sketch_panel_canvas_runtime_paint\.js/);
  assert.match(facade, /order_pdf_overlay_sketch_panel_canvas_runtime_resolve\.js/);
  assert.doesNotMatch(facade, /paintOrderPdfSketchAnnotations|canvas\.getContext|areOrderPdfSketch/);

  assert.match(types, /export type OrderPdfSketchCanvasDrawState/);
  assert.doesNotMatch(types, /paintOrderPdfSketchAnnotations|shouldRepaintOrderPdfSketchCanvas/);

  assert.match(equality, /export function shouldRepaintOrderPdfSketchCanvas/);
  assert.match(equality, /areOrderPdfSketchStrokeListsEqual/);
  assert.match(equality, /areOrderPdfSketchTextBoxListsEqual/);
  assert.doesNotMatch(equality, /canvas\.getContext|paintOrderPdfSketchAnnotations/);

  assert.match(paint, /export function syncOrderPdfSketchCanvasElementSize/);
  assert.match(paint, /export function paintOrderPdfSketchCanvasFrame/);
  assert.match(paint, /paintOrderPdfSketchAnnotations/);
  assert.doesNotMatch(paint, /resolveOrderPdfSketchCanvasPixels|shouldRepaintOrderPdfSketchCanvas/);

  assert.match(resolve, /export function resolveOrderPdfSketchCanvasPixels/);
  assert.match(resolve, /export function resolveOrderPdfSketchCanvasDrawState/);
  assert.match(resolve, /export function resolveOrderPdfSketchCanvasRect/);
  assert.match(resolve, /export function nextOrderPdfSketchCanvasFrameVersion/);
  assert.doesNotMatch(resolve, /paintOrderPdfSketchAnnotations|areOrderPdfSketchStrokeListsEqual/);

  assert.match(consumers, /from '\.\/order_pdf_overlay_sketch_panel_canvas_runtime\.js';/);
  assert.doesNotMatch(
    consumers,
    /order_pdf_overlay_sketch_panel_canvas_runtime_(types|equality|paint|resolve)\.js/,
    'canvas consumers must keep using the public canvas runtime facade'
  );

  assert.doesNotMatch(facade + types + equality + paint + resolve, /export default\s+/);
});
