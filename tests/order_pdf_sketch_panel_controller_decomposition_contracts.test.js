import test from 'node:test';
import assert from 'node:assert/strict';

import { assertLacksAll, assertMatchesAll, readSource } from './_source_bundle.js';

const main = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_controller.ts',
  import.meta.url
);
const hook = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_controller_hook.ts',
  import.meta.url
);
const stateHooks = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_controller_state_hooks.ts',
  import.meta.url
);
const annotationHooks = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_controller_annotation_hooks.ts',
  import.meta.url
);

test('order pdf sketch panel controller keeps state and annotation ownership split', () => {
  assertMatchesAll(assert, main, [
    /order_pdf_overlay_sketch_panel_controller_hook\.js/,
    /order_pdf_overlay_sketch_panel_controller_types\.js/,
  ]);
  assertMatchesAll(assert, hook, [
    /order_pdf_overlay_sketch_panel_controller_state_hooks\.js/,
    /order_pdf_overlay_sketch_panel_controller_annotation_hooks\.js/,
    /useOrderPdfSketchPanelState\(/,
    /useOrderPdfSketchPanelAnnotationActions\(/,
    /export function useOrderPdfSketchPanelController\(/,
  ]);
  assertLacksAll(assert, main, [
    /const \[tool, setToolState\] = useState</,
    /const handleAppendStroke = useCallback\(/,
    /const handleUpsertTextBox = useCallback\(/,
    /const handleDeleteTextBox = useCallback\(/,
  ]);
  assertLacksAll(assert, hook, [
    /const \[tool, setToolState\] = useState</,
    /const handleAppendStroke = useCallback\(/,
    /const handleUpsertTextBox = useCallback\(/,
    /const handleDeleteTextBox = useCallback\(/,
  ]);

  assertMatchesAll(assert, stateHooks, [
    /export function useOrderPdfSketchPanelState\(/,
    /const \[tool, setToolState\] = useState<OrderPdfSketchTool>/,
    /resolveOrderPdfSketchToolTransition/,
    /resolveOrderPdfSketchDrawTriggerResult/,
  ]);
  assertLacksAll(assert, stateHooks, [
    /listOrderPdfSketchTextBoxes\(/,
    /resolveOrderPdfSketchLatestAnnotationItem\(/,
    /onAppendStroke\(/,
  ]);

  assertMatchesAll(assert, annotationHooks, [
    /export function useOrderPdfSketchPanelAnnotationActions\(/,
    /resolveOrderPdfSketchLatestAnnotationItem/,
    /resolveOrderPdfSketchTextBoxMutation/,
    /resolveOrderPdfSketchDeletedTextBox/,
  ]);
  assertLacksAll(assert, annotationHooks, [
    /const \[tool, setToolState\] = useState</,
    /resolveOrderPdfSketchDrawTriggerResult/,
    /resolveOrderPdfSketchToolTransition/,
  ]);
});
