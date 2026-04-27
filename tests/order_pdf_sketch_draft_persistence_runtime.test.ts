import test from 'node:test';
import assert from 'node:assert/strict';

import { buildOrderPdfDraftFromUiRecord } from '../esm/native/ui/react/pdf/order_pdf_overlay_draft_effects.ts';
import { resolveOrderPdfRefreshAuto } from '../esm/native/ui/react/pdf/order_pdf_overlay_draft_state.ts';
import {
  buildDetailsHtmlWithMarkers,
  normalizeForCompare,
  safeStr,
  textToHtml,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_text.ts';

function makeSketchAnnotations() {
  return {
    renderSketch: {
      strokes: [
        {
          id: 'stk-1',
          createdAt: 1,
          tool: 'pen' as const,
          color: '#2563eb',
          width: 4,
          points: [
            { x: 0.1, y: 0.2 },
            { x: 0.4, y: 0.6 },
          ],
        },
      ],
    },
  };
}

test('[order-pdf] draft rehydrate keeps sketch annotations and sketch include flags', () => {
  const next = buildOrderPdfDraftFromUiRecord({
    rec: {
      projectName: 'פרויקט בדיקה',
      orderNumber: '123',
      orderDate: '2026-04-06',
      deliveryAddress: 'רחוב הבדיקה 1',
      phone: '03-0000000',
      mobile: '050-0000000',
      autoDetails: 'פרט א',
      manualDetails: 'פרט א',
      manualDetailsHtml: '<div>פרט א</div>',
      detailsFull: true,
      detailsSeed: 'פרט א',
      detailsTouched: false,
      manualEnabled: false,
      notes: 'הערה',
      notesHtml: '<div>הערה</div>',
      includeRenderSketch: false,
      includeOpenClosed: true,
      sketchAnnotations: makeSketchAnnotations(),
    },
    detailsDirtyRef: { current: false },
    textApi: {
      safeStr,
      textToHtml,
      buildDetailsHtmlWithMarkers,
      normalizeForCompare,
    },
    reportNonFatal: () => {},
  });

  assert.equal(next.includeRenderSketch, false);
  assert.equal(next.includeOpenClosed, true);
  assert.deepEqual(next.sketchAnnotations, makeSketchAnnotations());
});

test('[order-pdf] refresh-auto preserves sketch annotations while refreshing project details', () => {
  const currentDraft = {
    projectName: 'קיים',
    orderNumber: '321',
    orderDate: '2026-04-06',
    deliveryAddress: 'כתובת קיימת',
    phone: '03-1111111',
    mobile: '050-1111111',
    autoDetails: 'ישן',
    manualDetails: 'ישן',
    manualDetailsHtml: '<div>ישן</div>',
    detailsFull: true,
    detailsSeed: 'ישן',
    detailsTouched: false,
    manualEnabled: false,
    notes: 'הערה קיימת',
    notesHtml: '<div>הערה קיימת</div>',
    includeRenderSketch: true,
    includeOpenClosed: false,
    sketchAnnotations: makeSketchAnnotations(),
  };

  const resolved = resolveOrderPdfRefreshAuto({
    source: {
      projectName: 'חדש',
      orderNumber: '999',
      orderDate: '2026-04-06',
      deliveryAddress: 'כתובת חדשה',
      phone: '03-9999999',
      mobile: '050-9999999',
      autoDetails: 'חדש',
      manualDetails: '',
      manualDetailsHtml: '',
      manualEnabled: false,
      notes: '',
      notesHtml: '',
    },
    currentDraft,
    detailsEl: null,
    docMaybe: null,
    detailsDirty: false,
  });

  assert.equal(resolved.kind, 'persist');
  if (resolved.kind !== 'persist') return;
  assert.equal(resolved.next.manualDetails, 'חדש');
  assert.equal(resolved.next.includeOpenClosed, false);
  assert.deepEqual(resolved.next.sketchAnnotations, makeSketchAnnotations());
});
