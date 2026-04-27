import { useCallback, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { AppContainer, MetaActionsNamespaceLike } from '../../../../../types';

import {
  runHistoryBatch,
  setUiOrderPdfEditorDraft,
  setUiOrderPdfEditorOpen,
  setUiOrderPdfEditorZoom,
} from '../actions/store_actions.js';
import { useUiSelectorShallow } from '../hooks.js';

import { pdfUiOnlyMeta } from './order_pdf_overlay_runtime.js';
import { runPerfAction } from '../../../services/api.js';
import type {
  InlineDetailsConfirmState,
  OrderPdfDraft,
  PdfJsDocumentLike,
  PdfJsLibLike,
  PdfJsLoadingTaskLike,
} from './order_pdf_overlay_contracts.js';
import type {
  OrderPdfOverlayControllerActions,
  OrderPdfOverlayControllerRefs,
  OrderPdfOverlayControllerUi,
} from './order_pdf_overlay_controller_shared.js';
import type { PdfJsPageReadyLike, PdfJsRenderTaskLike } from './order_pdf_overlay_pdf_render.js';

export type OrderPdfOverlayComponentRefs = OrderPdfOverlayControllerRefs & {
  richProgrammaticRef: MutableRefObject<{ detailsUntil: number; notesUntil: number }>;
};

export function useOrderPdfOverlayComponentUiState(): OrderPdfOverlayControllerUi {
  const { open, draftFromUi, zoomFromUi } = useUiSelectorShallow(ui => {
    const z = ui.orderPdfEditorZoom;
    return {
      open: !!ui.orderPdfEditorOpen,
      draftFromUi: ui.orderPdfEditorDraft,
      zoomFromUi: typeof z === 'number' && Number.isFinite(z) ? z : 1,
    };
  });

  const [draft, setDraft] = useState<OrderPdfDraft | null>(null);
  const [zoom, setZoom] = useState<number>(zoomFromUi);
  const [gmailBusy, setGmailBusy] = useState<boolean>(false);
  const [imagePdfBusy, setImagePdfBusy] = useState<boolean>(false);
  const [inlineConfirm, setInlineConfirm] = useState<InlineDetailsConfirmState | null>(null);
  const [pdfPageReadyTick, setPdfPageReadyTick] = useState<number>(0);
  const [pdfSourceTick, setPdfSourceTick] = useState<number>(0);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [importedPdfImagePageCount, setImportedPdfImagePageCount] = useState<number>(0);

  return {
    open,
    draftFromUi,
    zoomFromUi,
    draft,
    setDraft,
    zoom,
    setZoom,
    gmailBusy,
    setGmailBusy,
    imagePdfBusy,
    setImagePdfBusy,
    inlineConfirm,
    setInlineConfirm,
    dragOver,
    setDragOver,
    importedPdfImagePageCount,
    setImportedPdfImagePageCount,
    pdfPageReadyTick,
    setPdfPageReadyTick,
    pdfSourceTick,
    setPdfSourceTick,
  };
}

export function useOrderPdfOverlayComponentRefs(): OrderPdfOverlayComponentRefs {
  return {
    canvasRef: useRef<HTMLCanvasElement | null>(null),
    detailsRichRef: useRef<HTMLDivElement | null>(null),
    notesRichRef: useRef<HTMLDivElement | null>(null),
    orderNoInputRef: useRef<HTMLInputElement | null>(null),
    containerRef: useRef<HTMLDivElement | null>(null),
    overlayRef: useRef<HTMLDivElement | null>(null),
    pdfFileInputRef: useRef<HTMLInputElement | null>(null),
    pdfJsRef: useRef<PdfJsLibLike | null>(null),
    pdfBytesRef: useRef<Uint8Array | null>(null),
    pdfTemplateBytesRef: useRef<Uint8Array | null>(null),
    loadedPdfOriginalBytesRef: useRef<Uint8Array | null>(null),
    loadedPdfTailNonFormPageIndexesRef: useRef<number[]>([]),
    pdfDocRef: useRef<PdfJsDocumentLike | null>(null),
    pdfDocTaskRef: useRef<PdfJsLoadingTaskLike | null>(null),
    pageRef: useRef<PdfJsPageReadyLike | null>(null),
    pageSizeRef: useRef<{ w: number; h: number } | null>(null),
    pdfRenderTaskRef: useRef<PdfJsRenderTaskLike | null>(null),
    pdfRenderQueueRef: useRef<Promise<void>>(Promise.resolve()),
    pdfRenderReqIdRef: useRef<number>(0),
    lastLoadedPdfTickRef: useRef<number>(-1),
    detailsDirtyRef: useRef<boolean>(false),
    detailsUserIntentRef: useRef<boolean>(false),
    richProgrammaticRef: useRef<{ detailsUntil: number; notesUntil: number }>({
      detailsUntil: 0,
      notesUntil: 0,
    }),
  };
}

export function useOrderPdfOverlayComponentActions(args: {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  setDraft: Dispatch<SetStateAction<OrderPdfDraft | null>>;
  setZoom: Dispatch<SetStateAction<number>>;
  detailsDirtyRef: MutableRefObject<boolean>;
}): OrderPdfOverlayControllerActions {
  const { app, meta, setDraft, setZoom, detailsDirtyRef } = args;

  const close = useCallback(() => {
    runPerfAction(app, 'orderPdf.close', () => setUiOrderPdfEditorOpen(app, false, pdfUiOnlyMeta(meta)));
  }, [app, meta]);

  const persistDraft = useCallback(
    (next: OrderPdfDraft) => {
      setDraft(next);
      setUiOrderPdfEditorDraft(app, next, pdfUiOnlyMeta(meta));
    },
    [app, meta, setDraft]
  );

  const seedInitialDraft = useCallback(
    (next: OrderPdfDraft) => {
      detailsDirtyRef.current = !!next.detailsTouched;
      runHistoryBatch(app, () => {
        setUiOrderPdfEditorDraft(app, next, pdfUiOnlyMeta(meta));
        setUiOrderPdfEditorZoom(app, 1, pdfUiOnlyMeta(meta));
      });
      setDraft(next);
      setZoom(1);
    },
    [app, meta, detailsDirtyRef, setDraft, setZoom]
  );

  return {
    close,
    persistDraft,
    seedInitialDraft,
  };
}
