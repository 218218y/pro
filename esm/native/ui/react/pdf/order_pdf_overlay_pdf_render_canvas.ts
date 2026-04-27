import { getBrowserTimers, getWindowMaybe } from '../../../services/api.js';
import {
  asPdfJsPageReadyLike,
  cleanupOrderPdfRenderTask,
  isOrderPdfRenderCancelled,
  type PdfJsPageReadyLike,
  type PdfJsRenderTaskLike,
  type RefBox,
  type ReportNonFatal,
  type ToastLike,
} from './order_pdf_overlay_pdf_render_shared.js';

export function scheduleOrderPdfCanvasRender(args: {
  openRef: RefBox<boolean>;
  canvasRef: RefBox<HTMLCanvasElement | null>;
  containerRef: RefBox<HTMLDivElement | null>;
  pageRef: RefBox<PdfJsPageReadyLike | null>;
  pdfRenderTaskRef: RefBox<PdfJsRenderTaskLike | null>;
  pdfRenderQueueRef: RefBox<Promise<void>>;
  pdfRenderReqIdRef: RefBox<number>;
  zoom: number;
  app: unknown;
  fb: ToastLike;
  reportNonFatal: ReportNonFatal;
}): () => void {
  const {
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
  } = args;

  const canvas = canvasRef.current;
  const page = pageRef.current;
  if (!canvas || !page) return () => {};

  const reqId = (pdfRenderReqIdRef.current = pdfRenderReqIdRef.current + 1);
  cleanupOrderPdfRenderTask(pdfRenderTaskRef, reportNonFatal);

  const timers = getBrowserTimers(app);
  let isActive = true;
  const timer = timers.setTimeout(() => {
    if (!isActive) return;
    pdfRenderQueueRef.current = pdfRenderQueueRef.current
      .catch(() => {
        // keep queue alive
      })
      .then(async () => {
        if (!isActive) return;
        if (!openRef.current) return;
        if (reqId !== pdfRenderReqIdRef.current) return;

        const pageNow = pageRef.current;
        const canvasNow = canvasRef.current;
        if (!pageNow || !canvasNow) return;

        const w = getWindowMaybe(app);
        const dpr =
          w && typeof w.devicePixelRatio === 'number' && Number.isFinite(w.devicePixelRatio)
            ? w.devicePixelRatio
            : 1;

        if (typeof pageNow.getViewport !== 'function' || typeof pageNow.render !== 'function') return;
        const pageReady = asPdfJsPageReadyLike(pageNow);
        if (!pageReady) return;
        const viewport = pageReady.getViewport({ scale: zoom * dpr });

        canvasNow.width = Math.max(1, Math.floor(viewport.width));
        canvasNow.height = Math.max(1, Math.floor(viewport.height));
        canvasNow.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvasNow.style.height = `${Math.floor(viewport.height / dpr)}px`;

        const ctx = canvasNow.getContext('2d', { alpha: false });
        if (!ctx) return;

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasNow.width, canvasNow.height);
        ctx.restore();

        const renderTask = pageReady.render({ canvasContext: ctx, viewport });
        pdfRenderTaskRef.current = renderTask;

        try {
          await renderTask.promise;
        } catch (err) {
          if (isOrderPdfRenderCancelled(err)) return;
          throw err;
        } finally {
          if (pdfRenderTaskRef.current === renderTask) pdfRenderTaskRef.current = null;
        }

        if (!isActive) return;
        if (!openRef.current) return;
        if (reqId !== pdfRenderReqIdRef.current) return;

        const cont = containerRef.current;
        if (cont) {
          cont.style.width = canvasNow.style.width;
          cont.style.height = canvasNow.style.height;
        }
      })
      .catch(err => {
        console.warn('[WardrobePro][PDF editor] render failed', err);
        fb.toast('שגיאה בהצגת ה-PDF', 'error');
      });
  }, 0);

  return () => {
    isActive = false;
    timers.clearTimeout(timer);
    cleanupOrderPdfRenderTask(pdfRenderTaskRef, reportNonFatal);
  };
}
