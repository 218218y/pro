import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 57 order pdf text box runtime ownership split is anchored', () => {
  const facade = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_text_box_runtime.ts');
  const types = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_text_box_runtime_types.ts');
  const geometry = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_text_box_runtime_geometry.ts');
  const interaction = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_text_box_runtime_interaction.ts'
  );
  const equality = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_text_box_runtime_equality.ts');
  const consumerFiles = [
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_runtime.ts',
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_runtime.ts',
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_note_box.tsx',
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_controller_runtime.ts',
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_text_box_interaction_preview.ts',
  ];
  const consumerSurface = consumerFiles.map(read).join('\n');

  assert.ok(lineCount(facade) <= 8, 'text box runtime facade must stay tiny');
  assert.match(facade, /order_pdf_overlay_sketch_text_box_runtime_types\.js/);
  assert.match(facade, /order_pdf_overlay_sketch_text_box_runtime_geometry\.js/);
  assert.match(facade, /order_pdf_overlay_sketch_text_box_runtime_interaction\.js/);
  assert.match(facade, /order_pdf_overlay_sketch_text_box_runtime_equality\.js/);
  assert.doesNotMatch(
    facade,
    /fitOrderPdfSketchTextBoxRect|createOrderPdfSketchTextBoxPointerInteraction|areOrderPdfSketchTextBoxesEqual/,
    'facade must not own text box geometry, interaction, or equality internals'
  );

  for (const needle of [
    'ORDER_PDF_SKETCH_TEXT_BOX_MIN_WIDTH',
    'ORDER_PDF_SKETCH_TEXT_BOX_HANDLE_DIRECTIONS',
    'export type OrderPdfSketchTextBoxInteraction',
  ]) {
    assert.match(types, new RegExp(needle), `types owner must contain ${needle}`);
  }
  assert.doesNotMatch(types, /fitOrderPdfSketchTextBoxRect|areOrderPdfSketchTextBoxesEqual/);

  for (const needle of [
    'fitOrderPdfSketchTextBoxRect',
    'buildOrderPdfSketchTextBoxCreateRect',
    'shouldCreateOrderPdfSketchTextBoxFromPointerDrag',
  ]) {
    assert.match(geometry, new RegExp(needle), `geometry owner must contain ${needle}`);
  }
  assert.doesNotMatch(
    geometry,
    /createOrderPdfSketchTextBoxPointerInteraction|areOrderPdfSketchTextBoxesEqual/
  );

  for (const needle of [
    'createOrderPdfSketchTextBoxMoveInteraction',
    'createOrderPdfSketchTextBoxResizeInteraction',
    'isOrderPdfSketchTextBoxResizeDirection',
    'createOrderPdfSketchTextBoxPointerInteraction',
    'applyOrderPdfSketchTextBoxInteraction',
  ]) {
    assert.match(interaction, new RegExp(needle), `interaction owner must contain ${needle}`);
  }
  assert.doesNotMatch(
    interaction,
    /areOrderPdfSketchTextBoxesEqual|shouldCreateOrderPdfSketchTextBoxFromPointerDrag/
  );

  for (const needle of [
    'areOrderPdfSketchTextBoxesEqual',
    'shouldUpsertOrderPdfSketchTextBox',
    'isOrderPdfSketchTextEmpty',
  ]) {
    assert.match(equality, new RegExp(needle), `equality owner must contain ${needle}`);
  }
  assert.doesNotMatch(equality, /fitOrderPdfSketchTextBoxRect|applyOrderPdfSketchTextBoxInteraction/);

  assert.match(consumerSurface, /from '\.\/order_pdf_overlay_sketch_text_box_runtime\.js';/);
  assert.doesNotMatch(
    consumerSurface,
    /order_pdf_overlay_sketch_text_box_runtime_(types|geometry|interaction|equality)\.js/,
    'text-box consumers must keep using the public runtime facade'
  );

  assert.doesNotMatch(facade + types + geometry + interaction + equality, /export default\s+/);
});
