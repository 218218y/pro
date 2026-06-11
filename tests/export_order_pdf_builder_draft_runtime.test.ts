import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveOrderPdfDraft,
  resolveOrderPdfOrderDetails,
  resolveOrderPdfString,
} from '../esm/native/ui/export/export_order_pdf_builder_draft.js';

test('resolveOrderPdfString keeps strings but canonicalizes nullish and numeric values', () => {
  assert.equal(resolveOrderPdfString(null, 'fallback'), 'fallback');
  assert.equal(resolveOrderPdfString(undefined, 'fallback'), 'fallback');
  assert.equal(resolveOrderPdfString(42), '42');
  assert.equal(resolveOrderPdfString('abc'), 'abc');
});

test('resolveOrderPdfOrderDetails prefers manual details only when the draft semantics say so', () => {
  const textOps = {
    buildOrderDetailsText: () => 'auto details',
  } as any;

  const App = {} as any;

  assert.equal(
    resolveOrderPdfOrderDetails({ App, draft: { manualDetails: '', detailsFull: false } as any, textOps }),
    'auto details'
  );

  assert.equal(
    resolveOrderPdfOrderDetails({
      App,
      draft: {
        manualDetails: 'manual only',
        manualEnabled: true,
        detailsTouched: true,
        detailsFull: true,
      } as any,
      textOps,
    }),
    'manual only'
  );

  assert.equal(
    resolveOrderPdfOrderDetails({
      App,
      draft: {
        manualDetails: 'manual tail',
        manualEnabled: false,
        detailsTouched: false,
        detailsFull: false,
      } as any,
      textOps,
    }),
    'auto details\n\nmanual tail'
  );
});

test('resolveOrderPdfDraft keeps canonical defaults while honoring draft overrides', () => {
  const deps = {
    _getProjectName: () => 'Project From App',
  } as any;

  const textOps = {
    buildOrderDetailsText: () => 'auto details',
    formatOrderDateDdMmYyyy: () => '01/04/2026',
  } as any;

  assert.deepEqual(resolveOrderPdfDraft({} as any, {} as any, deps, textOps), {
    projectName: 'Project From App',
    orderNumber: '',
    orderDate: '01/04/2026',
    deliveryAddress: '',
    phone: '',
    mobile: '',
    notes: '',
    orderDetails: 'auto details',
    includeRenderSketch: true,
    includeOpenClosed: true,
  });

  assert.deepEqual(
    resolveOrderPdfDraft(
      {} as any,
      {
        projectName: 'Draft Project',
        orderNumber: '17',
        orderDate: '2026-04-01',
        deliveryAddress: 'רחוב הדוגמה 1',
        phone: '03-5555555',
        mobile: '050-1234567',
        notes: 'שים לב',
        manualDetails: 'manual tail',
        includeRenderSketch: false,
        includeOpenClosed: false,
      } as any,
      deps,
      textOps
    ),
    {
      projectName: 'Draft Project',
      orderNumber: '17',
      orderDate: '2026-04-01',
      deliveryAddress: 'רחוב הדוגמה 1',
      phone: '03-5555555',
      mobile: '050-1234567',
      notes: 'שים לב',
      orderDetails: 'manual tail',
      includeRenderSketch: false,
      includeOpenClosed: false,
    }
  );
});
