import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PDFDocument, TextAlignment, defaultTextFieldAppearanceProvider, showText } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

import { createOrderPdfWidgetAppearance } from '../esm/native/ui/export/export_order_pdf_field_appearance.ts';
import { visualOrderForPdfFieldAppearance } from '../esm/native/ui/export/export_order_pdf_field_bidi.ts';
import { createOrderPdfTextBidiOps } from '../esm/native/ui/export/export_order_pdf_text_bidi.ts';

// The PDF renderer paints each /AP Tj separately (without pair kerning). A
// right-aligned /AP must measure precisely those visible glyphs, not /V's
// invisible LRM/RLM controls. Otherwise each line ends at a different x.
test('RTL multiline PDF /AP: painted right edges align despite differing bidi controls', async () => {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fs.readFileSync('public/fonts/Arimo-Regular.ttf'), { subset: false });
  const page = pdf.addPage([500, 400]);
  const field = pdf.getForm().createTextField('order_details');
  field.enableMultiline();
  field.setAlignment(TextAlignment.Right);
  field.addToPage(page, { x: 20, y: 20, width: 450, height: 300, font, fontSize: 12, borderWidth: 0 });
  field.setFontSize(12);

  const lines = [
    'סוג: פתיחה',
    "דלתות: 4, סנדביץ', פוסט",
    'מידות (ס"מ): 160×240×55',
    'חלוקת גוף: 80-80',
    'צבע 759',
    'ידיות רוכבת שחור קצר',
    'מחיר 3200 שח',
  ];
  field.setText(createOrderPdfTextBidiOps().fixBidiForAcrobatText(lines.join('\n')));
  const widget = field.acroField.getWidgets()[0];
  assert.ok(widget);
  const ops = createOrderPdfWidgetAppearance(field, widget, font, {
    defaultTextFieldAppearanceProvider,
    showText,
  });

  const starts = ops.filter(op => op.name === 'Tm').map(op => Number(String(op.args?.[4])));
  assert.equal(starts.length, lines.length, 'layout must retain the original seven lines');
  const savedLines = (field.getText() || '').split('\n');
  for (const [index, saved] of savedLines.entries()) {
    const visual = visualOrderForPdfFieldAppearance(saved);
    const paintedWidth = Array.from(visual).reduce((width, glyph) => {
      return width + font.widthOfTextAtSize(glyph, 12);
    }, 0);
    // Widget local coordinates: width 450, 1pt PDF-lib padding.
    assert.ok(
      Math.abs(starts[index]! + paintedWidth - 449) < 0.03,
      `line ${index + 1} has shifted its painted right edge: ${starts[index]! + paintedWidth}`
    );
  }

  assert.ok(
    (field.getText() || '').includes('\u200e'),
    'the editable /V must keep its bidi controls for Acrobat'
  );
});

test('wrapped RTL PDF /AP lines keep the same painted right edge without changing /V', async () => {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fs.readFileSync('public/fonts/Arimo-Regular.ttf'), { subset: false });
  const page = pdf.addPage([340, 400]);
  const field = pdf.getForm().createTextField('order_details');
  field.enableMultiline();
  field.setAlignment(TextAlignment.Right);
  field.addToPage(page, { x: 20, y: 20, width: 300, height: 350, font, fontSize: 12, borderWidth: 0 });
  field.setFontSize(12);
  const logical = Array.from({ length: 4 }, () => 'מידות 160×240×55, דלתות 4, סנדביץ, מחיר 3200 שח').join(
    ' '
  );
  const editable = createOrderPdfTextBidiOps().fixBidiForAcrobatText(logical);
  field.setText(editable);

  const glyphsByEncoding = new Map(
    Array.from(new Set(Array.from(editable)))
      .filter(ch => ch !== '\n')
      .map(ch => [String(font.encodeText(ch)), ch])
  );
  const widget = field.acroField.getWidgets()[0];
  assert.ok(widget);
  const ops = createOrderPdfWidgetAppearance(field, widget, font, {
    defaultTextFieldAppearanceProvider,
    showText,
  });

  const painted: Array<{ x: number; width: number }> = [];
  for (const op of ops) {
    if (op.name === 'Tm') {
      painted.push({ x: Number(String(op.args?.[4])), width: 0 });
    } else if (op.name === 'Tj') {
      const glyph = glyphsByEncoding.get(String(op.args?.[0]));
      assert.notEqual(glyph, undefined, 'all emitted glyphs must come from the original editable text');
      assert.ok(painted.length > 0, 'text show must follow a text matrix');
      painted.at(-1)!.width += font.widthOfTextAtSize(glyph!, 12);
    }
  }
  assert.ok(painted.length >= 4, `expected text wrapping, found ${painted.length} lines`);
  for (const [index, { x, width }] of painted.entries()) {
    assert.ok(
      Math.abs(x + width - 299) < 0.03,
      `wrapped line ${index + 1} painted to ${x + width} instead of 299`
    );
  }
  assert.equal(
    field.getText(),
    editable,
    'editable original value must not be modified by appearance painting'
  );
});
