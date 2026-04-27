import test from 'node:test';
import assert from 'node:assert/strict';

import { assertLacksAll, assertMatchesAll, readSource } from './_source_bundle.js';

const main = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_hooks.ts',
  import.meta.url
);
const shared = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_hooks_shared.ts',
  import.meta.url
);
const boxHooks = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_box_hooks.ts',
  import.meta.url
);
const canvasHooks = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_canvas_hooks.ts',
  import.meta.url
);
const sessionHooks = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_session_hooks.ts',
  import.meta.url
);

test('order pdf text-layer pointer hooks keep shared, box, and canvas ownership split', () => {
  assertMatchesAll(assert, main, [
    /order_pdf_overlay_sketch_card_text_layer_pointer_box_hooks\.js/,
    /order_pdf_overlay_sketch_card_text_layer_pointer_canvas_hooks\.js/,
    /order_pdf_overlay_sketch_card_text_layer_pointer_hooks_shared\.js/,
    /export function useOrderPdfSketchCardTextLayerPointerHooks\(/,
  ]);
  assertLacksAll(assert, main, [
    /const startTextBoxInteraction = useCallback\(/,
    /const handleCanvasPointerDown = useCallback\(/,
    /const handleCanvasPointerFinish = useCallback\(/,
  ]);

  assertMatchesAll(assert, shared, [
    /export type OrderPdfSketchCardTextLayerPointerHooksArgs = \{/,
    /export function preventOrderPdfSketchPointerEvent\(/,
    /export function trySetOrderPdfSketchPointerCapture\(/,
    /export function tryReleaseOrderPdfSketchPointerCapture\(/,
  ]);
  assertLacksAll(assert, shared, [
    /createOrderPdfSketchTextLayerInteractionPreview\(/,
    /resolveOrderPdfSketchTextLayerCanvasPointerAction\(/,
  ]);

  assertMatchesAll(assert, boxHooks, [
    /export function useOrderPdfSketchTextLayerBoxPointerHooks\(/,
    /createOrderPdfSketchTextLayerInteractionPreview/,
    /isOrderPdfSketchTextBoxChromeTarget/,
    /setInteractionSession/,
  ]);
  assertLacksAll(assert, boxHooks, [
    /resolveOrderPdfSketchTextLayerCanvasPointerAction\(/,
    /resolveOrderPdfSketchTextLayerCreateCommitAction\(/,
  ]);

  assertMatchesAll(assert, canvasHooks, [
    /export function useOrderPdfSketchTextLayerCanvasPointerHooks\(/,
    /resolveOrderPdfSketchTextLayerCanvasPointerAction/,
    /resolveOrderPdfSketchTextLayerCreateCommitAction/,
    /trySetOrderPdfSketchPointerCapture/,
    /tryReleaseOrderPdfSketchPointerCapture/,
  ]);
  assertLacksAll(assert, canvasHooks, [
    /createOrderPdfSketchTextLayerInteractionPreview\(/,
    /isOrderPdfSketchTextBoxChromeTarget\(/,
  ]);

  assertMatchesAll(assert, sessionHooks, [
    /export type OrderPdfSketchTextLayerInteractionSession = /,
    /export type OrderPdfSketchTextLayerCreateSession = /,
  ]);
});
