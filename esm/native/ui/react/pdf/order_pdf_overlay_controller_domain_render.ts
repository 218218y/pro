import type { PdfJsDocumentLike, PdfJsLibLike, PdfJsLoadingTaskLike } from './order_pdf_overlay_contracts.js';
import type { UiFeedbackLike } from './order_pdf_overlay_controller_domain_feedback.js';
import type { PdfJsPageReadyLike, PdfJsRenderTaskLike } from './order_pdf_overlay_pdf_render.js';

export type PdfRenderApi = {
  cleanupOrderPdfDocTask: (
    pdfDocTaskRef: { current: PdfJsLoadingTaskLike | null },
    reportNonFatal: (op: string, err: unknown, dedupeMs?: number) => void
  ) => void;
  cleanupOrderPdfLoadedDocument: (args: {
    pdfRenderTaskRef: { current: PdfJsRenderTaskLike | null };
    pdfDocTaskRef: { current: PdfJsLoadingTaskLike | null };
    pdfDocRef: { current: PdfJsDocumentLike | null };
    pageRef: { current: PdfJsPageReadyLike | null };
    pageSizeRef: { current: { w: number; h: number } | null };
    lastLoadedPdfTickRef: { current: number };
    reportNonFatal: (op: string, err: unknown, dedupeMs?: number) => void;
  }) => void;
  ensureOrderPdfJs: (args: {
    app: unknown;
    realWorkerUrl: string;
    pdfJsRef: { current: PdfJsLibLike | null };
    reportNonFatal: (op: string, err: unknown, dedupeMs?: number) => void;
  }) => Promise<PdfJsLibLike>;
  fetchOrderPdfTemplateBytes: (args: {
    pdfTemplateBytesRef: { current: Uint8Array | null };
    fetchFirstOk: (urls: string[]) => Promise<Uint8Array | null>;
    withV: (urls: string[]) => string[];
    fb: UiFeedbackLike;
  }) => Promise<Uint8Array | null>;
  isOrderPdfLoadCancelled: (err: unknown) => boolean;
  loadOrderPdfFirstPage: (args: {
    ensurePdfJs: () => Promise<PdfJsLibLike>;
    pdfBytesRef: { current: Uint8Array | null };
    pdfSourceTick: number;
    lastLoadedPdfTickRef: { current: number };
    pdfRenderTaskRef: { current: PdfJsRenderTaskLike | null };
    pdfDocTaskRef: { current: PdfJsLoadingTaskLike | null };
    pdfDocRef: { current: PdfJsDocumentLike | null };
    pageRef: { current: PdfJsPageReadyLike | null };
    pageSizeRef: { current: { w: number; h: number } | null };
    isCancelled: () => boolean;
    reportNonFatal: (op: string, err: unknown, dedupeMs?: number) => void;
  }) => Promise<boolean>;
  resetOrderPdfRenderSession: (args: {
    pdfRenderTaskRef: { current: PdfJsRenderTaskLike | null };
    pdfDocTaskRef: { current: PdfJsLoadingTaskLike | null };
    pdfDocRef: { current: PdfJsDocumentLike | null };
    pageRef: { current: PdfJsPageReadyLike | null };
    pageSizeRef: { current: { w: number; h: number } | null };
    pdfBytesRef: { current: Uint8Array | null };
    loadedPdfOriginalBytesRef: { current: Uint8Array | null };
    loadedPdfTailNonFormPageIndexesRef: { current: number[] };
    lastLoadedPdfTickRef: { current: number };
    reportNonFatal: (op: string, err: unknown, dedupeMs?: number) => void;
  }) => void;
  scheduleOrderPdfCanvasRender: (args: {
    openRef: { current: boolean };
    canvasRef: { current: HTMLCanvasElement | null };
    containerRef: { current: HTMLDivElement | null };
    pageRef: { current: PdfJsPageReadyLike | null };
    pdfRenderTaskRef: { current: PdfJsRenderTaskLike | null };
    pdfRenderQueueRef: { current: Promise<void> };
    pdfRenderReqIdRef: { current: number };
    zoom: number;
    app: unknown;
    fb: UiFeedbackLike;
    reportNonFatal: (op: string, err: unknown, dedupeMs?: number) => void;
  }) => () => void;
};
