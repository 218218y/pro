import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readOrderPdfRichEditorSnapshotFromDraft,
  syncOrderPdfDraftFromRichEditorValues,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_rich_editor_runtime.ts';
import {
  buildDetailsHtmlWithMarkers,
  htmlToTextPreserveNewlines,
  makeEmptyDraft,
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

test('order pdf rich-editor snapshot resolves details and html-only notes through one canonical runtime', () => {
  const snapshot = readOrderPdfRichEditorSnapshotFromDraft({
    draft: {
      ...makeEmptyDraft(),
      autoDetails: 'פרט א',
      detailsText: 'פרט א',
      detailsHtml: '',
      notes: '',
      notesHtml: '<div>שורה א<br>שורה ב</div>',
    },
    textApi,
  });

  assert.equal(snapshot.detailsHtml, 'פרט א');
  assert.equal(snapshot.notesHtml, '<div>שורה א<br>שורה ב</div>');
});

test('order pdf rich-editor sync preserves reference on no-op editor snapshots', () => {
  const draft = {
    ...makeEmptyDraft(),
    autoDetails: 'אותו טקסט',
    detailsText: 'אותו טקסט',
    detailsHtml: 'אותו טקסט',
    detailsSeed: 'אותו טקסט',
    notes: 'הערה',
    notesHtml: 'הערה',
  };

  const next = syncOrderPdfDraftFromRichEditorValues({
    draft,
    details: { text: 'אותו טקסט', html: 'אותו טקסט' },
    notes: { text: 'הערה', html: 'הערה' },
    detailsDirty: false,
    textApi,
  });

  assert.equal(next, null);
});

test('order pdf rich-editor sync updates only the changed rich-editor fields', () => {
  const draft = {
    ...makeEmptyDraft(),
    autoDetails: 'פרט מובנה',
    detailsText: 'פרט מובנה',
    detailsHtml: 'פרט מובנה',
    detailsSeed: 'פרט מובנה',
    notes: 'הערה ישנה',
    notesHtml: 'הערה ישנה',
  };

  const next = syncOrderPdfDraftFromRichEditorValues({
    draft,
    details: { text: 'פרט ידני חדש', html: '<div>פרט ידני חדש</div>' },
    notes: { text: 'הערה ישנה', html: 'הערה ישנה' },
    detailsDirty: true,
    textApi,
  });

  assert.ok(next);
  assert.notEqual(next, draft);
  assert.equal(next?.detailsText, 'פרט ידני חדש');
  assert.equal(next?.detailsHtml, '<div>פרט ידני חדש</div>');
  assert.equal(next?.detailsTouched, true);
  assert.equal(next?.notes, 'הערה ישנה');
  assert.equal(next?.notesHtml, 'הערה ישנה');
});
