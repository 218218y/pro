import test from 'node:test';
import assert from 'node:assert/strict';

import { readNoteCardDerived } from '../esm/native/ui/react/notes/notes_overlay_note_card_shared.js';
import { sanitizeRichTextHTMLWithDocument } from '../esm/native/ui/notes_service_sanitize.js';

test('notes render boundary sanitizes note html again before React innerHTML consumers', () => {
  const derived = readNoteCardDerived({
    doc: null,
    note: {
      text: '<img src=x onerror="boom()"><b>safe</b><script>alert(1)</script>',
      style: { baseTextColor: '#111111', baseFontSize: '4' },
    },
    editMode: false,
    activeIndex: null,
    index: 0,
  });

  assert.equal(derived.noteHtml, 'safealert(1)');
  assert.equal(derived.hasText, true);
  assert.doesNotMatch(derived.noteHtml, /<|>|onerror|script|img/i);
});

test('notes render boundary uses the same sanitizer seam as note normalization', () => {
  const unsafe = '<font size="9" color="javascript:bad" onclick="boom()">x</font><style>y</style>';
  const expected = sanitizeRichTextHTMLWithDocument(null, unsafe);
  const derived = readNoteCardDerived({
    doc: null,
    note: { text: unsafe, style: {} },
    editMode: true,
    activeIndex: 7,
    index: 7,
  });

  assert.equal(derived.noteHtml, expected);
  assert.equal(derived.isActive, true);
  assert.doesNotMatch(derived.noteHtml, /onclick|javascript:|<font|<style/i);
});
