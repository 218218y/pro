import test from 'node:test';
import assert from 'node:assert/strict';
import { readFirstExisting } from './_read_src.js';

const hookSrc = readFirstExisting(
  ['../esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_active_hooks.ts'],
  import.meta.url
);
const noteBoxSrc = readFirstExisting(
  ['../esm/native/ui/react/pdf/order_pdf_overlay_sketch_note_box.tsx'],
  import.meta.url
);
const css = readFirstExisting(['../css/react_styles.css'], import.meta.url);

test('pdf sketch existing text notes open for editing directly from the preview hit area', () => {
  assert.match(noteBoxSrc, /role="button"/);
  assert.match(noteBoxSrc, /tabIndex=\{0\}/);
  assert.ok(!/if \(!textMode\) return;[\s\S]*?onActivate\(textBox\.id\)/.test(noteBoxSrc));
  assert.match(hookSrc, /onEnterTextMode\(\);[\s\S]*?setActiveTextBoxId\(id\);/);
  assert.match(css, /body\.wp-ui-react \.annotation-box \.note-hit \{[^}]*display:\s*inline-block;/s);
  assert.ok(!css.includes('body.wp-ui-react .annotation-box .note-hit {\n  width: 100%;'));
  assert.ok(!css.includes('body.wp-ui-react .annotation-box .note-hit {\n  height: 100%;'));
});
