import test from 'node:test';
import assert from 'node:assert/strict';
import { visualOrderForPdfFieldAppearance } from '../esm/native/ui/export/export_order_pdf_field_bidi.ts';

test('AcroForm vector appearance: reorder RTL letters without reversing Latin/number runs', () => {
  const expected = new Map([
    ['ביפוס יהודה וחני', 'ינחו הדוהי סופיב'],
    ['חני 0548414850', '0548414850 ינח'],
    ['מידות (ס"מ): 160×240×55', '55×240×160 :)מ"ס( תודימ'],
    ['הובלה 400', '400 הלבוה'],
    ['בדיקת PDF', 'PDF תקידב'],
    ['03-5555555', '03-5555555'],
    ['2026-03-26', '2026-03-26'],
    ['Arimo 160', 'Arimo 160'],
  ]);
  for (const [logical, visual] of expected) {
    assert.equal(visualOrderForPdfFieldAppearance(logical), visual, logical);
  }
});

test('AcroForm vector appearance: bidi controls are paint-only, multiline layout is preserved', () => {
  const formatted = "\u200fסוג: פתיחה\nדלתות: \u200e4\u200e, סנדביץ'\nמידות 160×240×55";
  const result = visualOrderForPdfFieldAppearance(formatted);
  assert.equal(result.split('\n').length, 3);
  assert.ok(result.includes('החיתפ :גוס'));
  assert.ok(result.includes('55×240×160'));
  assert.doesNotMatch(result, /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/u);
});
