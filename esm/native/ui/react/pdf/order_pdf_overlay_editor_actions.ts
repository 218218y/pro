import { useCallback, useMemo } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type {
  InlineDetailsConfirmState,
  OrderPdfDraft,
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchStroke,
  OrderPdfSketchTextBox,
} from './order_pdf_overlay_contracts.js';
import { applyOrderPdfOverlayDraftActionToast } from './order_pdf_overlay_draft_action_feedback.js';
import {
  appendOrderPdfSketchStroke,
  clearOrderPdfSketchStrokes,
  deleteOrderPdfSketchTextBox,
  undoOrderPdfSketchStroke,
  isOrderPdfSketchStroke,
  upsertOrderPdfSketchTextBox,
} from './order_pdf_overlay_sketch_annotation_state_runtime.js';
import {
  refreshOrderPdfDraftFromProjectWithDeps,
  resolveOrderPdfInlineConfirmAction,
} from './order_pdf_overlay_draft_commands.js';
import type { OrderPdfEditableScalarField } from './order_pdf_overlay_draft_state.js';
import type {
  DraftStateApi,
  OrderPdfOverlayControllerEnv,
  RichEditorApi,
  RichProgrammaticApi,
  RuntimeApi,
} from './order_pdf_overlay_controller_shared.js';

export function useOrderPdfOverlayEditorActions(args: {
  env: Pick<OrderPdfOverlayControllerEnv, 'app' | 'fb' | 'docMaybe'>;
  draft: OrderPdfDraft | null;
  setInlineConfirm: Dispatch<SetStateAction<InlineDetailsConfirmState | null>>;
  detailsRichRef: MutableRefObject<HTMLDivElement | null>;
  notesRichRef: MutableRefObject<HTMLDivElement | null>;
  detailsDirtyRef: MutableRefObject<boolean>;
  detailsUserIntentRef: MutableRefObject<boolean>;
  persistDraft: (next: OrderPdfDraft) => void;
  setZoom: Dispatch<SetStateAction<number>>;
  inlineConfirm: InlineDetailsConfirmState | null;
  draftStateApi: DraftStateApi;
  richEditorApi: RichEditorApi;
  richProgrammaticApi: RichProgrammaticApi;
  runtimeApi: Pick<
    RuntimeApi,
    'clamp' | 'ensureExportApiReady' | 'getOrderPdfDraftFn' | 'orderPdfOverlayReportNonFatal'
  >;
}) {
  const {
    env: { app, fb, docMaybe },
    draft,
    setInlineConfirm,
    detailsRichRef,
    notesRichRef,
    detailsDirtyRef,
    detailsUserIntentRef,
    persistDraft,
    setZoom,
    inlineConfirm,
    draftStateApi,
    richEditorApi,
    richProgrammaticApi,
    runtimeApi,
  } = args;
  const { clamp, ensureExportApiReady, getOrderPdfDraftFn, orderPdfOverlayReportNonFatal } = runtimeApi;

  const closeInlineConfirm = useCallback(() => {
    setInlineConfirm(null);
  }, [setInlineConfirm]);

  const confirmInlineOk = useCallback(() => {
    const result = resolveOrderPdfInlineConfirmAction({ inlineConfirm, mode: 'ok' });
    closeInlineConfirm();
    if (result.next) persistDraft(result.next);
    applyOrderPdfOverlayDraftActionToast({ fb, result, inlineConfirm });
  }, [inlineConfirm, closeInlineConfirm, persistDraft, fb]);

  const confirmInlineCancel = useCallback(() => {
    const result = resolveOrderPdfInlineConfirmAction({ inlineConfirm, mode: 'cancel' });
    closeInlineConfirm();
    if (result.next) persistDraft(result.next);
    applyOrderPdfOverlayDraftActionToast({ fb, result, inlineConfirm });
  }, [inlineConfirm, closeInlineConfirm, persistDraft, fb]);

  const syncRichFieldsFromDom = useCallback(() => {
    const next = draftStateApi.syncOrderPdfDraftFromRichEditors({
      draft,
      detailsEl: detailsRichRef.current,
      notesEl: notesRichRef.current,
      detailsDirty: detailsDirtyRef.current,
    });
    if (next) persistDraft(next);
  }, [draft, detailsRichRef, notesRichRef, detailsDirtyRef, draftStateApi, persistDraft]);

  const detailsEditorHandlers = useMemo(
    () =>
      richEditorApi.createOrderPdfDetailsEditorHandlers({
        detailsUserIntentRef,
        detailsDirtyRef,
        isRichProgrammatic: richProgrammaticApi.isRichProgrammatic,
        clearRichProgrammatic: richProgrammaticApi.clearRichProgrammatic,
        syncRichFieldsFromDom,
        reportNonFatal: orderPdfOverlayReportNonFatal,
      }),
    [
      detailsUserIntentRef,
      detailsDirtyRef,
      richProgrammaticApi,
      syncRichFieldsFromDom,
      richEditorApi,
      orderPdfOverlayReportNonFatal,
    ]
  );

  const notesEditorHandlers = useMemo(
    () => richEditorApi.createOrderPdfNotesEditorHandlers({ syncRichFieldsFromDom }),
    [richEditorApi, syncRichFieldsFromDom]
  );

  const handleScalarFieldChange = useCallback(
    (key: OrderPdfEditableScalarField, value: string) => {
      persistDraft(draftStateApi.patchOrderPdfDraftField(draft, key, value));
    },
    [draft, persistDraft, draftStateApi]
  );

  const setZoomUi = useCallback(
    (value: number) => {
      setZoom(clamp(value, 0.6, 2.25));
    },
    [setZoom, clamp]
  );

  const refreshAuto = useCallback(async () => {
    syncRichFieldsFromDom();

    const result = await refreshOrderPdfDraftFromProjectWithDeps({
      app,
      draft,
      detailsEl: detailsRichRef.current,
      docMaybe,
      detailsDirty: detailsDirtyRef.current,
      ensureExportApiReady,
      getOrderPdfDraftFn,
      readOrderPdfDraftSeed: draftStateApi.readOrderPdfDraftSeed,
      resolveOrderPdfRefreshAuto: draftStateApi.resolveOrderPdfRefreshAuto,
    });

    if (result.confirm) {
      setInlineConfirm(result.confirm);
      return result;
    }

    if (result.next) persistDraft(result.next);
    applyOrderPdfOverlayDraftActionToast({ fb, result });
    return result;
  }, [
    syncRichFieldsFromDom,
    app,
    draft,
    detailsRichRef,
    docMaybe,
    detailsDirtyRef,
    ensureExportApiReady,
    getOrderPdfDraftFn,
    draftStateApi,
    setInlineConfirm,
    persistDraft,
    fb,
  ]);

  const persistNextDraftIfChanged = useCallback(
    (next: OrderPdfDraft) => {
      if (next === draft) return;
      persistDraft(next);
    },
    [draft, persistDraft]
  );

  const onToggleRenderSketch = useCallback(() => {
    persistNextDraftIfChanged(draftStateApi.toggleOrderPdfDraftFlag(draft, 'includeRenderSketch'));
  }, [persistNextDraftIfChanged, draftStateApi, draft]);

  const onToggleOpenClosed = useCallback(() => {
    persistNextDraftIfChanged(draftStateApi.toggleOrderPdfDraftFlag(draft, 'includeOpenClosed'));
  }, [persistNextDraftIfChanged, draftStateApi, draft]);

  const appendSketchStroke = useCallback(
    (key: OrderPdfSketchAnnotationPageKey, stroke: OrderPdfSketchStroke) => {
      persistNextDraftIfChanged(appendOrderPdfSketchStroke({ draft, key, stroke }));
    },
    [draft, persistNextDraftIfChanged]
  );

  const undoSketchStroke = useCallback(
    (key: OrderPdfSketchAnnotationPageKey) => {
      persistNextDraftIfChanged(undoOrderPdfSketchStroke(draft, key));
    },
    [draft, persistNextDraftIfChanged]
  );

  const clearSketchStrokes = useCallback(
    (key: OrderPdfSketchAnnotationPageKey) => {
      persistNextDraftIfChanged(clearOrderPdfSketchStrokes(draft, key));
    },
    [draft, persistNextDraftIfChanged]
  );

  const upsertSketchTextBox = useCallback(
    (key: OrderPdfSketchAnnotationPageKey, textBox: OrderPdfSketchTextBox) => {
      persistNextDraftIfChanged(upsertOrderPdfSketchTextBox({ draft, key, textBox }));
    },
    [draft, persistNextDraftIfChanged]
  );

  const deleteSketchTextBox = useCallback(
    (key: OrderPdfSketchAnnotationPageKey, id: string) => {
      persistNextDraftIfChanged(deleteOrderPdfSketchTextBox({ draft, key, id }));
    },
    [draft, persistNextDraftIfChanged]
  );

  const redoSketchAnnotation = useCallback(
    (key: OrderPdfSketchAnnotationPageKey, annotation: OrderPdfSketchStroke | OrderPdfSketchTextBox) => {
      if (isOrderPdfSketchStroke(annotation)) {
        persistNextDraftIfChanged(appendOrderPdfSketchStroke({ draft, key, stroke: annotation }));
        return;
      }
      persistNextDraftIfChanged(upsertOrderPdfSketchTextBox({ draft, key, textBox: annotation }));
    },
    [draft, persistNextDraftIfChanged]
  );

  return {
    confirmInlineOk,
    confirmInlineCancel,
    detailsEditorHandlers,
    notesEditorHandlers,
    handleScalarFieldChange,
    setZoomUi,
    refreshAuto,
    onToggleRenderSketch,
    onToggleOpenClosed,
    appendSketchStroke,
    undoSketchStroke,
    clearSketchStrokes,
    upsertSketchTextBox,
    deleteSketchTextBox,
    redoSketchAnnotation,
  };
}
