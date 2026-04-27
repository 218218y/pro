import type {
  OrderPdfDraft,
  OrderPdfSketchPreviewEntry,
  PdfJsDocumentLike,
  PdfJsLoadingTaskLike,
  PdfJsPageRenderFn,
  PdfJsPageViewportFn,
} from './order_pdf_overlay_contracts.js';
import { collectTrailingNonFormPageIndexes } from './order_pdf_overlay_pdf_import_shared.js';
import {
  listOrderPdfSketchImageSlotSpecs,
  resolveOrderPdfSketchImageTailPageMap,
} from './order_pdf_overlay_sketch_image_slots_runtime.js';
import { loadPdfDocumentCtor } from './order_pdf_overlay_pdf_lib.js';

type BlobCtor = typeof Blob;
type UrlApi = Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>;
type UnknownRecord = Record<string, unknown>;

export function createOrderPdfSketchPreviewDraft(draft: OrderPdfDraft): OrderPdfDraft {
  if (!draft?.sketchAnnotations) return draft;
  return {
    ...draft,
    sketchAnnotations: undefined,
  };
}

function isUnknownRecord(value: unknown): value is UnknownRecord {
  return !!value && (typeof value === 'object' || typeof value === 'function');
}

function isBlobCtor(value: unknown): value is BlobCtor {
  return typeof value === 'function';
}

function isUrlApi(value: unknown): value is UrlApi {
  return (
    !!value &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof Reflect.get(value, 'createObjectURL') === 'function' &&
    typeof Reflect.get(value, 'revokeObjectURL') === 'function'
  );
}

function getBlobCtor(winMaybe: Window | null | undefined): BlobCtor | null {
  const candidate = isUnknownRecord(winMaybe) ? Reflect.get(winMaybe, 'Blob') : null;
  if (isBlobCtor(candidate)) return candidate;
  return typeof Blob === 'function' ? Blob : null;
}

function getUrlApi(winMaybe: Window | null | undefined): UrlApi | null {
  const api = isUnknownRecord(winMaybe)
    ? Reflect.get(winMaybe, 'URL')
    : typeof URL === 'function'
      ? URL
      : null;
  return isUrlApi(api) ? api : null;
}

export function revokeOrderPdfSketchPreviewEntries(
  entries: readonly OrderPdfSketchPreviewEntry[] | null | undefined,
  winMaybe: Window | null | undefined
): void {
  const urlApi = getUrlApi(winMaybe);
  if (!urlApi || !Array.isArray(entries)) return;
  for (const entry of entries) {
    if (!entry || typeof entry.url !== 'string' || !entry.url) continue;
    try {
      urlApi.revokeObjectURL(entry.url);
    } catch {
      // best effort only
    }
  }
}

async function collectSketchTailPageMap(
  pdfBytes: Uint8Array
): Promise<Partial<Record<'renderSketch' | 'openClosed', number>>> {
  try {
    const PDFDocument = await loadPdfDocumentCtor();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const tailIndexes = await collectTrailingNonFormPageIndexes(pdfDoc);
    return resolveOrderPdfSketchImageTailPageMap(tailIndexes);
  } catch {
    return {};
  }
}

async function loadPdfJsDocument(args: {
  ensurePdfJs: () => Promise<{
    getDocument: (opts: { data: Uint8Array; disableWorker?: boolean }) => PdfJsLoadingTaskLike;
  }>;
  pdfBytes: Uint8Array;
}): Promise<{ task: PdfJsLoadingTaskLike; pdfDoc: PdfJsDocumentLike }> {
  const pdfjs = await args.ensurePdfJs();
  let task = pdfjs.getDocument({ data: args.pdfBytes.slice(), disableWorker: false });
  try {
    return { task, pdfDoc: await task.promise };
  } catch {
    try {
      if (typeof task.destroy === 'function') task.destroy();
    } catch {
      // ignore worker cleanup failure and fall back to no-worker mode
    }
    task = pdfjs.getDocument({ data: args.pdfBytes.slice(), disableWorker: true });
    return { task, pdfDoc: await task.promise };
  }
}

async function renderPreviewPageToUrl(args: {
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
  const BlobCtor = getBlobCtor(winMaybe);
  const urlApi = getUrlApi(winMaybe);
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
  const pageMap = await collectSketchTailPageMap(pdfBytes);
  const entries: OrderPdfSketchPreviewEntry[] = [];
  const { task, pdfDoc } = await loadPdfJsDocument({ ensurePdfJs: args.ensurePdfJs, pdfBytes });

  try {
    for (const spec of listOrderPdfSketchImageSlotSpecs()) {
      const pageIndex = pageMap[spec.key];
      if (typeof pageIndex !== 'number') continue;
      const rendered = await renderPreviewPageToUrl({
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
    try {
      if (typeof pdfDoc.destroy === 'function') pdfDoc.destroy();
    } catch {
      // best effort cleanup
    }
    try {
      if (typeof task.destroy === 'function') task.destroy();
    } catch {
      // best effort cleanup
    }
  }

  return entries;
}
