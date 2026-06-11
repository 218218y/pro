import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 61 order pdf card text layer ownership split is anchored', () => {
  const facade = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_hooks.ts');
  const types = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_hooks_types.ts');
  const editor = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_editor_hooks.ts');
  const palette = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_palette_hooks.ts');
  const active = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_active_hooks.ts');
  const hook = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_hooks_hook.ts');
  const consumer = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_card.tsx');

  assert.ok(lineCount(facade) <= 4, 'card text layer facade must stay tiny');
  assert.match(facade, /order_pdf_overlay_sketch_card_text_layer_hooks_types\.js/);
  assert.match(facade, /order_pdf_overlay_sketch_card_text_layer_hooks_hook\.js/);
  assert.doesNotMatch(
    facade,
    /useState|useEffect|useMemo|useCallback|readOrderPdfSketchEditorTextValue|resolveOrderPdfSketchRenderedTextBoxes/,
    'facade must not own text-layer hook orchestration or editor runtime work'
  );

  assert.match(types, /export type OrderPdfSketchCardTextLayerArgs/);
  assert.match(types, /export type OrderPdfSketchCardTextLayerResult/);
  assert.match(types, /PointerEvent as ReactPointerEvent/);
  assert.doesNotMatch(types, /useState|useEffect|useMemo|useCallback/);

  assert.match(editor, /export function useOrderPdfSketchCardTextLayerEditor/);
  assert.match(editor, /readOrderPdfSketchEditorTextValue/);
  assert.match(editor, /getNodeWindow/);
  assert.match(editor, /selection\.addRange/);
  assert.doesNotMatch(
    editor,
    /useOrderPdfSketchCardTextLayerInteractions|resolveOrderPdfSketchRenderedTextBoxes/
  );

  assert.match(palette, /export function useOrderPdfSketchCardTextLayerPaletteState/);
  assert.match(palette, /setColorPaletteOpen\(false\)/);
  assert.match(palette, /setSizePaletteOpen\(false\)/);
  assert.match(palette, /textBoxes\.some\(textBox => textBox\.id === activeTextBoxId\)/);
  assert.doesNotMatch(palette, /readOrderPdfSketchEditorTextValue|persistLiveTextBox/);

  assert.match(active, /export function useOrderPdfSketchRenderedTextLayerBoxes/);
  assert.match(active, /export function useOrderPdfSketchActiveTextLayerControls/);
  assert.match(active, /resolveOrderPdfSketchRenderedTextBoxes/);
  assert.match(active, /onEnterTextMode\(\);[\s\S]*?setActiveTextBoxId\(id\);/);
  assert.match(active, /persistLiveTextBox\(next, false\)/);
  assert.doesNotMatch(active, /getNodeWindow|readOrderPdfSketchEditorTextValue/);

  assert.match(hook, /useOrderPdfSketchCardTextLayerEditor/);
  assert.match(hook, /useOrderPdfSketchCardTextLayerPaletteState/);
  assert.match(hook, /useOrderPdfSketchCardTextLayerInteractions/);
  assert.match(hook, /useOrderPdfSketchRenderedTextLayerBoxes/);
  assert.match(hook, /useOrderPdfSketchActiveTextLayerControls/);
  assert.doesNotMatch(
    hook,
    /readOrderPdfSketchEditorTextValue|getNodeWindow|resolveOrderPdfSketchRenderedTextBoxes/
  );

  assert.match(consumer, /from '\.\/order_pdf_overlay_sketch_card_text_layer_hooks\.js';/);
  assert.doesNotMatch(
    consumer,
    /order_pdf_overlay_sketch_card_text_layer_hooks_(types|hook)|order_pdf_overlay_sketch_card_text_layer_(editor|palette|active)_hooks\.js/,
    'card consumers must keep using the public text-layer facade'
  );

  assert.doesNotMatch(facade + types + editor + palette + active + hook, /export default\s+/);
});
