import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 56 order pdf text layer session ownership split is anchored', () => {
  const facade = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_session_hooks.ts'
  );
  const types = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_session_hooks_types.ts'
  );
  const interaction = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_interaction_session_hooks.ts'
  );
  const create = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_create_session_hooks.ts'
  );
  const pointerHooks = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_hooks.ts'
  );
  const boxHooks = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_box_hooks.ts'
  );
  const canvasHooks = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_canvas_hooks.ts'
  );

  assert.ok(
    lineCount(facade) <= 8,
    'text-layer pointer session hooks facade must stay tiny instead of regrowing interaction/create session internals'
  );
  assert.match(facade, /order_pdf_overlay_sketch_card_text_layer_pointer_session_hooks_types\.js/);
  assert.match(facade, /order_pdf_overlay_sketch_card_text_layer_pointer_interaction_session_hooks\.js/);
  assert.match(facade, /order_pdf_overlay_sketch_card_text_layer_pointer_create_session_hooks\.js/);
  assert.doesNotMatch(
    facade,
    /useCallback|useEffect|useRef|useState|updateOrderPdfSketchTextBoxInteractionPreview|updateOrderPdfSketchTextCreateSession|installDomEventListener/,
    'session facade must not own React state, pointer listeners, or interaction update internals'
  );

  for (const exportedType of [
    'OrderPdfSketchClientPoint',
    'OrderPdfSketchTextLayerInteractionSession',
    'OrderPdfSketchTextLayerCreateSession',
    'OrderPdfSketchTextLayerInteractionSessionArgs',
    'OrderPdfSketchTextLayerCreateSessionResult',
  ]) {
    assert.match(types, new RegExp(`export type ${exportedType}`), `types owner must expose ${exportedType}`);
  }
  assert.doesNotMatch(types, /useCallback|useEffect|installDomEventListener|requestAnimationFrame/);

  assert.match(interaction, /export function useOrderPdfSketchTextLayerInteractionSession\(/);
  assert.match(interaction, /updateOrderPdfSketchTextBoxInteractionPreview/);
  assert.match(interaction, /installDomEventListener/);
  assert.match(interaction, /pointermove/);
  assert.match(interaction, /pointerup/);
  assert.match(interaction, /pointercancel/);
  assert.doesNotMatch(interaction, /updateOrderPdfSketchTextCreateSession/);

  assert.match(create, /export function useOrderPdfSketchTextLayerCreateSession\(/);
  assert.match(create, /updateOrderPdfSketchTextCreateSession/);
  assert.match(create, /requestAnimationFrame/);
  assert.doesNotMatch(create, /installDomEventListener|updateOrderPdfSketchTextBoxInteractionPreview/);

  assert.match(
    pointerHooks,
    /from '\.\/order_pdf_overlay_sketch_card_text_layer_pointer_session_hooks\.js';/
  );
  assert.doesNotMatch(
    pointerHooks,
    /order_pdf_overlay_sketch_card_text_layer_pointer_(interaction_session_hooks|create_session_hooks|session_hooks_types)\.js/,
    'pointer hooks must keep using the public session facade instead of private session owners'
  );
  assert.match(boxHooks, /from '\.\/order_pdf_overlay_sketch_card_text_layer_pointer_session_hooks\.js';/);
  assert.match(canvasHooks, /from '\.\/order_pdf_overlay_sketch_card_text_layer_pointer_session_hooks\.js';/);
  assert.doesNotMatch(facade + types + interaction + create, /export default\s+/);
});
