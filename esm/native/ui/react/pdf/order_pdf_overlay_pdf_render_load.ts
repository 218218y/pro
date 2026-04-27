import type { PdfJsDocumentLike, PdfJsLibLike, PdfJsLoadingTaskLike } from './order_pdf_overlay_contracts.js';
import {
  createSilentPdfJsWorkerUrl,
  getPdfJsLibFromModule,
  getProp,
  isPromiseLike,
} from './order_pdf_overlay_runtime.js';
import {
  asPdfJsPageReadyLike,
  cleanupOrderPdfDoc,
  cleanupOrderPdfDocTask,
  cleanupOrderPdfRenderTask,
  clonePdfBytes,
  type PdfJsPageReadyLike,
  type PdfJsRenderTaskLike,
  type RefBox,
  type ReportNonFatal,
  type ToastLike,
} from './order_pdf_overlay_pdf_render_shared.js';

let orderPdfTemplateBytesShared: Uint8Array | null = null;
let orderPdfTemplateBytesPromise: Promise<Uint8Array | null> | null = null;

function applyPdfJsWorkerAndVerbosity(args: {
  app: unknown;
  realWorkerUrl: string;
  lib: PdfJsLibLike;
  reportNonFatal: ReportNonFatal;
}): void {
  const { app, realWorkerUrl, lib, reportNonFatal } = args;

  try {
    if (realWorkerUrl && lib?.GlobalWorkerOptions) {
      lib.GlobalWorkerOptions.workerSrc = createSilentPdfJsWorkerUrl(app, realWorkerUrl);
    }
  } catch (__wpErr) {
    reportNonFatal('orderPdfRender:workerSrc', __wpErr);
  }

  try {
    const VL = lib.VerbosityLevel;
    const lvl =
      (VL && typeof VL.ERRORS === 'number' ? VL.ERRORS : null) ??
      (VL && typeof VL.WARNINGS === 'number' ? VL.WARNINGS : null);
    if (typeof lvl === 'number') {
      if (typeof lib.setVerbosityLevel === 'function') {
        lib.setVerbosityLevel(lvl);
      } else if (typeof lib.verbosity === 'number') {
        lib.verbosity = lvl;
      } else if (lib.PDFJS && typeof lib.PDFJS.verbosity === 'number') {
        lib.PDFJS.verbosity = lvl;
      }
    }
  } catch (__wpErr) {
    reportNonFatal('orderPdfRender:verbosity', __wpErr);
  }
}

async function loadOrderPdfJsModule(args: {
  app: unknown;
  realWorkerUrl: string;
  reportNonFatal: ReportNonFatal;
}): Promise<PdfJsLibLike> {
  const { app, realWorkerUrl, reportNonFatal } = args;
  const mod = await import('pdfjs-dist/build/pdf.mjs');
  const lib = getPdfJsLibFromModule(mod);
  if (!lib) throw new Error('[WardrobePro][PDF editor] pdf.js module missing getDocument');
  applyPdfJsWorkerAndVerbosity({ app, realWorkerUrl, lib, reportNonFatal });
  return lib;
}

async function getSharedOrderPdfTemplateBytes(args: {
  fetchFirstOk: (urls: string[]) => Promise<Uint8Array | null>;
  withV: (urls: string[]) => string[];
  fb: ToastLike;
}): Promise<Uint8Array | null> {
  const { fetchFirstOk, withV, fb } = args;
  if (orderPdfTemplateBytesShared) return orderPdfTemplateBytesShared;

  if (!orderPdfTemplateBytesPromise) {
    orderPdfTemplateBytesPromise = fetchFirstOk(
      withV(['/order_template.pdf', './order_template.pdf', 'order_template.pdf'])
    )
      .then(pdfBytes => {
        if (!pdfBytes) {
          fb.toast('תבנית PDF חסרה (order_template.pdf)', 'error');
          return null;
        }
        orderPdfTemplateBytesShared = pdfBytes;
        return pdfBytes;
      })
      .catch(err => {
        orderPdfTemplateBytesPromise = null;
        throw err;
      });
  }

  return await orderPdfTemplateBytesPromise;
}

export async function ensureOrderPdfJs(args: {
  app: unknown;
  realWorkerUrl: string;
  pdfJsRef: RefBox<PdfJsLibLike | null>;
  reportNonFatal: ReportNonFatal;
}): Promise<PdfJsLibLike> {
  const { app, realWorkerUrl, pdfJsRef, reportNonFatal } = args;
  if (pdfJsRef.current) return pdfJsRef.current;

  const lib = await loadOrderPdfJsModule({ app, realWorkerUrl, reportNonFatal });
  pdfJsRef.current = lib;
  return lib;
}

export async function loadOrderPdfFirstPage(args: {
  ensurePdfJs: () => Promise<PdfJsLibLike>;
  pdfBytesRef: RefBox<Uint8Array | null>;
  pdfSourceTick: number;
  lastLoadedPdfTickRef: RefBox<number>;
  pdfRenderTaskRef: RefBox<PdfJsRenderTaskLike | null>;
  pdfDocTaskRef: RefBox<PdfJsLoadingTaskLike | null>;
  pdfDocRef: RefBox<PdfJsDocumentLike | null>;
  pageRef: RefBox<PdfJsPageReadyLike | null>;
  pageSizeRef: RefBox<{ w: number; h: number } | null>;
  isCancelled: () => boolean;
  reportNonFatal: ReportNonFatal;
}): Promise<boolean> {
  const {
    ensurePdfJs,
    pdfBytesRef,
    pdfSourceTick,
    lastLoadedPdfTickRef,
    pdfRenderTaskRef,
    pdfDocTaskRef,
    pdfDocRef,
    pageRef,
    pageSizeRef,
    isCancelled,
    reportNonFatal,
  } = args;

  const pdfjs = await ensurePdfJs();
  if (isCancelled()) return false;

  if (pageRef.current && pdfDocRef.current && lastLoadedPdfTickRef.current === pdfSourceTick) return false;

  if (pageRef.current && (lastLoadedPdfTickRef.current !== pdfSourceTick || !pdfDocRef.current)) {
    cleanupOrderPdfRenderTask(pdfRenderTaskRef, reportNonFatal);
    cleanupOrderPdfDocTask(pdfDocTaskRef, reportNonFatal);
    cleanupOrderPdfDoc(pdfDocRef, reportNonFatal);
    pageRef.current = null;
    pageSizeRef.current = null;
  }

  const pdfBytesForWorker = clonePdfBytes(pdfBytesRef.current);
  if (!pdfBytesForWorker || !pdfBytesForWorker.byteLength) {
    throw new Error('[WardrobePro][PDF editor] Missing PDF bytes for editor background');
  }

  const task = pdfjs.getDocument({
    data: pdfBytesForWorker,
    disableWorker: false,
    verbosity: pdfjs.VerbosityLevel?.ERRORS ?? pdfjs.VerbosityLevel?.WARNINGS,
  });

  try {
    const p = getProp(task, 'promise');
    if (!isPromiseLike(p)) {
      throw new Error('[WardrobePro][PDF editor] pdf.js getDocument() returned an invalid task');
    }
  } catch {
    throw new Error('[WardrobePro][PDF editor] pdf.js getDocument() returned an invalid task');
  }

  pdfDocTaskRef.current = task;
  const pdfDoc = await task.promise;
  if (isCancelled()) {
    try {
      if (pdfDoc && typeof pdfDoc.destroy === 'function') pdfDoc.destroy();
    } catch (__wpErr) {
      reportNonFatal('orderPdfRender:destroyCancelledDoc', __wpErr);
    }
    cleanupOrderPdfDocTask(pdfDocTaskRef, reportNonFatal);
    pdfDocRef.current = null;
    pageRef.current = null;
    pageSizeRef.current = null;
    return false;
  }
  pdfDocRef.current = pdfDoc;

  const page = await pdfDoc.getPage(1);
  if (isCancelled()) {
    cleanupOrderPdfDocTask(pdfDocTaskRef, reportNonFatal);
    cleanupOrderPdfDoc(pdfDocRef, reportNonFatal);
    pageRef.current = null;
    pageSizeRef.current = null;
    return false;
  }
  pageRef.current = asPdfJsPageReadyLike(page);

  const view = pageRef.current?.view || page.view;
  const pw = (view && view[2] ? view[2] : 595) - (view && view[0] ? view[0] : 0);
  const ph = (view && view[3] ? view[3] : 842) - (view && view[1] ? view[1] : 0);
  pageSizeRef.current = { w: pw, h: ph };
  lastLoadedPdfTickRef.current = pdfSourceTick;
  return true;
}

export async function warmOrderPdfEditorOpenPath(args: {
  app: unknown;
  realWorkerUrl?: string;
  withV: (urls: string[]) => string[];
  fetchFirstOk?: (urls: string[]) => Promise<Uint8Array | null>;
  reportNonFatal?: ReportNonFatal;
}): Promise<void> {
  const { app, realWorkerUrl = '', withV, fetchFirstOk, reportNonFatal } = args;
  const report = reportNonFatal || (() => undefined);

  await loadOrderPdfJsModule({
    app,
    realWorkerUrl,
    reportNonFatal: report,
  }).catch(err => {
    report('orderPdfRender:warmPdfJs', err);
    return null;
  });

  if (typeof fetchFirstOk === 'function') {
    await getSharedOrderPdfTemplateBytes({
      fetchFirstOk,
      withV,
      fb: { toast: () => undefined },
    }).catch(err => {
      report('orderPdfRender:warmTemplate', err);
      return null;
    });
  }
}

export async function fetchOrderPdfTemplateBytes(args: {
  pdfTemplateBytesRef: RefBox<Uint8Array | null>;
  fetchFirstOk: (urls: string[]) => Promise<Uint8Array | null>;
  withV: (urls: string[]) => string[];
  fb: ToastLike;
}): Promise<Uint8Array | null> {
  const { pdfTemplateBytesRef, fetchFirstOk, withV, fb } = args;
  if (pdfTemplateBytesRef.current) return pdfTemplateBytesRef.current;

  const pdfBytes = await getSharedOrderPdfTemplateBytes({ fetchFirstOk, withV, fb });
  if (!pdfBytes) return null;
  pdfTemplateBytesRef.current = pdfBytes;
  return pdfTemplateBytesRef.current;
}
