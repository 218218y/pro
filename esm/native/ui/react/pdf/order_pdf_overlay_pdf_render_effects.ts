import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type { PdfJsDocumentLike, PdfJsLibLike, PdfJsLoadingTaskLike } from './order_pdf_overlay_contracts.js';
import type { PdfRenderApi, RuntimeApi, UiFeedbackLike } from './order_pdf_overlay_controller_shared.js';
import type { PdfJsPageReadyLike, PdfJsRenderTaskLike } from './order_pdf_overlay_pdf_render.js';

export function useOrderPdfOverlayPdfRenderEffects(args: {
  open: boolean;
  zoom: number;
  pdfPageReadyTick: number;
  pdfSourceTick: number;
  app: unknown;
  fb: UiFeedbackLike;
  withV: (urls: string[]) => string[];
  ensurePdfJs: () => Promise<PdfJsLibLike>;
  setPdfPageReadyTick: Dispatch<SetStateAction<number>>;
  setImportedPdfImagePageCount: Dispatch<SetStateAction<number>>;
  setDragOver: Dispatch<SetStateAction<boolean>>;
  canvasRef: { current: HTMLCanvasElement | null };
  containerRef: { current: HTMLDivElement | null };
  pdfTemplateBytesRef: { current: Uint8Array | null };
  pdfBytesRef: { current: Uint8Array | null };
  loadedPdfOriginalBytesRef: { current: Uint8Array | null };
  loadedPdfTailNonFormPageIndexesRef: { current: number[] };
  pdfDocRef: { current: PdfJsDocumentLike | null };
  pdfDocTaskRef: { current: PdfJsLoadingTaskLike | null };
  pageRef: { current: PdfJsPageReadyLike | null };
  pageSizeRef: { current: { w: number; h: number } | null };
  pdfRenderTaskRef: { current: PdfJsRenderTaskLike | null };
  pdfRenderQueueRef: { current: Promise<void> };
  pdfRenderReqIdRef: { current: number };
  openRef: { current: boolean };
  lastLoadedPdfTickRef: { current: number };
  fetchFirstOk: RuntimeApi['fetchFirstOk'];
  pdfRenderApi: PdfRenderApi;
  reportNonFatal: (op: string, err: unknown, dedupeMs?: number) => void;
}): void {
  const {
    open,
    zoom,
    pdfPageReadyTick,
    pdfSourceTick,
    app,
    fb,
    withV,
    ensurePdfJs,
    setPdfPageReadyTick,
    setImportedPdfImagePageCount,
    setDragOver,
    canvasRef,
    containerRef,
    pdfTemplateBytesRef,
    pdfBytesRef,
    loadedPdfOriginalBytesRef,
    loadedPdfTailNonFormPageIndexesRef,
    pdfDocRef,
    pdfDocTaskRef,
    pageRef,
    pageSizeRef,
    pdfRenderTaskRef,
    pdfRenderQueueRef,
    pdfRenderReqIdRef,
    openRef,
    lastLoadedPdfTickRef,
    fetchFirstOk,
    pdfRenderApi,
    reportNonFatal,
  } = args;

  useEffect(() => {
    openRef.current = open;
  }, [open, openRef]);

  useEffect(() => {
    if (!open) {
      pdfRenderApi.resetOrderPdfRenderSession({
        pdfRenderTaskRef,
        pdfDocTaskRef,
        pdfDocRef,
        pageRef,
        pageSizeRef,
        pdfBytesRef,
        loadedPdfOriginalBytesRef,
        loadedPdfTailNonFormPageIndexesRef,
        lastLoadedPdfTickRef,
        reportNonFatal,
      });
      try {
        setImportedPdfImagePageCount(0);
      } catch (__wpErr) {
        reportNonFatal('orderPdfRender:imagePageCountReset', __wpErr);
      }
      try {
        setDragOver(false);
      } catch (__wpErr) {
        reportNonFatal('orderPdfRender:dragReset', __wpErr);
      }
      return;
    }

    let cancelled = false;
    (async () => {
      const templateBytes = await pdfRenderApi.fetchOrderPdfTemplateBytes({
        pdfTemplateBytesRef,
        fetchFirstOk,
        withV,
        fb,
      });
      if (!templateBytes) return;
      if (!pdfBytesRef.current) pdfBytesRef.current = templateBytes;

      const loaded = await pdfRenderApi.loadOrderPdfFirstPage({
        ensurePdfJs,
        pdfBytesRef,
        pdfSourceTick,
        lastLoadedPdfTickRef,
        pdfRenderTaskRef,
        pdfDocTaskRef,
        pdfDocRef,
        pageRef,
        pageSizeRef,
        isCancelled: () => cancelled,
        reportNonFatal,
      });
      if (loaded) setPdfPageReadyTick(t => t + 1);
    })().catch(err => {
      if (cancelled) return;
      console.warn('[WardrobePro][PDF editor] load failed', err);
      fb.toast('שגיאה בטעינת ה-PDF', 'error');
    });

    return () => {
      cancelled = true;
      pdfRenderApi.cleanupOrderPdfDocTask(pdfDocTaskRef, reportNonFatal);
    };
  }, [
    open,
    ensurePdfJs,
    pdfSourceTick,
    setImportedPdfImagePageCount,
    setDragOver,
    setPdfPageReadyTick,
    pdfTemplateBytesRef,
    pdfBytesRef,
    loadedPdfOriginalBytesRef,
    loadedPdfTailNonFormPageIndexesRef,
    pdfDocRef,
    pdfDocTaskRef,
    pageRef,
    pageSizeRef,
    pdfRenderTaskRef,
    lastLoadedPdfTickRef,
    fetchFirstOk,
    withV,
    fb,
    pdfRenderApi,
    reportNonFatal,
  ]);

  useEffect(() => {
    if (!open) return;
    return pdfRenderApi.scheduleOrderPdfCanvasRender({
      openRef,
      canvasRef,
      containerRef,
      pageRef,
      pdfRenderTaskRef,
      pdfRenderQueueRef,
      pdfRenderReqIdRef,
      zoom,
      app,
      fb,
      reportNonFatal,
    });
  }, [
    open,
    zoom,
    pdfPageReadyTick,
    app,
    fb,
    openRef,
    canvasRef,
    containerRef,
    pageRef,
    pdfRenderTaskRef,
    pdfRenderQueueRef,
    pdfRenderReqIdRef,
    pdfRenderApi,
    reportNonFatal,
  ]);
}
