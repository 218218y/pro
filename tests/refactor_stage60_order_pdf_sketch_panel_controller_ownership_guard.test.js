import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 60 order pdf sketch panel controller ownership split is anchored', () => {
  const facade = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_controller.ts');
  const types = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_controller_types.ts');
  const hook = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_controller_hook.ts');
  const activeState = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_controller_active_state.ts'
  );
  const stateHooks = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_controller_state_hooks.ts');
  const annotationHooks = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_controller_annotation_hooks.ts'
  );
  const consumers = [
    read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_view_hooks.ts'),
    read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_toolbar_types.ts'),
    read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_toolbar_freehand.ts'),
    read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_toolbar_palettes.tsx'),
  ].join('\n');

  assert.ok(lineCount(facade) <= 6, 'sketch panel controller facade must stay tiny');
  assert.match(facade, /order_pdf_overlay_sketch_panel_controller_hook\.js/);
  assert.match(facade, /order_pdf_overlay_sketch_panel_controller_types\.js/);
  assert.match(facade, /order_pdf_overlay_sketch_panel_controller_runtime\.js/);
  assert.doesNotMatch(
    facade,
    /useMemo|useOrderPdfSketchRedoState|useOrderPdfSketchPanelState|useOrderPdfSketchPanelAnnotationActions/,
    'facade must not own panel controller hook orchestration'
  );

  assert.match(types, /export type UseOrderPdfSketchPanelControllerArgs/);
  assert.match(types, /MutableRefObject<HTMLDivElement \| null>/);
  assert.doesNotMatch(types, /useMemo|useOrderPdfSketchRedoState|buildOrderPdfSketchStrokeMap/);

  assert.match(activeState, /export function useOrderPdfSketchPanelAnnotationMaps\(/);
  assert.match(activeState, /export function resolveOrderPdfSketchPanelActiveState\(/);
  assert.match(activeState, /buildOrderPdfSketchStrokeMap/);
  assert.match(activeState, /buildOrderPdfSketchTextBoxMap/);
  assert.match(activeState, /buildOrderPdfSketchPreviewEntryMap/);
  assert.doesNotMatch(activeState, /useOrderPdfSketchRedoState|useOrderPdfSketchPanelAnnotationActions/);

  assert.match(hook, /useOrderPdfSketchPanelState/);
  assert.match(hook, /useOrderPdfSketchPanelAnnotationMaps/);
  assert.match(hook, /useOrderPdfSketchRedoState/);
  assert.match(hook, /useOrderPdfSketchPanelAnnotationActions/);
  assert.match(hook, /useOrderPdfSketchHistoryShortcuts/);
  assert.match(hook, /useOrderPdfSketchToolbarPlacement/);
  assert.doesNotMatch(hook, /buildOrderPdfSketchStrokeMap|buildOrderPdfSketchTextBoxMap/);

  assert.match(stateHooks, /export function useOrderPdfSketchPanelState\(/);
  assert.match(annotationHooks, /export function useOrderPdfSketchPanelAnnotationActions\(/);

  assert.match(consumers, /from '\.\/order_pdf_overlay_sketch_panel_controller\.js';/);
  assert.doesNotMatch(
    consumers,
    /order_pdf_overlay_sketch_panel_controller_(types|hook|active_state)\.js/,
    'panel controller consumers must keep using the public controller facade'
  );

  assert.doesNotMatch(facade + types + hook + activeState, /export default\s+/);
});
