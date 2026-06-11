import type { PdfJsDocumentLike, PdfJsLoadingTaskLike } from './order_pdf_overlay_contracts.js';
import { errorNameMessage } from './order_pdf_overlay_runtime.js';

export type RefBox<T> = { current: T };

export type ReportNonFatal = (op: string, err: unknown, dedupeMs?: number) => void;
export type ToastLike = { toast: (message: string, level: 'success' | 'warning' | 'error' | 'info') => void };

export type PdfJsRenderTaskLike = {
  promise: Promise<unknown>;
  cancel?: () => void;
};

export type PdfViewportLike = { width: number; height: number };
export type PdfJsPageReadyLike = {
  view?: number[];
  getViewport: (opts: { scale: number }) => PdfViewportLike;
  render: (opts: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewportLike;
  }) => PdfJsRenderTaskLike;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isPdfJsPageReadyLike(page: unknown): page is PdfJsPageReadyLike {
  return isRecord(page) && typeof page.getViewport === 'function' && typeof page.render === 'function';
}

export function asPdfJsPageReadyLike(page: unknown): PdfJsPageReadyLike | null {
  return isPdfJsPageReadyLike(page) ? page : null;
}

export function clonePdfBytes(bytes: Uint8Array | null | undefined): Uint8Array | null {
  if (!(bytes instanceof Uint8Array)) return null;
  return bytes.slice();
}

export function cleanupOrderPdfRenderTask(
  pdfRenderTaskRef: RefBox<PdfJsRenderTaskLike | null>,
  reportNonFatal: ReportNonFatal
): void {
  try {
    const rt = pdfRenderTaskRef.current;
    if (rt && typeof rt.cancel === 'function') rt.cancel();
  } catch (__wpErr) {
    reportNonFatal('orderPdfRender:cleanupRenderTask', __wpErr);
  }
  pdfRenderTaskRef.current = null;
}

export function cleanupOrderPdfDocTask(
  pdfDocTaskRef: RefBox<PdfJsLoadingTaskLike | null>,
  reportNonFatal: ReportNonFatal
): void {
  try {
    const t = pdfDocTaskRef.current;
    if (t) {
      if (typeof t.destroy === 'function') t.destroy();
      if (typeof t.cancel === 'function') t.cancel();
    }
  } catch (__wpErr) {
    reportNonFatal('orderPdfRender:cleanupDocTask', __wpErr);
  }
  pdfDocTaskRef.current = null;
}

export function cleanupOrderPdfDoc(
  pdfDocRef: RefBox<PdfJsDocumentLike | null>,
  reportNonFatal: ReportNonFatal
): void {
  try {
    const d = pdfDocRef.current;
    if (d && typeof d.destroy === 'function') d.destroy();
  } catch (__wpErr) {
    reportNonFatal('orderPdfRender:cleanupDoc', __wpErr);
  }
  pdfDocRef.current = null;
}

export function cleanupOrderPdfLoadedDocument(args: {
  pdfRenderTaskRef: RefBox<PdfJsRenderTaskLike | null>;
  pdfDocTaskRef: RefBox<PdfJsLoadingTaskLike | null>;
  pdfDocRef: RefBox<PdfJsDocumentLike | null>;
  pageRef: RefBox<PdfJsPageReadyLike | null>;
  pageSizeRef: RefBox<{ w: number; h: number } | null>;
  lastLoadedPdfTickRef: RefBox<number>;
  reportNonFatal: ReportNonFatal;
}): void {
  const {
    pdfRenderTaskRef,
    pdfDocTaskRef,
    pdfDocRef,
    pageRef,
    pageSizeRef,
    lastLoadedPdfTickRef,
    reportNonFatal,
  } = args;

  cleanupOrderPdfRenderTask(pdfRenderTaskRef, reportNonFatal);
  cleanupOrderPdfDocTask(pdfDocTaskRef, reportNonFatal);
  cleanupOrderPdfDoc(pdfDocRef, reportNonFatal);
  pageRef.current = null;
  pageSizeRef.current = null;
  lastLoadedPdfTickRef.current = -1;
}

export function resetOrderPdfRenderSession(args: {
  pdfRenderTaskRef: RefBox<PdfJsRenderTaskLike | null>;
  pdfDocTaskRef: RefBox<PdfJsLoadingTaskLike | null>;
  pdfDocRef: RefBox<PdfJsDocumentLike | null>;
  pageRef: RefBox<PdfJsPageReadyLike | null>;
  pageSizeRef: RefBox<{ w: number; h: number } | null>;
  pdfBytesRef: RefBox<Uint8Array | null>;
  loadedPdfOriginalBytesRef: RefBox<Uint8Array | null>;
  loadedPdfTailNonFormPageIndexesRef: RefBox<number[]>;
  lastLoadedPdfTickRef: RefBox<number>;
  reportNonFatal: ReportNonFatal;
}): void {
  const {
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
  } = args;

  cleanupOrderPdfLoadedDocument({
    pdfRenderTaskRef,
    pdfDocTaskRef,
    pdfDocRef,
    pageRef,
    pageSizeRef,
    lastLoadedPdfTickRef,
    reportNonFatal,
  });
  pdfBytesRef.current = null;
  loadedPdfOriginalBytesRef.current = null;
  loadedPdfTailNonFormPageIndexesRef.current = [];
  lastLoadedPdfTickRef.current = -1;
}

export function isOrderPdfLoadCancelled(err: unknown): boolean {
  const { name, message } = errorNameMessage(err);
  const msg = String(message || '').toLowerCase();
  const errName = String(name || '').toLowerCase();
  if (errName.includes('abort')) return true;
  if (msg.includes('worker was destroyed')) return true;
  if (msg.includes('loading aborted')) return true;
  if (msg.includes('abortexception')) return true;
  if (msg.includes('cancelled')) return true;
  if (msg.includes('canceled')) return true;
  if (msg.includes('destroyed') && msg.includes('worker')) return true;
  return false;
}

export function isOrderPdfRenderCancelled(err: unknown): boolean {
  if (isOrderPdfLoadCancelled(err)) return true;
  const { message: msg } = errorNameMessage(err);
  if (msg.includes('Rendering cancelled')) return true;
  if (msg.includes('cancel') && msg.includes('render')) return true;
  return false;
}
