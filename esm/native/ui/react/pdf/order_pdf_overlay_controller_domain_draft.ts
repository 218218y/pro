import type { InlineDetailsConfirmState, OrderPdfDraft } from './order_pdf_overlay_contracts.js';
import type { OrderPdfDraftSeed, OrderPdfEditableScalarField } from './order_pdf_overlay_draft_state.js';
import type { OrderPdfRichKind } from './order_pdf_overlay_rich_editors.js';

export type DraftStateApi = {
  buildUntouchedDetailsRefreshDraft: (args: {
    draft: OrderPdfDraft;
    newAutoDetails: string;
  }) => OrderPdfDraft | null;
  createOrderPdfInitialDraft: (seed: OrderPdfDraftSeed) => {
    draft: OrderPdfDraft;
    detailsDirty: boolean;
  };
  patchOrderPdfDraftField: (
    draft: OrderPdfDraft | null,
    key: OrderPdfEditableScalarField,
    value: string
  ) => OrderPdfDraft;
  readOrderPdfDraftSeed: (value: unknown) => OrderPdfDraftSeed;
  resolveOrderPdfRefreshAuto: (args: {
    source: OrderPdfDraftSeed;
    currentDraft: OrderPdfDraft | null | undefined;
    detailsEl: HTMLDivElement | null;
    docMaybe: Document | null;
    detailsDirty: boolean;
  }) => { kind: 'confirm'; confirm: InlineDetailsConfirmState } | { kind: 'persist'; next: OrderPdfDraft };
  syncOrderPdfDraftFromRichEditors: (args: {
    draft: OrderPdfDraft | null;
    detailsEl: HTMLDivElement | null;
    notesEl: HTMLDivElement | null;
    detailsDirty: boolean;
  }) => OrderPdfDraft | null;
  toggleOrderPdfDraftFlag: (
    draft: OrderPdfDraft | null,
    key: 'includeRenderSketch' | 'includeOpenClosed'
  ) => OrderPdfDraft;
};

export type RichEditorApi = {
  createOrderPdfDetailsEditorHandlers: (args: {
    detailsUserIntentRef: { current: boolean };
    detailsDirtyRef: { current: boolean };
    isRichProgrammatic: (kind: OrderPdfRichKind) => boolean;
    clearRichProgrammatic: (kind: OrderPdfRichKind) => void;
    syncRichFieldsFromDom: () => void;
    reportNonFatal: (op: string, err: unknown, dedupeMs?: number) => void;
  }) => Record<string, unknown>;
  createOrderPdfNotesEditorHandlers: (args: { syncRichFieldsFromDom: () => void }) => Record<string, unknown>;
};
