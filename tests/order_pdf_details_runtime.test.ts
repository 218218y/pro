import test from 'node:test';
import assert from 'node:assert/strict';

import {
  coerceOrderPdfTextValue,
  hasOrderPdfTextValue,
  joinOrderPdfAutoAndManualDetails,
  resolveOrderPdfDetailsText,
  resolveOrderPdfDetailsTextFromDraft,
} from '../esm/native/ui/pdf/order_pdf_details_runtime.js';

test('order pdf details runtime coerces and detects text values consistently', () => {
  assert.equal(coerceOrderPdfTextValue(null, 'fallback'), 'fallback');
  assert.equal(coerceOrderPdfTextValue(17), '17');
  assert.equal(hasOrderPdfTextValue('   '), false);
  assert.equal(hasOrderPdfTextValue(' note '), true);
});

test('order pdf details runtime joins auto and manual blocks with one blank separator', () => {
  assert.equal(joinOrderPdfAutoAndManualDetails('auto', ''), 'auto');
  assert.equal(joinOrderPdfAutoAndManualDetails('', 'manual'), 'manual');
  assert.equal(joinOrderPdfAutoAndManualDetails('auto', 'manual'), 'auto\n\nmanual');
  assert.equal(joinOrderPdfAutoAndManualDetails('auto\n', 'manual'), 'auto\n\nmanual');
});

test('order pdf details runtime treats manualEnabled as part of full-details touched semantics', () => {
  assert.equal(
    resolveOrderPdfDetailsText({
      autoDetails: 'auto details',
      manualDetails: 'manual details',
      detailsFull: true,
      detailsTouched: false,
      manualEnabled: true,
    }),
    'manual details'
  );

  assert.equal(
    resolveOrderPdfDetailsText({
      autoDetails: 'auto details',
      manualDetails: 'manual tail',
      detailsFull: false,
      detailsTouched: false,
      manualEnabled: false,
    }),
    'auto details\n\nmanual tail'
  );
});

test('order pdf details runtime resolves from draft shapes without requiring full draft ownership', () => {
  assert.equal(
    resolveOrderPdfDetailsTextFromDraft({
      autoDetails: 'auto details',
      manualDetails: 'manual details',
      detailsFull: true,
      detailsTouched: true,
      manualEnabled: false,
    }),
    'manual details'
  );

  assert.equal(
    resolveOrderPdfDetailsTextFromDraft(
      {
        autoDetails: 'stale auto',
        manualDetails: '',
        detailsFull: true,
        detailsTouched: false,
        manualEnabled: false,
      },
      'fresh auto'
    ),
    'fresh auto'
  );
});
