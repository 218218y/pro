import type {
  PdfJsDocumentLike,
  PdfJsPageRenderFn,
  PdfJsPageViewportFn,
} from './order_pdf_overlay_contracts.js';
import {
  getOrderPdfSketchPreviewBlobCtor,
  getOrderPdfSketchPreviewUrlApi,
} from './order_pdf_overlay_sketch_preview_url_lifecycle.js';

export async function renderOrderPdfSketchPreviewPageToUrl(args: {
  pdfDoc: PdfJsDocumentLike;
  pageIndex: number;
  docMaybe: Document | null;
  winMaybe: Window | null | undefined;
  canvasToPngBytes: (canvas: HTMLCanvasElement, winMaybe: Window | null | undefined) => Promise<Uint8Array>;
}): Promise<{ url: string; width: number; height: number } | null> {
  const { pdfDoc, pageIndex, docMaybe, winMaybe, canvasToPngBytes } = args;
  if (!docMaybe) return null;
  const page = await pdfDoc.getPage(pageIndex + 1);
  const getViewport: PdfJsPageViewportFn | null =
    typeof page?.getViewport === 'function' ? page.getViewport.bind(page) : null;
  const render: PdfJsPageRenderFn | null = typeof page?.render === 'function' ? page.render.bind(page) : null;
  if (!getViewport || !render) return null;

  const viewport = getViewport({ scale: 1.15 });
  const canvas = docMaybe.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const task = render({ canvasContext: ctx, viewport });
  await task.promise;

  const pngBytes = await canvasToPngBytes(canvas, winMaybe);
  const BlobCtor = getOrderPdfSketchPreviewBlobCtor(winMaybe);
  const urlApi = getOrderPdfSketchPreviewUrlApi(winMaybe);
  if (!BlobCtor || !urlApi) return null;
  const copy = new Uint8Array(pngBytes.byteLength);
  copy.set(pngBytes);
  const blob = new BlobCtor([copy], { type: 'image/png' });
  return {
    url: urlApi.createObjectURL(blob),
    width: canvas.width,
    height: canvas.height,
  };
}
