import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type { OrderPdfDraft } from './order_pdf_overlay_contracts.js';
import {
  areOrderPdfDraftRecordsEqual,
  readOrderPdfDraftRecord,
} from './order_pdf_overlay_draft_record_runtime.js';
import { applyOrderPdfOverlayDraftActionToast } from './order_pdf_overlay_draft_action_feedback.js';
import {
  loadOrderPdfInitialDraftWithDeps,
  readOrderPdfDraftSeedFromProjectWithDeps,
} from './order_pdf_overlay_draft_commands.js';
import type {
  DraftStateApi,
  RuntimeApi,
  TextApi,
  UiFeedbackLike,
} from './order_pdf_overlay_controller_shared.js';

type PersistDraft = (next: OrderPdfDraft) => void;
type SeedInitialDraft = (next: OrderPdfDraft) => void;

export function buildOrderPdfDraftFromUiRecord(args: {
  rec: Record<string, unknown>;
  detailsDirtyRef: { current: boolean };
  textApi: TextApi;
  reportNonFatal: (op: string, err: unknown, dedupeMs?: number) => void;
}): OrderPdfDraft {
  return readOrderPdfDraftRecord(args);
}

export const buildDraftFromUiRecord = buildOrderPdfDraftFromUiRecord;

export function useOrderPdfOverlayDraftEffects(args: {
  open: boolean;
  draftFromUi: unknown;
  draft: OrderPdfDraft | null;
  zoomFromUi: number;
  setDraft: Dispatch<SetStateAction<OrderPdfDraft | null>>;
  setZoom: Dispatch<SetStateAction<number>>;
  detailsDirtyRef: { current: boolean };
  autoRefreshAttemptedRef: { current: boolean };
  app: unknown;
  fb: UiFeedbackLike;
  runtimeApi: RuntimeApi;
  textApi: TextApi;
  draftStateApi: Pick<
    DraftStateApi,
    'buildUntouchedDetailsRefreshDraft' | 'createOrderPdfInitialDraft' | 'readOrderPdfDraftSeed'
  >;
  persistDraft: PersistDraft;
  seedInitialDraft: SeedInitialDraft;
  close: () => void;
}): void {
  const {
    open,
    draftFromUi,
    draft,
    zoomFromUi,
    setDraft,
    setZoom,
    detailsDirtyRef,
    autoRefreshAttemptedRef,
    app,
    fb,
    runtimeApi,
    textApi,
    draftStateApi,
    persistDraft,
    seedInitialDraft,
    close,
  } = args;
  const { asRecord, ensureExportApiReady, getOrderPdfDraftFn, orderPdfOverlayReportNonFatal } = runtimeApi;
  const { createOrderPdfInitialDraft, readOrderPdfDraftSeed, buildUntouchedDetailsRefreshDraft } =
    draftStateApi;

  useEffect(() => {
    if (!open) return;
    setZoom(prev => (Object.is(prev, zoomFromUi) ? prev : zoomFromUi));
  }, [open, zoomFromUi, setZoom]);

  useEffect(() => {
    if (!open) {
      setDraft(null);
      return;
    }

    const rec = asRecord(draftFromUi);
    if (rec) {
      const nextDraft = buildOrderPdfDraftFromUiRecord({
        rec,
        detailsDirtyRef,
        textApi,
        reportNonFatal: orderPdfOverlayReportNonFatal,
      });
      setDraft(prev => (areOrderPdfDraftRecordsEqual(prev, nextDraft) ? prev : nextDraft));
      return;
    }

    let cancelled = false;
    (async () => {
      const result = await loadOrderPdfInitialDraftWithDeps({
        app,
        ensureExportApiReady,
        getOrderPdfDraftFn,
        readOrderPdfDraftSeed,
        createOrderPdfInitialDraft,
      });
      if (cancelled) return;
      if (!result.ok) {
        applyOrderPdfOverlayDraftActionToast({ fb, result });
        if (result.closeRequested) close();
        return;
      }
      if (!result.next) return;
      detailsDirtyRef.current = !!result.detailsDirty;
      seedInitialDraft(result.next);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    draftFromUi,
    setDraft,
    detailsDirtyRef,
    app,
    fb,
    asRecord,
    ensureExportApiReady,
    getOrderPdfDraftFn,
    textApi,
    createOrderPdfInitialDraft,
    readOrderPdfDraftSeed,
    seedInitialDraft,
    close,
    orderPdfOverlayReportNonFatal,
  ]);

  useEffect(() => {
    if (!open) {
      autoRefreshAttemptedRef.current = false;
      return;
    }
    if (!draft) return;
    if (draft.detailsTouched || detailsDirtyRef.current) return;
    if (autoRefreshAttemptedRef.current) return;
    autoRefreshAttemptedRef.current = true;

    let cancelled = false;
    (async () => {
      const seedResult = await readOrderPdfDraftSeedFromProjectWithDeps({
        app,
        ensureExportApiReady,
        getOrderPdfDraftFn,
        readOrderPdfDraftSeed,
      });
      if (!seedResult.ok || cancelled) return;
      if (!seedResult.seed.autoDetails) return;
      if (draft.detailsTouched || detailsDirtyRef.current) return;

      const next = buildUntouchedDetailsRefreshDraft({
        draft,
        newAutoDetails: seedResult.seed.autoDetails,
      });
      if (!next) return;

      detailsDirtyRef.current = false;
      persistDraft(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    draft,
    app,
    ensureExportApiReady,
    getOrderPdfDraftFn,
    readOrderPdfDraftSeed,
    buildUntouchedDetailsRefreshDraft,
    persistDraft,
    autoRefreshAttemptedRef,
    detailsDirtyRef,
  ]);
}
