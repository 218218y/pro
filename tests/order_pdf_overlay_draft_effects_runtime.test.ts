import test from 'node:test';
import assert from 'node:assert/strict';

import { buildOrderPdfDraftFromUiRecord } from '../esm/native/ui/react/pdf/order_pdf_overlay_draft_effects.ts';
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

test('order pdf draft effects preserves a canonical edited details pair', () => {
  const detailsDirtyRef = { current: false };
  const reports: string[] = [];

  const draft = buildOrderPdfDraftFromUiRecord({
    rec: {
      autoDetails: 'Auto line',
      detailsText: 'edited details',
      detailsHtml: '<div>ידית שחורה</div><div>קומה 3</div>',
      detailsTouched: true,
    },
    detailsDirtyRef,
    textApi,
    reportNonFatal: op => reports.push(op),
  });

  assert.equal(draft.detailsText.startsWith('Auto line'), false);
  assert.equal(draft.detailsSeed, 'Auto line');
  assert.equal(draft.detailsTouched, true);
  assert.equal(detailsDirtyRef.current, true);
  assert.deepEqual(reports, []);
});

test('order pdf draft effects derives the seed from canonical text when auto details are empty', () => {
  const detailsDirtyRef = { current: false };
  const reports: string[] = [];

  const draft = buildOrderPdfDraftFromUiRecord({
    rec: {
      autoDetails: '',
      detailsText: 'edited details',
      detailsHtml: '<div>שורת הערה</div><div>חזית לבנה</div>',
      detailsTouched: true,
    },
    detailsDirtyRef,
    textApi,
    reportNonFatal: op => reports.push(op),
  });

  assert.equal(draft.detailsText, 'edited details');
  assert.equal(draft.detailsSeed, 'edited details');
  assert.equal(draft.detailsTouched, true);
  assert.equal(detailsDirtyRef.current, true);
  assert.deepEqual(reports, []);
});
