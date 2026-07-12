const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('order pdf interaction domain stays aligned to shared lean-friendly event contracts', () => {
  const raw = read('esm/native/ui/react/pdf/order_pdf_overlay_controller_domain_interaction.ts');
  assert.match(raw, /InputChangeEventLike/);
  assert.match(raw, /DragEventLike/);
  assert.match(raw, /StagePointerEventLike/);
  assert.doesNotMatch(raw, /from 'react'/);
});

test('order pdf sketch hooks use DOM event types for window and document listeners', () => {
  const hooks = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_history_hooks.ts');
  const card = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_card.tsx');
  const cardTextLayer = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_hooks.ts');
  const pointerSessionHooks = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_session_hooks.ts'
  );
  const pointerInteractionSessionHooks = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_pointer_interaction_session_hooks.ts'
  );
  assert.match(hooks, /\(event: KeyboardEvent\)/);
  assert.ok(
    /\(event: PointerEvent\)/.test(card) ||
      /\(event: PointerEvent\)/.test(cardTextLayer) ||
      /\(event: PointerEvent\)/.test(pointerSessionHooks) ||
      /\(event: PointerEvent\)/.test(pointerInteractionSessionHooks)
  );
  assert.doesNotMatch(hooks, /import type \{[^}]*KeyboardEvent[^}]*\} from 'react'/);
  assert.doesNotMatch(pointerInteractionSessionHooks, /import type \{[^}]*PointerEvent[^}]*\} from 'react'/);
});

test('lean pdf shim stays outside shared type roots', () => {
  const raw = read('lean_types/pdf_lib_shim.d.ts');
  assert.match(raw, /declare module 'pdf-lib'/);
  assert.equal(fs.existsSync(path.join(ROOT, 'types', 'pdf_lib_shim.d.ts')), false);
});
