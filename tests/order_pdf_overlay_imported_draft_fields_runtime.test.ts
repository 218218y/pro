import test from 'node:test';
import assert from 'node:assert/strict';

import { makeEmptyDraft } from '../esm/native/ui/react/pdf/order_pdf_overlay_text.js';
import {
  applyOrderPdfImportedDraftFields,
  hasAnyOrderPdfImportedRichDraftFieldValue,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_imported_draft_fields_runtime.js';

test('order pdf imported draft fields detect html-only rich values but ignore blank html', () => {
  assert.equal(hasAnyOrderPdfImportedRichDraftFieldValue({ manualDetailsHtml: '<div>ידני</div>' }), true);
  assert.equal(hasAnyOrderPdfImportedRichDraftFieldValue({ notesHtml: '<div><br></div>' }), false);
});

test('order pdf imported draft fields recover html-only details and notes into canonical draft fields', () => {
  const next = applyOrderPdfImportedDraftFields({
    baseDraft: {
      ...makeEmptyDraft(),
      autoDetails: 'שורה אוטומטית',
      includeRenderSketch: true,
      includeOpenClosed: true,
    },
    extracted: {
      manualDetailsHtml: '<div>שורה ידנית</div><div>תוספת</div>',
      notesHtml: '<div>הערה א</div><div>הערה ב</div>',
    },
    importedTailPages: [1],
  });

  assert.equal(next.manualDetails, 'שורה ידנית\nתוספת');
  assert.equal(next.manualDetailsHtml, '<div>שורה ידנית</div><div>תוספת</div>');
  assert.equal(next.detailsTouched, true);
  assert.equal(next.manualEnabled, true);
  assert.equal(next.notes, 'הערה א\nהערה ב');
  assert.equal(next.notesHtml, '<div>הערה א</div><div>הערה ב</div>');
  assert.equal(next.includeRenderSketch, false);
  assert.equal(next.includeOpenClosed, true);
});

test('order pdf imported draft fields sanitize rich html payloads before persisting them', () => {
  const next = applyOrderPdfImportedDraftFields({
    baseDraft: makeEmptyDraft(),
    extracted: {
      manualDetailsHtml:
        '<div onclick="boom()"><span data-wp-auto="start" contenteditable="false"></span>פרט</div>',
      notesHtml:
        '<div><font color="#123456" size="5" onclick="boom()">הערה</font><script>alert(1)</script></div>',
    },
  });

  assert.equal(
    next.manualDetailsHtml,
    '<div><span data-wp-auto="start" contenteditable="false"></span>פרט</div>'
  );
  assert.equal(next.notesHtml, '<div><font color="#123456" size="5">הערה</font>alert(1)</div>');
});
