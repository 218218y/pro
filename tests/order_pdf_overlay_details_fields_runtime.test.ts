import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOrderPdfDetailsFieldsFromUiRecord,
  createOrderPdfInitialDetailsFields,
  resolveOrderPdfRichTextHtml,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_details_fields_runtime.ts';
import {
  buildDetailsHtmlWithMarkers,
  htmlToTextPreserveNewlines,
  normalizeForCompare,
  safeStr,
  textToHtml,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_text.ts';

const textApi = {
  safeStr,
  textToHtml,
  htmlToTextPreserveNewlines,
  buildDetailsHtmlWithMarkers,
  normalizeForCompare,
};

test('order pdf details fields runtime collapses an edited marker when stored text matches auto details', () => {
  const result = createOrderPdfInitialDetailsFields({
    autoDetails: 'Auto line',
    detailsText: 'Auto line',
    detailsHtml: '',
    detailsTouched: true,
    textApi,
  });

  assert.equal(result.fields.detailsText, 'Auto line');
  assert.equal(result.fields.detailsTouched, false);
  assert.equal(result.detailsDirty, false);
});

test('order pdf details fields runtime collapses stale touched drift when ui record matches auto details', () => {
  const detailsDirtyRef = { current: true };
  const reports: string[] = [];

  const fields = buildOrderPdfDetailsFieldsFromUiRecord({
    rec: {
      autoDetails: 'Auto line',
      detailsText: 'Auto line',
      detailsHtml: '<div>Auto line</div>',
      detailsTouched: false,
    },
    detailsDirtyRef,
    textApi,
    reportNonFatal: op => reports.push(op),
  });

  assert.equal(fields.detailsText, 'Auto line');
  assert.equal(fields.detailsTouched, false);
  assert.equal(detailsDirtyRef.current, false);
  assert.equal(fields.detailsHtml, '<div>Auto line</div>');
  assert.deepEqual(reports, []);
});

test('order pdf details fields runtime preserves canonical rich details when touched', () => {
  const detailsDirtyRef = { current: false };
  const reports: string[] = [];

  const fields = buildOrderPdfDetailsFieldsFromUiRecord({
    rec: {
      autoDetails: 'Auto line',
      detailsText: 'Edited line\nSecond line\n',
      detailsHtml: '<div>Edited line</div><div>Second line</div>',
      detailsTouched: true,
    },
    detailsDirtyRef,
    textApi,
    reportNonFatal: op => reports.push(op),
  });

  assert.equal(fields.detailsText, 'Edited line\nSecond line\n');
  assert.equal(fields.detailsHtml, '<div>Edited line</div><div>Second line</div>');
  assert.equal(fields.detailsTouched, true);
  assert.equal(detailsDirtyRef.current, true);
  assert.deepEqual(reports, []);
});

test('order pdf details fields runtime reuses explicit rich html and falls back to text html only when needed', () => {
  assert.equal(
    resolveOrderPdfRichTextHtml({
      text: 'Plain\nText',
      html: '<div>Rich</div>',
      textApi: { safeStr, textToHtml },
    }),
    '<div>Rich</div>'
  );

  assert.equal(
    resolveOrderPdfRichTextHtml({
      text: 'Plain\nText',
      html: '',
      textApi: { safeStr, textToHtml },
    }),
    'Plain<br>Text'
  );
});

test('order pdf details fields runtime sanitizes explicit rich html before reuse', () => {
  assert.equal(
    resolveOrderPdfRichTextHtml({
      text: 'Plain',
      html: '<div onclick="boom()"><span data-wp-auto="start" contenteditable="false"></span><script>alert(1)</script>Rich</div>',
      textApi: { safeStr, textToHtml },
    }),
    '<div><span data-wp-auto="start" contenteditable="false"></span>alert(1)Rich</div>'
  );
});
