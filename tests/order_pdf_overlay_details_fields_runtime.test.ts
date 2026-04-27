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

test('order pdf details fields runtime collapses initial manualEnabled when manual text matches auto details', () => {
  const result = createOrderPdfInitialDetailsFields({
    autoDetails: 'Auto line',
    manualDetails: 'Auto line',
    manualDetailsHtml: '',
    manualEnabled: true,
    textApi,
  });

  assert.equal(result.fields.manualDetails, 'Auto line');
  assert.equal(result.fields.detailsTouched, false);
  assert.equal(result.fields.manualEnabled, false);
  assert.equal(result.detailsDirty, false);
});

test('order pdf details fields runtime collapses stale manualEnabled/manual html drift when ui record already matches auto details', () => {
  const detailsDirtyRef = { current: true };
  const reports: string[] = [];

  const fields = buildOrderPdfDetailsFieldsFromUiRecord({
    rec: {
      autoDetails: 'Auto line',
      manualDetails: 'Auto line',
      manualDetailsHtml: '<div>Auto line</div>',
      detailsFull: true,
      detailsTouched: false,
      manualEnabled: true,
    },
    detailsDirtyRef,
    textApi,
    reportNonFatal: op => reports.push(op),
  });

  assert.equal(fields.manualDetails, 'Auto line');
  assert.equal(fields.detailsTouched, false);
  assert.equal(fields.manualEnabled, false);
  assert.equal(detailsDirtyRef.current, false);
  assert.equal(fields.manualDetailsHtml, '<div>Auto line</div>');
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
