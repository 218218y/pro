import test from 'node:test';
import assert from 'node:assert/strict';

async function loadMerge() {
  return import('../dist/esm/native/ui/react/pdf/order_pdf_overlay_text_details_merge.js');
}

test('mergeAutoDetailsWithInlineManual preserves detail suffixes through anchor-based merge without regressing the canonical merge result', async () => {
  const { mergeAutoDetailsWithInlineManual } = await loadMerge();
  const base = 'צבע: לבן\nידיות: שחור';
  const prevText = `כותרת\nצבע: לבן מט\nידיות: שחור\nסוף`;
  const newAuto = 'צבע: שמנת\nידיות: שחור';

  const result = mergeAutoDetailsWithInlineManual({
    prevText,
    prevHtml: '',
    doc: null,
    prevAuto: base,
    prevSeed: '',
    newAuto,
  });

  assert.equal(result.kind, 'none');
  assert.match(result.keepText, /צבע: שמנת מט/);
  assert.match(result.cleanText, /צבע: שמנת/);
  assert.match(result.cleanText, /צבע: שמנת מט/);
  assert.equal(result.preview, '');
});

test('mergeAutoDetailsWithInlineManual returns ambiguous when no markers or anchors can resolve the auto region', async () => {
  const { mergeAutoDetailsWithInlineManual } = await loadMerge();

  const result = mergeAutoDetailsWithInlineManual({
    prevText: 'טקסט מותאם אישית שאין לו עוגנים בכלל',
    prevHtml: '',
    doc: null,
    prevAuto: 'צבע: לבן\nידיות: שחור',
    prevSeed: '',
    newAuto: 'צבע: שמנת\nידיות: שחור',
  });

  assert.equal(result.kind, 'ambiguous');
  assert.equal(result.cleanText, 'צבע: שמנת\nידיות: שחור');
  assert.equal(result.keepText, 'טקסט מותאם אישית שאין לו עוגנים בכלל');
});
