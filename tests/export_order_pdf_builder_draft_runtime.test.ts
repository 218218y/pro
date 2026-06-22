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

test('resolveOrderPdfOrderDetails uses edited details only when the canonical touched marker says so', () => {
  const textOps = {
    buildOrderDetailsText: () => 'auto details',
  } as any;

  const App = {} as any;

  assert.equal(
    resolveOrderPdfOrderDetails({
      App,
      draft: { detailsText: '', detailsTouched: false } as any,
      textOps,
    }),
    'auto details'
  );

  assert.equal(
    resolveOrderPdfOrderDetails({
      App,
      draft: {
        detailsText: 'edited only',
        detailsTouched: true,
      } as any,
      textOps,
    }),
    'edited only'
  );

  assert.equal(
    resolveOrderPdfOrderDetails({
      App,
      draft: {
        detailsText: 'stale details',
        detailsTouched: false,
      } as any,
      textOps,
    }),
    'auto details'
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
        detailsText: 'edited details',
        detailsTouched: true,
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
      orderDetails: 'edited details',
      includeRenderSketch: false,
      includeOpenClosed: false,
    }
  );
});
