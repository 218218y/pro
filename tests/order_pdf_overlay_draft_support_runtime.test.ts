import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOrderPdfInitialDraftSupportFields,
  buildOrderPdfRefreshCarryFields,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_draft_support_runtime.ts';
import {
  htmlToTextPreserveNewlines,
  safeStr,
  textToHtml,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_text.ts';

const textApi = {
  safeStr,
  textToHtml,
  htmlToTextPreserveNewlines,
};

test('order pdf draft support runtime builds initial support fields from seed with canonical note html', () => {
  const support = buildOrderPdfInitialDraftSupportFields({
    seed: {
      projectName: '',
      orderNumber: '123',
      orderDate: '2026-04-12',
      deliveryAddress: '',
      phone: '',
      mobile: '',
      notes: 'שורה א\nשורה ב',
      notesHtml: '',
    },
    textApi,
    defaultProjectName: 'פרויקט ברירת מחדל',
  });

  assert.deepEqual(support, {
    projectName: 'פרויקט ברירת מחדל',
    orderNumber: '123',
    orderDate: '2026-04-12',
    deliveryAddress: '',
    phone: '',
    mobile: '',
    notes: 'שורה א\nשורה ב',
    notesHtml: 'שורה א<br>שורה ב',
  });
});

test('order pdf draft support runtime carries previous notes, flags, and sketch annotations during refresh', () => {
  const sketchAnnotations = {
    renderSketch: {
      strokes: [{ tool: 'pen', color: '#000000', width: 2, points: [{ x: 0.1, y: 0.2 }] }],
    },
  };
  const currentDraft = {
    projectName: 'קיים',
    orderNumber: '111',
    orderDate: '2026-04-10',
    deliveryAddress: 'כתובת ישנה',
    phone: '03-1111111',
    mobile: '050-1111111',
    autoDetails: 'ישן',
    manualDetails: 'ישן',
    manualEnabled: false,
    notes: 'הערה קיימת',
    notesHtml: '<div>הערה קיימת</div>',
    includeRenderSketch: false,
    includeOpenClosed: true,
    sketchAnnotations,
  } as any;

  const support = buildOrderPdfRefreshCarryFields({
    currentDraft,
    source: {
      projectName: 'חדש',
      orderNumber: '222',
      orderDate: '2026-04-12',
      deliveryAddress: 'כתובת חדשה',
      phone: '03-2222222',
      mobile: '050-2222222',
      notes: 'הערה מהמקור',
      notesHtml: '<div>הערה מהמקור</div>',
    },
    textApi,
    defaultProjectName: 'פרויקט',
  });

  assert.equal(support.projectName, 'קיים');
  assert.equal(support.orderNumber, '111');
  assert.equal(support.deliveryAddress, 'כתובת ישנה');
  assert.equal(support.notes, 'הערה קיימת');
  assert.equal(support.notesHtml, '<div>הערה קיימת</div>');
  assert.equal(support.includeRenderSketch, false);
  assert.equal(support.includeOpenClosed, true);
  assert.notEqual(support.sketchAnnotations, sketchAnnotations);
  assert.equal(support.sketchAnnotations?.renderSketch?.strokes?.length, 1);
  assert.equal(support.sketchAnnotations?.renderSketch?.strokes?.[0]?.color, '#000000');
});
