import type {
  InlineDetailsConfirmState,
  OrderPdfDraft,
  OrderPdfOverlayDraftActionResult,
} from './order_pdf_overlay_contracts.js';
import type { OrderPdfDraftSeed } from './order_pdf_overlay_draft_state.js';

function withDetail(base: string, detail?: string): string {
  const suffix = String(detail || '').trim();
  return suffix ? `${base}: ${suffix}` : base;
}

export async function readOrderPdfDraftSeedFromProjectWithDeps(args: {
  app: unknown;
  ensureExportApiReady: (app: unknown) => Promise<unknown>;
  getOrderPdfDraftFn: (value: unknown) => (() => Promise<unknown> | unknown) | null;
  readOrderPdfDraftSeed: (value: unknown) => OrderPdfDraftSeed;
}): Promise<
  { ok: true; seed: OrderPdfDraftSeed } | { ok: false; reason: 'not-ready' | 'error'; detail?: string }
> {
  const { app, ensureExportApiReady, getOrderPdfDraftFn, readOrderPdfDraftSeed } = args;
  const exp = await ensureExportApiReady(app);
  const fn = getOrderPdfDraftFn(exp);
  if (!fn) {
    return { ok: false, reason: 'not-ready' };
  }
  try {
    const loaded = await fn();
    return { ok: true, seed: readOrderPdfDraftSeed(loaded) };
  } catch (err) {
    return {
      ok: false,
      reason: 'error',
      detail: err instanceof Error ? withDetail(err.name || 'Error', err.message) : undefined,
    };
  }
}

export async function loadOrderPdfInitialDraftWithDeps(args: {
  app: unknown;
  ensureExportApiReady: (app: unknown) => Promise<unknown>;
  getOrderPdfDraftFn: (value: unknown) => (() => Promise<unknown> | unknown) | null;
  readOrderPdfDraftSeed: (value: unknown) => OrderPdfDraftSeed;
  createOrderPdfInitialDraft: (seed: OrderPdfDraftSeed) => { draft: OrderPdfDraft; detailsDirty: boolean };
}): Promise<OrderPdfOverlayDraftActionResult> {
  const { createOrderPdfInitialDraft, ...rest } = args;
  const seedResult = await readOrderPdfDraftSeedFromProjectWithDeps(rest);
  if (seedResult.ok === false) {
    return {
      ok: false,
      kind: 'initial-load',
      reason: seedResult.reason,
      detail: seedResult.detail,
      closeRequested: true,
    };
  }
  const created = createOrderPdfInitialDraft(seedResult.seed);
  return {
    ok: true,
    kind: 'initial-load',
    next: created.draft,
    detailsDirty: created.detailsDirty,
  };
}

export async function refreshOrderPdfDraftFromProjectWithDeps(args: {
  app: unknown;
  draft: OrderPdfDraft | null | undefined;
  detailsEl: HTMLDivElement | null;
  docMaybe: Document | null;
  detailsDirty: boolean;
  ensureExportApiReady: (app: unknown) => Promise<unknown>;
  getOrderPdfDraftFn: (value: unknown) => (() => Promise<unknown> | unknown) | null;
  readOrderPdfDraftSeed: (value: unknown) => OrderPdfDraftSeed;
  resolveOrderPdfRefreshAuto: (args: {
    source: OrderPdfDraftSeed;
    currentDraft: OrderPdfDraft | null | undefined;
    detailsEl: HTMLDivElement | null;
    docMaybe: Document | null;
    detailsDirty: boolean;
  }) => { kind: 'confirm'; confirm: InlineDetailsConfirmState } | { kind: 'persist'; next: OrderPdfDraft };
}): Promise<OrderPdfOverlayDraftActionResult> {
  const { draft, detailsEl, docMaybe, detailsDirty, resolveOrderPdfRefreshAuto, ...rest } = args;
  const seedResult = await readOrderPdfDraftSeedFromProjectWithDeps(rest);
  if (seedResult.ok === false) {
    return {
      ok: false,
      kind: 'refresh-auto',
      reason: seedResult.reason,
      detail: seedResult.detail,
    };
  }

  const resolved = resolveOrderPdfRefreshAuto({
    source: seedResult.seed,
    currentDraft: draft || null,
    detailsEl,
    docMaybe,
    detailsDirty,
  });

  if (resolved.kind === 'confirm') {
    return {
      ok: true,
      kind: 'refresh-auto',
      confirm: resolved.confirm,
    };
  }

  return {
    ok: true,
    kind: 'refresh-auto',
    next: resolved.next,
  };
}

export function resolveOrderPdfInlineConfirmAction(args: {
  inlineConfirm: InlineDetailsConfirmState | null | undefined;
  mode: 'ok' | 'cancel';
}): OrderPdfOverlayDraftActionResult {
  const { inlineConfirm, mode } = args;
  const kind = mode === 'ok' ? 'confirm-inline-ok' : 'confirm-inline-cancel';
  if (!inlineConfirm || !inlineConfirm.open) {
    return { ok: false, kind, reason: 'cancelled' };
  }

  return {
    ok: true,
    kind,
    next: mode === 'ok' ? inlineConfirm.nextOk : inlineConfirm.nextCancel,
  };
}
