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
  const toolbar = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_toolbar.tsx');

  assert.match(panelHooks, /from '\.\/order_pdf_overlay_sketch_panel_measurement_hooks\.js';/);
  assert.match(panelHooks, /from '\.\/order_pdf_overlay_sketch_panel_measurement_runtime\.js';/);
  assert.match(panelHooks, /from '\.\/order_pdf_overlay_sketch_panel_canvas_hooks\.js';/);
  assert.match(panelHooks, /from '\.\/order_pdf_overlay_sketch_panel_history_hooks\.js';/);
  assert.match(measurementHooks, /function useObservedViewportValue/);
  assert.match(measurementHooks, /generationRef/);
  assert.match(measurementRuntime, /DEFAULT_TOOLBAR_PLACEMENT/);
  assert.match(card, /from '\.\/order_pdf_overlay_sketch_panel_measurement_hooks\.js';/);
  assert.match(controller, /from '\.\/order_pdf_overlay_sketch_panel_measurement_hooks\.js';/);
  assert.match(controller, /from '\.\/order_pdf_overlay_sketch_panel_controller_runtime\.js';/);
  assert.match(toolbar, /from '\.\/order_pdf_overlay_sketch_panel_measurement_hooks\.js';/);
  assert.doesNotMatch(panelHooks, /export function useObservedOrderPdfDrawingRect/);
  assert.doesNotMatch(panelHooks, /export function useOrderPdfSketchToolbarPlacement/);
  assert.doesNotMatch(panelHooks, /export function useCanvasRedraw/);
  assert.doesNotMatch(panelHooks, /export function useOrderPdfSketchRedoState/);
});
