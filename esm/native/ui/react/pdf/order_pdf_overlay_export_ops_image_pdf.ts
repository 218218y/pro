import type {
  OrderPdfDraft,
  PdfJsDocumentLike,
  PdfJsLoadingTaskLike,
  PdfJsPageRenderFn,
  PdfJsPageViewportFn,
} from './order_pdf_overlay_contracts.js';
import {
  appendOrderPdfDetailsContinuationImagePage,
  buildOrderPdfDetailsText,
  ensureOrderPdfDejaVuLoaded,
  paintOrderPdfTextInBox,
  prepareOrderPdfTextLayout,
  resolveOrderPdfDetailsPageSplit,
} from './order_pdf_overlay_export_ops_image_pdf_support.js';
import {
  buildRasterPageLayout,
  paintRasterizedOrderTemplatePage,
} from './order_pdf_overlay_export_ops_image_pdf_layout.js';
import type {
  OrderPdfOverlayExportOpsDeps,
  PdfLibCreateDocFn,
} from './order_pdf_overlay_export_ops_shared.js';
import {
  loadPdfDocumentCtor,
  type PdfLibDocumentCtorLike,
  type PdfLibDrawablePageLike,
  type PdfLibWritableDocumentLike,
} from './order_pdf_overlay_pdf_lib.js';

function isPdfLibDrawablePageLike(value: unknown): value is PdfLibDrawablePageLike {
  return !!value && typeof value === 'object' && typeof Reflect.get(value, 'drawImage') === 'function';
}

export function createOrderPdfOverlayImagePdfOps(deps: OrderPdfOverlayExportOpsDeps) {
  const {
    docMaybe,
    winMaybe,
    ensurePdfJs,
    loadPdfLib,
    getFn,
    getProp,
    isPromiseLike,
    isRecord,
    orderPdfOverlayReportNonFatal,
    canvasToPngBytes,
  } = deps;

  async function rasterizeInteractivePdfBytesToImagePdfBytes(args: {
    inBytes: Uint8Array;
    baseFileName: string;
    draft: OrderPdfDraft;
  }): Promise<{ outBytes: Uint8Array; outName: string }> {
    const { inBytes, baseFileName, draft } = args;

    let task: PdfJsLoadingTaskLike | null = null;
    let pdfDoc: PdfJsDocumentLike | null = null;

    try {
      const doc: Document | null = docMaybe || winMaybe?.document || null;
      if (!doc) throw new Error('הדפסה לא זמינה (אין Document)');

      const pdfjs = await ensurePdfJs();
      const VL = pdfjs.VerbosityLevel;
      const verbosity =
        (VL && typeof VL.ERRORS === 'number' ? VL.ERRORS : null) ??
        (VL && typeof VL.WARNINGS === 'number' ? VL.WARNINGS : null);

      const makeTask = (disableWorker: boolean) => {
        const workerBytes = inBytes.slice();
        return pdfjs.getDocument({
          data: workerBytes,
          disableWorker,
          verbosity: typeof verbosity === 'number' ? verbosity : undefined,
        });
      };

      task = makeTask(false);
      try {
        if (!task) throw new Error('pdf.js task missing');
        pdfDoc = await task.promise;
      } catch {
        try {
          if (task && typeof task.destroy === 'function') task.destroy();
        } catch (err) {
          orderPdfOverlayReportNonFatal('orderPdfOverlay.rasterizeInteractivePdf.workerCleanup', err);
        }
        task = makeTask(true);
        if (!task) throw new Error('pdf.js task missing');
        pdfDoc = await task.promise;
      }

      const numPagesRaw = getProp(pdfDoc, 'numPages');
      const numPages = typeof numPagesRaw === 'number' && numPagesRaw >= 1 ? numPagesRaw : 1;

      const pdfLib = loadPdfLib ? await loadPdfLib() : null;
      const injectedDocumentCtor = (() => {
        if (!pdfLib || !isRecord(pdfLib)) return null;
        const ctor = getProp(pdfLib, 'PDFDocument');
        return ctor && (typeof ctor === 'object' || typeof ctor === 'function') ? ctor : null;
      })();
      const injectedCreateDoc = injectedDocumentCtor
        ? getFn<PdfLibCreateDocFn>(injectedDocumentCtor, 'create')
        : null;
      const injectedLoadDoc = injectedDocumentCtor
        ? getFn<PdfLibDocumentCtorLike['load']>(injectedDocumentCtor, 'load')
        : null;
      const fallbackDocumentCtor =
        !injectedCreateDoc || !injectedLoadDoc ? await loadPdfDocumentCtor() : null;
      const canonicalCreateDoc = injectedCreateDoc || fallbackDocumentCtor?.create;
      if (!canonicalCreateDoc) throw new Error('pdf-lib missing PDFDocument.create');

      const rasterScale = 2;
      const outDoc = await canonicalCreateDoc();
      const outDocEmbedPngFn = outDoc.embedPng;
      const outDocAddPageFn = outDoc.addPage;
      if (typeof outDocEmbedPngFn !== 'function' || typeof outDocAddPageFn !== 'function') {
        throw new Error('pdf-lib writable document surface missing');
      }
      const outDocEmbedPng: PdfLibWritableDocumentLike['embedPng'] = bytes =>
        outDocEmbedPngFn.call(outDoc, bytes);
      const outDocAddPage: PdfLibWritableDocumentLike['addPage'] = size => {
        const page = outDocAddPageFn.call(outDoc, size);
        if (!isPdfLibDrawablePageLike(page)) throw new Error('pdf-lib writable page surface missing');
        return page;
      };
      const allDetailsText = buildOrderPdfDetailsText(draft);
      const fontFamily = await ensureOrderPdfDejaVuLoaded({
        doc,
        win: winMaybe ?? null,
        getProp,
        getFn,
        isPromiseLike,
        report: orderPdfOverlayReportNonFatal,
      });
      let detailsPage1Lines: string[] | undefined;
      let detailsOverflowText = '';
      let detailsSplitDone = false;
      let lastPageW = 595;
      let lastPageH = 842;

      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const getViewport: PdfJsPageViewportFn | null =
          typeof page?.getViewport === 'function' ? page.getViewport.bind(page) : null;
        if (!page || !getViewport) throw new Error('pdf.js page.getViewport() missing');

        const baseViewport = getViewport.call(page, { scale: 1 });
        const pageW =
          typeof getProp(baseViewport, 'width') === 'number' ? Number(getProp(baseViewport, 'width')) : 595;
        const pageH =
          typeof getProp(baseViewport, 'height') === 'number' ? Number(getProp(baseViewport, 'height')) : 842;
        lastPageW = pageW;
        lastPageH = pageH;

        const viewport = getViewport.call(page, { scale: rasterScale });
        const vw = getProp(viewport, 'width');
        const vh = getProp(viewport, 'height');
        const canvasW = Math.max(1, Math.ceil((typeof vw === 'number' ? vw : 0) || pageW * rasterScale));
        const canvasH = Math.max(1, Math.ceil((typeof vh === 'number' ? vh : 0) || pageH * rasterScale));

        const canvas = doc.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context missing');

        const render: PdfJsPageRenderFn | null =
          typeof page?.render === 'function' ? page.render.bind(page) : null;
        const rt = render ? render({ canvasContext: ctx, viewport }) : null;
        const promise = getProp(rt, 'promise');
        if (!isPromiseLike(promise)) throw new Error('pdf.js render() failed');
        await promise;

        try {
          const layout = buildRasterPageLayout(pageW, pageH, canvas.width, canvas.height);
          if (!detailsSplitDone) {
            const split = resolveOrderPdfDetailsPageSplit({
              ctx,
              allText: allDetailsText,
              boxPx: layout.boxes.details,
              fontFamily,
              report: orderPdfOverlayReportNonFatal,
            });
            detailsPage1Lines = split.page1Lines;
            detailsOverflowText = split.overflowText;
            detailsSplitDone = true;
          }

          if (i === 1) {
            paintRasterizedOrderTemplatePage({
              ctx,
              draft,
              layout,
              fontFamily,
              detailsPreparedLines: detailsPage1Lines,
              report: orderPdfOverlayReportNonFatal,
            });
          }

          if (i === 2 && detailsOverflowText && detailsOverflowText.trim().length) {
            const continuationPrepared = prepareOrderPdfTextLayout({
              ctx,
              boxPx: layout.continuationBox,
              text: detailsOverflowText,
              fontPx: layout.continuationFontPx,
              multiline: true,
            });
            paintOrderPdfTextInBox({
              ctx,
              boxPx: layout.continuationBox,
              text: detailsOverflowText,
              fontPx: layout.continuationFontPx,
              fontFamily,
              dir: 'rtl',
              align: 'right',
              multiline: true,
              preparedLines: continuationPrepared.lines,
              report: orderPdfOverlayReportNonFatal,
            });
            detailsOverflowText = '';
          }

          // The interactive source PDF already contains the composed sketch pages,
          // including any freehand/text annotations baked into those exported images.
          // Repainting annotations here would duplicate them in the rasterized image-PDF path.
        } catch (err) {
          orderPdfOverlayReportNonFatal('orderPdfOverlay.rasterizeInteractivePdf.paint', err);
        }

        const pngBytes = await canvasToPngBytes(canvas, winMaybe);
        const img = await outDocEmbedPng(pngBytes);
        const outPage = outDocAddPage([pageW, pageH]);
        outPage.drawImage(img, { x: 0, y: 0, width: pageW, height: pageH });
      }

      if (detailsOverflowText && detailsOverflowText.trim().length && numPages < 2) {
        await appendOrderPdfDetailsContinuationImagePage({
          doc,
          outDoc: {
            embedPng: outDocEmbedPng,
            addPage: outDocAddPage,
          },
          pageW: lastPageW,
          pageH: lastPageH,
          rasterScale,
          overflowText: detailsOverflowText,
          fontFamily,
          report: orderPdfOverlayReportNonFatal,
          canvasToPngBytes,
          winMaybe,
        });
      }

      if (typeof outDoc.save !== 'function') throw new Error('pdf-lib save unavailable');
      const outBytes: Uint8Array = await outDoc.save();
      const outName = baseFileName.replace(/\.pdf$/i, '') + '_image.pdf';
      return { outBytes, outName };
    } finally {
      try {
        if (pdfDoc && typeof pdfDoc.destroy === 'function') pdfDoc.destroy();
      } catch (err) {
        orderPdfOverlayReportNonFatal('orderPdfOverlay.rasterizeInteractivePdf.destroyDoc', err);
      }
      try {
        if (task && typeof task.destroy === 'function') task.destroy();
      } catch (err) {
        orderPdfOverlayReportNonFatal('orderPdfOverlay.rasterizeInteractivePdf.destroyTask', err);
      }
    }
  }

  return {
    rasterizeInteractivePdfBytesToImagePdfBytes,
  };
}
