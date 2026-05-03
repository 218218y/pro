import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
}

test('order-pdf sketch panel measurement stays decomposed into dedicated runtime and hook files', () => {
  const panelHooks = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_hooks.ts');
  const measurementHooks = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_measurement_hooks.ts'
  );
  const measurementRuntime = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_measurement_runtime.ts'
  );
  const card = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_card.tsx');
  const controller = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_controller.ts');
  const controllerHook = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_controller_hook.ts');
  const toolbar = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_toolbar.tsx');
  const toolbarFloatingPalette = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_toolbar_floating_palette.tsx'
  );

  assert.match(panelHooks, /from '\.\/order_pdf_overlay_sketch_panel_measurement_hooks\.js';/);
  assert.match(panelHooks, /from '\.\/order_pdf_overlay_sketch_panel_measurement_runtime\.js';/);
  assert.match(panelHooks, /from '\.\/order_pdf_overlay_sketch_panel_canvas_hooks\.js';/);
  assert.match(panelHooks, /from '\.\/order_pdf_overlay_sketch_panel_history_hooks\.js';/);
  const measurementObservedValue = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_measurement_observed_value.ts'
  );
  const measurementDrawingRect = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_measurement_drawing_rect.ts'
  );
  const measurementPlacement = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_measurement_placement.ts'
  );
  assert.match(measurementHooks, /order_pdf_overlay_sketch_panel_measurement_drawing_rect\.js/);
  assert.match(measurementHooks, /order_pdf_overlay_sketch_panel_measurement_placement\.js/);
  assert.match(measurementObservedValue, /function useObservedViewportValue/);
  assert.match(measurementObservedValue, /generationRef/);
  assert.match(measurementDrawingRect, /export function useObservedOrderPdfDrawingRect/);
  assert.match(measurementPlacement, /export function useOrderPdfSketchToolbarPlacement/);
  assert.match(measurementRuntime, /DEFAULT_TOOLBAR_PLACEMENT/);
  assert.match(card, /from '\.\/order_pdf_overlay_sketch_panel_measurement_hooks\.js';/);
  assert.match(controllerHook, /from '\.\/order_pdf_overlay_sketch_panel_measurement_hooks\.js';/);
  assert.match(controller, /from '\.\/order_pdf_overlay_sketch_panel_controller_runtime\.js';/);
  assert.match(toolbar, /from '\.\/order_pdf_overlay_sketch_toolbar_view\.js';/);
  assert.match(toolbarFloatingPalette, /from '\.\/order_pdf_overlay_sketch_panel_measurement_hooks\.js';/);
  assert.doesNotMatch(panelHooks, /export function useObservedOrderPdfDrawingRect/);
  assert.doesNotMatch(panelHooks, /export function useOrderPdfSketchToolbarPlacement/);
  assert.doesNotMatch(panelHooks, /export function useCanvasRedraw/);
  assert.doesNotMatch(panelHooks, /export function useOrderPdfSketchRedoState/);
});
