import test from 'node:test';
import assert from 'node:assert/strict';

import { createOrderPdfInitialDraft } from '../esm/native/ui/react/pdf/order_pdf_overlay_draft_state.ts';
import { buildOrderPdfDraftFromUiRecord } from '../esm/native/ui/react/pdf/order_pdf_overlay_draft_effects.ts';
import { createOrderPdfNotesFields } from '../esm/native/ui/react/pdf/order_pdf_overlay_notes_fields_runtime.ts';
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

test('order pdf notes fields runtime derives plain text from legacy html-only notes and preserves explicit html', () => {
  const fields = createOrderPdfNotesFields({
    notes: '',
    notesHtml: '<div>הערה אחת</div><div>הערה שתיים</div>',
    textApi,
  });

  assert.equal(fields.notes, 'הערה אחת\nהערה שתיים\n');
  assert.equal(fields.notesHtml, '<div>הערה אחת</div><div>הערה שתיים</div>');
});

test('order pdf notes fields runtime drops blank ghost html when the editor text is empty', () => {
  const fields = createOrderPdfNotesFields({
    notes: '   ',
    notesHtml: '<div><br></div>',
    textApi,
  });

  assert.equal(fields.notes, '   ');
  assert.equal(fields.notesHtml, '');
});

test('order pdf initial draft seeds canonical notes html from plain notes when html is missing', () => {
  const { draft } = createOrderPdfInitialDraft({
    projectName: 'פרויקט',
    orderNumber: '100',
    orderDate: '2026-04-12',
    deliveryAddress: '',
    phone: '',
    mobile: '',
    autoDetails: 'פרטי הזמנה',
    manualDetails: '',
    manualDetailsHtml: '',
    manualEnabled: false,
    notes: 'שורה א\nשורה ב',
    notesHtml: '',
  });

  assert.equal(draft.notes, 'שורה א\nשורה ב');
  assert.equal(draft.notesHtml, 'שורה א<br>שורה ב');
});

test('order pdf draft effects hydrate canonical notes text/html from ui records with html-only legacy notes', () => {
  const draft = buildOrderPdfDraftFromUiRecord({
    rec: {
      autoDetails: 'Auto line',
      manualDetails: 'Auto line',
      manualDetailsHtml: '<div>Auto line</div>',
      detailsFull: true,
      detailsTouched: false,
      manualEnabled: false,
      notes: '',
      notesHtml: '<div>הערה אחת</div><div>הערה שתיים</div>',
    },
    detailsDirtyRef: { current: false },
    textApi,
    reportNonFatal: () => {},
  });

  assert.equal(draft.notes, 'הערה אחת\nהערה שתיים\n');
  assert.equal(draft.notesHtml, '<div>הערה אחת</div><div>הערה שתיים</div>');
});

test('order pdf notes fields runtime sanitizes rich html before storing it on the draft', () => {
  const fields = createOrderPdfNotesFields({
    notes: '',
    notesHtml:
      '<div onclick="boom()"><font color="#00aa00" size="4">הערה</font><script>alert(1)</script></div>',
    textApi,
  });

  assert.equal(fields.notes, 'הערהalert(1)\n');
  assert.equal(fields.notesHtml, '<div><font color="#00aa00" size="4">הערה</font>alert(1)</div>');
});
