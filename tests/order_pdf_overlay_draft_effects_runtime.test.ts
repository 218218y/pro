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

test('order pdf draft effects derives manual text from legacy manual HTML when detailsFull is false', () => {
  const detailsDirtyRef = { current: false };
  const reports: string[] = [];

  const draft = buildOrderPdfDraftFromUiRecord({
    rec: {
      autoDetails: 'Auto line',
      manualDetails: '',
      manualDetailsHtml: '<div>ידית שחורה</div><div>קומה 3</div>',
      detailsFull: false,
      detailsTouched: false,
      manualEnabled: false,
    },
    detailsDirtyRef,
    textApi,
    reportNonFatal: op => reports.push(op),
  });

  assert.equal(draft.manualDetails, 'Auto line\n\nידית שחורה\nקומה 3\n');
  assert.equal(draft.detailsSeed, 'Auto line\n\nידית שחורה\nקומה 3\n');
  assert.equal(draft.detailsTouched, true);
  assert.equal(draft.manualEnabled, true);
  assert.equal(detailsDirtyRef.current, true);
  assert.deepEqual(reports, []);
});

test('order pdf draft effects derives text/seed from legacy manual HTML when detailsFull is already true', () => {
  const detailsDirtyRef = { current: false };
  const reports: string[] = [];

  const draft = buildOrderPdfDraftFromUiRecord({
    rec: {
      autoDetails: '',
      manualDetails: '',
      manualDetailsHtml: '<div>שורת הערה</div><div>חזית לבנה</div>',
      detailsFull: true,
      detailsTouched: true,
      manualEnabled: false,
    },
    detailsDirtyRef,
    textApi,
    reportNonFatal: op => reports.push(op),
  });

  assert.equal(draft.manualDetails, 'שורת הערה\nחזית לבנה\n');
  assert.equal(draft.detailsSeed, 'שורת הערה\nחזית לבנה\n');
  assert.equal(draft.detailsTouched, true);
  assert.equal(draft.manualEnabled, true);
  assert.equal(detailsDirtyRef.current, true);
  assert.deepEqual(reports, []);
});
