import test from 'node:test';
import assert from 'node:assert/strict';

import {
  areOrderPdfDraftRecordsEqual,
  patchOrderPdfDraftScalarFieldValue,
  readOrderPdfDraftRecord,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_draft_record_runtime.ts';
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

test('order pdf overlay draft-record runtime reads canonical draft fields with default-on sketch flags', () => {
  const detailsDirtyRef = { current: false };
  const draft = readOrderPdfDraftRecord({
    rec: {
      autoDetails: 'Auto block',
      manualDetailsHtml: '<div>הערה ידנית</div>',
      detailsFull: true,
      detailsTouched: true,
      notesHtml: '<div>הערה</div>',
    },
    detailsDirtyRef,
    textApi,
    reportNonFatal: () => undefined,
  });

  assert.equal(draft.manualDetails, 'הערה ידנית\n');
  assert.equal(draft.manualEnabled, true);
  assert.equal(draft.notes, 'הערה\n');
  assert.equal(draft.includeRenderSketch, true);
  assert.equal(draft.includeOpenClosed, true);
  assert.equal(detailsDirtyRef.current, true);
});

test('order pdf overlay draft-record runtime preserves undefined sketch flags for export-facing reads', () => {
  const draft = readOrderPdfDraftRecord({
    rec: {
      autoDetails: 'Auto block',
      notes: 'plain',
    },
    detailsDirtyRef: { current: false },
    textApi,
    reportNonFatal: () => undefined,
    preserveUndefinedFlags: true,
  });

  assert.equal(draft.includeRenderSketch, undefined);
  assert.equal(draft.includeOpenClosed, undefined);
});

test('order pdf overlay draft-record runtime equality treats cloned canonical drafts as equal', () => {
  const a = readOrderPdfDraftRecord({
    rec: {
      projectName: 'Alpha',
      notesHtml: '<div>א</div><div>ב</div>',
      sketchAnnotations: {
        renderSketch: {
          strokes: [{ tool: 'pen', color: '#111111', width: 2, points: [{ x: 1, y: 2 }] }],
        },
      },
    },
    detailsDirtyRef: { current: false },
    textApi,
    reportNonFatal: () => undefined,
  });
  const b = { ...a };

  assert.equal(areOrderPdfDraftRecordsEqual(a, b), true);
  assert.equal(areOrderPdfDraftRecordsEqual(a, { ...b, projectName: 'Beta' }), false);
});

test('order pdf overlay draft-record runtime preserves reference on scalar no-op patch', () => {
  const draft = readOrderPdfDraftRecord({
    rec: {
      projectName: 'Alpha',
      orderNumber: '100',
    },
    detailsDirtyRef: { current: false },
    textApi,
    reportNonFatal: () => undefined,
  });

  const unchanged = patchOrderPdfDraftScalarFieldValue({
    draft,
    key: 'projectName',
    value: 'Alpha',
  });
  const changed = patchOrderPdfDraftScalarFieldValue({
    draft,
    key: 'projectName',
    value: 'Beta',
  });

  assert.equal(unchanged, draft);
  assert.notEqual(changed, draft);
  assert.equal(changed.projectName, 'Beta');
});
