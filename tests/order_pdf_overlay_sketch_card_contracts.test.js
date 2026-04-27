import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
}

test('order-pdf sketch card keeps note-box rendering and text-layer ownership decomposed into dedicated files', () => {
  const card = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_card.tsx');
  const textLayerHooks = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_hooks.ts');
  const textLayerInteractions = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_interactions_hooks.ts'
  );
  const textLayerRuntime = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_runtime.ts'
  );
  const pointerHooks = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_hooks.ts'
  );
  const pointerRuntime = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_runtime.ts'
  );
  const pointerShared = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_hooks_shared.ts'
  );
  const pointerBoxHooks = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_box_hooks.ts'
  );
  const pointerCanvasHooks = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_canvas_hooks.ts'
  );
  const pointerSessionHooks = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_session_hooks.ts'
  );
  const noteBox = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_note_box.tsx');
  const preview = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_text_box_interaction_preview.ts');
  const createInteraction = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_text_box_create_interaction.ts'
  );

  assert.match(card, /from '\.\/order_pdf_overlay_sketch_note_box\.js';/);
  assert.match(card, /from '\.\/order_pdf_overlay_sketch_card_text_layer_hooks\.js';/);
  assert.doesNotMatch(card, /createOrderPdfSketchTextBoxInteractionPreview/);
  assert.doesNotMatch(card, /createOrderPdfSketchTextCreateSession/);
  assert.match(textLayerHooks, /from '\.\/order_pdf_overlay_sketch_card_text_layer_interactions_hooks\.js';/);
  assert.doesNotMatch(textLayerHooks, /createOrderPdfSketchTextBoxInteractionPreview/);
  assert.doesNotMatch(textLayerHooks, /createOrderPdfSketchTextCreateSession/);
  assert.match(textLayerInteractions, /from '\.\/order_pdf_overlay_sketch_card_text_layer_runtime\.js';/);
  assert.match(
    textLayerInteractions,
    /from '\.\/order_pdf_overlay_sketch_card_text_layer_pointer_hooks\.js';/
  );
  assert.doesNotMatch(textLayerInteractions, /createOrderPdfSketchTextBoxInteractionPreview/);
  assert.doesNotMatch(textLayerInteractions, /createOrderPdfSketchTextCreateSession/);
  assert.match(textLayerRuntime, /resolveOrderPdfSketchPersistLiveTextBox/);
  assert.match(textLayerRuntime, /resolveOrderPdfSketchCommitTextBoxSource/);
  assert.match(pointerHooks, /from '\.\/order_pdf_overlay_sketch_card_text_layer_pointer_box_hooks\.js';/);
  assert.match(pointerHooks, /from '\.\/order_pdf_overlay_sketch_card_text_layer_pointer_canvas_hooks\.js';/);
  assert.match(pointerHooks, /from '\.\/order_pdf_overlay_sketch_card_text_layer_pointer_hooks_shared\.js';/);
  assert.match(
    pointerHooks,
    /from '\.\/order_pdf_overlay_sketch_card_text_layer_pointer_session_hooks\.js';/
  );
  assert.doesNotMatch(pointerHooks, /createOrderPdfSketchTextBoxInteractionPreview/);
  assert.doesNotMatch(pointerHooks, /createOrderPdfSketchTextCreateSession/);
  assert.doesNotMatch(pointerHooks, /resolveOrderPdfSketchCanvasPointerIntent/);
  assert.match(pointerShared, /preventOrderPdfSketchPointerEvent/);
  assert.match(pointerShared, /trySetOrderPdfSketchPointerCapture/);
  assert.match(pointerShared, /tryReleaseOrderPdfSketchPointerCapture/);
  assert.match(pointerBoxHooks, /createOrderPdfSketchTextLayerInteractionPreview/);
  assert.match(pointerCanvasHooks, /resolveOrderPdfSketchTextLayerCanvasPointerAction/);
  assert.match(pointerCanvasHooks, /resolveOrderPdfSketchTextLayerCreateCommitAction/);
  assert.match(pointerRuntime, /createOrderPdfSketchTextLayerInteractionPreview/);
  assert.match(pointerRuntime, /resolveOrderPdfSketchTextLayerCanvasPointerAction/);
  assert.match(pointerRuntime, /resolveOrderPdfSketchTextLayerCreateCommitAction/);
  assert.match(pointerSessionHooks, /updateOrderPdfSketchTextBoxInteractionPreview/);
  assert.match(pointerSessionHooks, /updateOrderPdfSketchTextCreateSession/);
  assert.match(noteBox, /OrderPdfSketchNoteToolbar/);
  assert.match(preview, /resolveOrderPdfSketchRenderedTextBoxes/);
  assert.match(preview, /updateOrderPdfSketchTextBoxInteractionPreview/);
  assert.match(createInteraction, /createOrderPdfSketchTextCreateSession/);
  assert.match(createInteraction, /updateOrderPdfSketchTextCreateSession/);
});
