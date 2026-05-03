import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 63 order pdf sketch panel measurement hooks ownership split is anchored', () => {
  const facade = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_measurement_hooks.ts');
  const types = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_measurement_hooks_types.ts');
  const observed = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_measurement_observed_value.ts'
  );
  const drawingRect = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_measurement_drawing_rect.ts'
  );
  const placement = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_measurement_placement.ts');
  const panelHooks = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_hooks.ts');
  const card = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_card.tsx');
  const controllerHook = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_controller_hook.ts');
  const floatingPalette = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_toolbar_floating_palette.tsx'
  );

  assert.ok(lineCount(facade) <= 8, 'measurement hooks public module must stay a tiny facade');
  assert.match(facade, /order_pdf_overlay_sketch_panel_measurement_drawing_rect\.js/);
  assert.match(facade, /order_pdf_overlay_sketch_panel_measurement_placement\.js/);
  assert.match(facade, /order_pdf_overlay_sketch_panel_measurement_hooks_types\.js/);
  assert.doesNotMatch(
    facade,
    /useLayoutEffect|generationRef|readOrderPdfDrawingRect|resolveOrderPdfSketchToolbarPlacement|getClosestOrderPdfStage/,
    'measurement hooks facade must not own observation, drawing-rect, or placement internals'
  );

  assert.match(types, /export type ObservedDrawingRectPublishMode/);
  assert.match(types, /export type ObservedViewportValueArgs/);
  assert.match(types, /export type ObservedViewportValueResult/);
  assert.doesNotMatch(types, /useState|useLayoutEffect|observeViewportLayout|readOrderPdfDrawingRect/);

  assert.match(observed, /export function useObservedViewportValue/);
  assert.match(observed, /generationRef/);
  assert.match(observed, /observeViewportLayout/);
  assert.match(observed, /getNodeDocument/);
  assert.match(observed, /getNodeWindow/);
  assert.doesNotMatch(
    observed,
    /readOrderPdfDrawingRect|resolveOrderPdfSketchToolbarPlacement|resolveOrderPdfSketchFloatingPalettePlacement/
  );

  assert.match(drawingRect, /export function useObservedOrderPdfDrawingRect/);
  assert.match(drawingRect, /readOrderPdfDrawingRect/);
  assert.match(drawingRect, /areOrderPdfDrawingRectsEqual/);
  assert.match(drawingRect, /areOrderPdfDrawingRectSizesEqual/);
  assert.doesNotMatch(
    drawingRect,
    /resolveOrderPdfSketchToolbarPlacement|resolveOrderPdfSketchFloatingPalettePlacement/
  );

  assert.match(placement, /export function useOrderPdfSketchFloatingPalettePlacement/);
  assert.match(placement, /export function useOrderPdfSketchToolbarPlacement/);
  assert.match(placement, /resolveOrderPdfSketchFloatingPalettePlacement/);
  assert.match(placement, /resolveOrderPdfSketchToolbarPlacement/);
  assert.match(placement, /getClosestOrderPdfStage/);
  assert.doesNotMatch(placement, /readOrderPdfDrawingRect|areOrderPdfDrawingRectsEqual/);

  for (const consumer of [panelHooks, card, controllerHook, floatingPalette]) {
    assert.match(consumer, /from '\.\/order_pdf_overlay_sketch_panel_measurement_hooks\.js';/);
    assert.doesNotMatch(
      consumer,
      /order_pdf_overlay_sketch_panel_measurement_(drawing_rect|placement|observed_value|hooks_types)\.js/,
      'measurement hook consumers must keep using the public measurement-hooks facade'
    );
  }

  assert.doesNotMatch(facade + types + observed + drawingRect + placement, /export default\s+/);
});
