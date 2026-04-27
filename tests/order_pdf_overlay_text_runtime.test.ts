import test from 'node:test';
import assert from 'node:assert/strict';

import {
  htmlToTextPreserveNewlines,
  makeEmptyDraft,
  mergeAutoDetailsWithInlineManual,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_text.ts';

test('order pdf text fallback html decoder preserves newlines and common entities without a document', () => {
  assert.equal(
    htmlToTextPreserveNewlines(null, 'לקוח&nbsp;א<br>מחיר &amp; צבע &lt;לבן&gt; &#39;מוכן&#39;'),
    "לקוח א\nמחיר & צבע <לבן> 'מוכן'"
  );
});

test('order pdf text public seam exposes the canonical empty draft defaults', () => {
  assert.deepEqual(makeEmptyDraft(), {
    projectName: '',
    orderNumber: '',
    orderDate: '',
    deliveryAddress: '',
    phone: '',
    mobile: '',
    autoDetails: '',
    manualDetails: '',
    manualDetailsHtml: '',
    detailsFull: true,
    detailsTouched: false,
    detailsSeed: '',
    manualEnabled: false,
    notes: '',
    notesHtml: '',
    includeRenderSketch: true,
    includeOpenClosed: true,
    sketchAnnotations: undefined,
  });
});

test('order pdf text merge falls back to exact base replacement when no marker document is available', () => {
  const merged = mergeAutoDetailsWithInlineManual({
    prevText: 'Auto line\nהערה ידנית',
    prevHtml: '',
    doc: null,
    prevAuto: 'Auto line',
    prevSeed: '',
    newAuto: 'New auto',
  });

  assert.equal(merged.kind, 'none');
  assert.equal(merged.cleanText, 'New auto\nהערה ידנית');
  assert.equal(merged.keepText, 'New auto\nהערה ידנית');
  assert.equal(merged.cleanAutoRegion, 'New auto');
  assert.equal(merged.keepAutoRegion, 'New auto');
  assert.equal(merged.preview, '');
});
