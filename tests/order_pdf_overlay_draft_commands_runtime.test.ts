import test from 'node:test';
import assert from 'node:assert/strict';

import {
  loadOrderPdfInitialDraftWithDeps,
  readOrderPdfDraftSeedFromProjectWithDeps,
  refreshOrderPdfDraftFromProjectWithDeps,
  resolveOrderPdfInlineConfirmAction,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_draft_commands.js';
import type {
  InlineDetailsConfirmState,
  OrderPdfDraft,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_contracts.js';
import type { OrderPdfDraftSeed } from '../esm/native/ui/react/pdf/order_pdf_overlay_draft_state.js';

function createSeed(): OrderPdfDraftSeed {
  return {
    projectName: 'פרויקט',
    orderNumber: '100',
    orderDate: '2026-03-27',
    deliveryAddress: 'בני ברק',
    phone: '03',
    mobile: '050',
    autoDetails: 'פרטי הזמנה',
    manualDetails: '',
    manualDetailsHtml: '',
    manualEnabled: false,
    notes: '',
    notesHtml: '',
  };
}

function createDraft(): OrderPdfDraft {
  return {
    projectName: 'פרויקט',
    orderNumber: '100',
    orderDate: '2026-03-27',
    deliveryAddress: '',
    phone: '',
    mobile: '',
    autoDetails: 'ישן',
    manualDetails: 'ישן',
    manualEnabled: false,
    notes: '',
    includeRenderSketch: true,
    includeOpenClosed: true,
  };
}

test('readOrderPdfDraftSeedFromProjectWithDeps reports not-ready when export API is missing', async () => {
  const result = await readOrderPdfDraftSeedFromProjectWithDeps({
    app: {},
    ensureExportApiReady: async () => ({}),
    getOrderPdfDraftFn: () => null,
    readOrderPdfDraftSeed: () => createSeed(),
  });

  assert.deepEqual(result, { ok: false, reason: 'not-ready' });
});

test('loadOrderPdfInitialDraftWithDeps returns seeded draft and detailsDirty state', async () => {
  const result = await loadOrderPdfInitialDraftWithDeps({
    app: {},
    ensureExportApiReady: async () => ({ loaded: true }),
    getOrderPdfDraftFn: () => async () => ({ autoDetails: 'חדש' }),
    readOrderPdfDraftSeed: value => ({
      ...createSeed(),
      autoDetails: String((value as { autoDetails?: string }).autoDetails || ''),
    }),
    createOrderPdfInitialDraft: seed => ({
      draft: { ...createDraft(), autoDetails: seed.autoDetails, manualDetails: seed.autoDetails },
      detailsDirty: false,
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.kind, 'initial-load');
  assert.equal(result.next?.autoDetails, 'חדש');
  assert.equal(result.detailsDirty, false);
});

test('refreshOrderPdfDraftFromProjectWithDeps returns pending confirm when merge policy requires it', async () => {
  const confirm: InlineDetailsConfirmState = {
    open: true,
    title: 'עדכון',
    message: 'message',
    preview: 'preview',
    nextOk: { ...createDraft(), manualDetails: 'ok' },
    nextCancel: { ...createDraft(), manualDetails: 'cancel' },
  };

  const result = await refreshOrderPdfDraftFromProjectWithDeps({
    app: {},
    draft: createDraft(),
    detailsEl: null,
    docMaybe: null,
    detailsDirty: true,
    ensureExportApiReady: async () => ({ loaded: true }),
    getOrderPdfDraftFn: () => async () => ({ autoDetails: 'חדש' }),
    readOrderPdfDraftSeed: value => ({
      ...createSeed(),
      autoDetails: String((value as { autoDetails?: string }).autoDetails || ''),
    }),
    resolveOrderPdfRefreshAuto: () => ({ kind: 'confirm', confirm }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.kind, 'refresh-auto');
  assert.equal(result.confirm, confirm);
  assert.equal(result.next, undefined);
});

test('resolveOrderPdfInlineConfirmAction returns the selected follow-up draft', () => {
  const inlineConfirm: InlineDetailsConfirmState = {
    open: true,
    title: 'עדכון',
    message: 'message',
    preview: 'preview',
    nextOk: { ...createDraft(), manualDetails: 'ok' },
    nextCancel: { ...createDraft(), manualDetails: 'cancel' },
  };

  const okResult = resolveOrderPdfInlineConfirmAction({ inlineConfirm, mode: 'ok' });
  const cancelResult = resolveOrderPdfInlineConfirmAction({ inlineConfirm, mode: 'cancel' });

  assert.equal(okResult.ok, true);
  assert.equal(okResult.kind, 'confirm-inline-ok');
  assert.equal(okResult.next?.manualDetails, 'ok');

  assert.equal(cancelResult.ok, true);
  assert.equal(cancelResult.kind, 'confirm-inline-cancel');
  assert.equal(cancelResult.next?.manualDetails, 'cancel');
});
