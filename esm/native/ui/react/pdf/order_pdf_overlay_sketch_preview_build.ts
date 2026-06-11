import type {
  OrderPdfDraft,
  OrderPdfSketchPreviewEntry,
  PdfJsLoadingTaskLike,
} from './order_pdf_overlay_contracts.js';
import { listOrderPdfSketchImageSlotSpecs } from './order_pdf_overlay_sketch_image_slots_runtime.js';
import {
  collectOrderPdfSketchPreviewTailPageMap,
  destroyOrderPdfSketchPreviewPdfJsSession,
  loadOrderPdfSketchPreviewPdfJsDocument,
} from './order_pdf_overlay_sketch_preview_pdf_document.js';
import { renderOrderPdfSketchPreviewPageToUrl } from './order_pdf_overlay_sketch_preview_render_page.js';

export async function buildOrderPdfSketchPreviewEntries(args: {
  draft: OrderPdfDraft;
  buildInteractivePdfBlob: (
    draft: OrderPdfDraft
  ) => Promise<{ blob: Blob; fileName: string; projectName: string }>;
  ensurePdfJs: () => Promise<{
    getDocument: (opts: { data: Uint8Array; disableWorker?: boolean }) => PdfJsLoadingTaskLike;
  }>;
  docMaybe: Document | null;
  winMaybe: Window | null | undefined;
  canvasToPngBytes: (canvas: HTMLCanvasElement, winMaybe: Window | null | undefined) => Promise<Uint8Array>;
}): Promise<OrderPdfSketchPreviewEntry[]> {
  const built = await args.buildInteractivePdfBlob(args.draft);
  const pdfBytes = new Uint8Array(await built.blob.arrayBuffer());
  const pageMap = await collectOrderPdfSketchPreviewTailPageMap(pdfBytes);
  const entries: OrderPdfSketchPreviewEntry[] = [];
  const { task, pdfDoc } = await loadOrderPdfSketchPreviewPdfJsDocument({
    ensurePdfJs: args.ensurePdfJs,
    pdfBytes,
  });

  try {
    for (const spec of listOrderPdfSketchImageSlotSpecs()) {
      const pageIndex = pageMap[spec.key];
      if (typeof pageIndex !== 'number') continue;
      const rendered = await renderOrderPdfSketchPreviewPageToUrl({
        pdfDoc,
        pageIndex,
        docMaybe: args.docMaybe,
        winMaybe: args.winMaybe,
        canvasToPngBytes: args.canvasToPngBytes,
      });
      if (!rendered) continue;
      entries.push({
        key: spec.key,
        label: spec.previewLabel,
        url: rendered.url,
        width: rendered.width,
        height: rendered.height,
        pageIndex,
      });
    }
  } finally {
    destroyOrderPdfSketchPreviewPdfJsSession({ pdfDoc, task });
  }

  return entries;
}
