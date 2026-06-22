import test from 'node:test';
import assert from 'node:assert/strict';

import {
  coerceOrderPdfTextValue,
  hasOrderPdfTextValue,
  resolveOrderPdfDetailsText,
  resolveOrderPdfDetailsTextFromDraft,
} from '../esm/native/ui/pdf/order_pdf_details_runtime.js';

test('order pdf details runtime coerces and detects text values consistently', () => {
  assert.equal(coerceOrderPdfTextValue(null, 'fallback'), 'fallback');
  assert.equal(coerceOrderPdfTextValue(17), '17');
  assert.equal(hasOrderPdfTextValue('   '), false);
  assert.equal(hasOrderPdfTextValue(' note '), true);
});

test('order pdf details runtime selects the canonical full details text only after editing', () => {
  assert.equal(
    resolveOrderPdfDetailsText({
      autoDetails: 'auto details',
      detailsText: 'edited details',
      detailsTouched: true,
    }),
    'edited details'
  );

  assert.equal(
    resolveOrderPdfDetailsText({
      autoDetails: 'auto details',
      detailsText: 'stale details',
      detailsTouched: false,
    }),
    'auto details'
  );
});

test('order pdf details runtime resolves from draft shapes without requiring full draft ownership', () => {
  assert.equal(
    resolveOrderPdfDetailsTextFromDraft({
      autoDetails: 'auto details',
      detailsText: 'edited details',
      detailsTouched: true,
    }),
    'edited details'
  );

  assert.equal(
    resolveOrderPdfDetailsTextFromDraft(
      {
        autoDetails: 'stale auto',
        detailsText: '',
        detailsTouched: false,
      },
      'fresh auto'
    ),
    'fresh auto'
  );
});
