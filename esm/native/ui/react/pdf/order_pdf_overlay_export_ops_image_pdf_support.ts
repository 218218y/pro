import type { PdfLibPageImageOptionsLike, PdfLibWritableDocumentLike } from './order_pdf_overlay_pdf_lib.js';
import type { OrderPdfDraft } from './order_pdf_overlay_contracts.js';
import type { WindowPartialLike } from './order_pdf_overlay_runtime.js';

import { resolveOrderPdfDetailsTextFromDraft } from '../../pdf/order_pdf_details_runtime.js';
export { ORDER_PDF_IMAGE_TEMPLATE_BOXES } from '../../pdf/order_pdf_field_specs_runtime.js';
import { isFontFaceCtorLike, setCanvasDirection } from './order_pdf_overlay_export_ops_shared.js';
import {
  getOrderPdfTextBoxMetrics,
  prepareOrderPdfTextLayout,
  wrapOrderPdfCanvasText,
} from './order_pdf_overlay_export_ops_image_pdf_text_layout.js';
export {
  getOrderPdfTextBoxMetrics,
  prepareOrderPdfTextLayout,
  wrapOrderPdfCanvasText,
} from './order_pdf_overlay_export_ops_image_pdf_text_layout.js';
export type { OrderPdfPreparedTextLayout } from './order_pdf_overlay_export_ops_image_pdf_text_layout.js';

const WP_DEJAVU_FAMILY = 'WPDejaVu';
export const ORDER_PDF_IMAGE_CONTINUATION_MARGIN = 30;

export type OrderPdfOverlayReportNonFatal = (op: string, err: unknown, dedupeMs?: number) => void;
export type GetPropFn = (obj: unknown, key: string) => unknown;
export type GetFnFn = <T>(obj: unknown, key: string) => T | null;
export type IsPromiseLikeFn = (value: unknown) => value is Promise<unknown>;
export type CanvasToPngBytesFn = (
  canvas: HTMLCanvasElement,
  winMaybe: Window | null | undefined
) => Promise<Uint8Array>;

export function coerceOrderPdfText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

export function buildOrderPdfDetailsText(draft: OrderPdfDraft): string {
  return resolveOrderPdfDetailsTextFromDraft(draft);
}

export async function ensureOrderPdfDejaVuLoaded(args: {
  doc: Document;
  win: WindowPartialLike | null;
  getProp: GetPropFn;
  getFn: GetFnFn;
  isPromiseLike: IsPromiseLikeFn;
  report: OrderPdfOverlayReportNonFatal;
}): Promise<string> {
  const { doc, win, getProp, getFn, isPromiseLike, report } = args;
  try {
    const fonts = getProp(doc, 'fonts');
    const check = (fontDescriptor: string) => {
      try {
        const fn = getFn<(value: string) => boolean>(fonts, 'check');
        return fn ? !!fn(fontDescriptor) : false;
      } catch {
        return false;
      }
    };

    if (check(`12px "${WP_DEJAVU_FAMILY}"`)) return `"${WP_DEJAVU_FAMILY}", Arial, sans-serif`;

    const dv = getProp(doc, 'defaultView');
    const FontFaceCtor0 = (win ? getProp(win, 'FontFace') : null) || getProp(dv, 'FontFace');
    const add = getFn<(ff: unknown) => unknown>(fonts, 'add');
    if (!FontFaceCtor0 || !add) return 'Arial, sans-serif';
    if (!isFontFaceCtorLike(FontFaceCtor0)) return 'Arial, sans-serif';

    const ff = new FontFaceCtor0(WP_DEJAVU_FAMILY, 'url(/fonts/DejaVuSans.ttf)');
    const loaded = await ff.load();
    add(loaded);

    try {
      const ready = getProp(fonts, 'ready');
      if (isPromiseLike(ready)) await ready;
    } catch (err) {
      report('orderPdfOverlay.ensureOrderPdfDejaVuLoaded.ready', err);
    }

    return `"${WP_DEJAVU_FAMILY}", Arial, sans-serif`;
  } catch {
    return 'Arial, sans-serif';
  }
}

export function paintOrderPdfTextInBox(args: {
  ctx: CanvasRenderingContext2D;
  boxPx: { x: number; y: number; w: number; h: number };
  text: string;
  fontPx: number;
  fontFamily: string;
  color?: string;
  dir: 'rtl' | 'ltr';
  align: 'left' | 'right';
  multiline?: boolean;
  preparedLines?: string[];
  report: OrderPdfOverlayReportNonFatal;
}): void {
  const { ctx, boxPx, text, fontPx, fontFamily, dir, align, multiline, preparedLines, report } = args;
  const { pad, lineH, maxLines, maxW } = getOrderPdfTextBoxMetrics(boxPx, fontPx);

  try {
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.fillRect(boxPx.x, boxPx.y, boxPx.w, boxPx.h);
    ctx.restore();
  } catch (err) {
    report('orderPdfOverlay.paintOrderPdfTextInBox.whiteout', err);
  }

  ctx.save();
  try {
    ctx.beginPath();
    ctx.rect(boxPx.x, boxPx.y, boxPx.w, boxPx.h);
    ctx.clip();
  } catch (err) {
    report('orderPdfOverlay.paintOrderPdfTextInBox.clip', err);
  }

  setCanvasDirection(ctx, dir, report, 'orderPdfOverlay.paintOrderPdfTextInBox.direction');
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = args.color || 'black';
  ctx.font = `${fontPx}px ${fontFamily}`;

  const x = align === 'right' ? boxPx.x + boxPx.w - pad : boxPx.x + pad;
  const y0 = boxPx.y + pad;
  const lines = Array.isArray(preparedLines)
    ? preparedLines.slice()
    : multiline
      ? wrapOrderPdfCanvasText(ctx, text, maxW)
      : [String(text || '')];
  const drawLines = lines.slice(0, maxLines);

  for (let i = 0; i < drawLines.length; i++) {
    const y = y0 + i * lineH;
    const line = drawLines[i];
    try {
      ctx.fillText(line, x, y);
    } catch (err) {
      report('orderPdfOverlay.paintOrderPdfTextInBox.fillText', err);
    }
  }

  ctx.restore();
}

export function pdfBoxToPx(
  box: { x: number; y: number; w: number; h: number },
  pageW: number,
  pageH: number,
  canvasW: number,
  canvasH: number
): { x: number; y: number; w: number; h: number; sx: number; sy: number } {
  const sx = canvasW / Math.max(1, pageW);
  const sy = canvasH / Math.max(1, pageH);
  return {
    x: box.x * sx,
    y: (pageH - box.y - box.h) * sy,
    w: box.w * sx,
    h: box.h * sy,
    sx,
    sy,
  };
}

export function resolveOrderPdfDetailsPageSplit(args: {
  ctx: CanvasRenderingContext2D;
  allText: string;
  boxPx: { x: number; y: number; w: number; h: number; sx: number; sy: number };
  fontFamily: string;
  report: OrderPdfOverlayReportNonFatal;
}): { page1Text: string; overflowText: string; page1Lines: string[]; overflowLines: string[] } {
  const { ctx, allText, boxPx, fontFamily, report } = args;
  const fontPx = 12 * boxPx.sx;
  try {
    setCanvasDirection(ctx, 'rtl', report, 'orderPdfOverlay.resolveOrderPdfDetailsPageSplit.direction');
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.font = `${fontPx}px ${fontFamily}`;

    const prepared = prepareOrderPdfTextLayout({
      ctx,
      boxPx,
      text: allText,
      fontPx,
      multiline: true,
    });
    const page1Lines = prepared.lines.slice(0, prepared.maxLines);
    const overflowLines = prepared.lines.slice(prepared.maxLines);

    return {
      page1Text: page1Lines.length ? page1Lines.join('\n') : allText,
      overflowText: overflowLines.join('\n'),
      page1Lines,
      overflowLines,
    };
  } catch {
    return { page1Text: allText, overflowText: '', page1Lines: [allText], overflowLines: [] };
  }
}

export async function appendOrderPdfDetailsContinuationImagePage(args: {
  doc: Document;
  outDoc: PdfLibWritableDocumentLike;
  pageW: number;
  pageH: number;
  rasterScale: number;
  overflowText: string;
  fontFamily: string;
  report: OrderPdfOverlayReportNonFatal;
  canvasToPngBytes: CanvasToPngBytesFn;
  winMaybe: Window | null | undefined;
}): Promise<void> {
  const {
    doc,
    outDoc,
    pageW,
    pageH,
    rasterScale,
    overflowText,
    fontFamily,
    report,
    canvasToPngBytes,
    winMaybe,
  } = args;
  const canvas = doc.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(pageW * rasterScale));
  canvas.height = Math.max(1, Math.ceil(pageH * rasterScale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context missing');

  try {
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  } catch (err) {
    report('orderPdfOverlay.appendOrderPdfDetailsContinuationImagePage.whiteout', err);
  }

  const contBox = {
    x: ORDER_PDF_IMAGE_CONTINUATION_MARGIN,
    y: ORDER_PDF_IMAGE_CONTINUATION_MARGIN,
    w: pageW - ORDER_PDF_IMAGE_CONTINUATION_MARGIN * 2,
    h: pageH - ORDER_PDF_IMAGE_CONTINUATION_MARGIN * 2,
  };
  const boxPx = pdfBoxToPx(contBox, pageW, pageH, canvas.width, canvas.height);
  const fontPx = 12 * boxPx.sx;
  const prepared = prepareOrderPdfTextLayout({
    ctx,
    boxPx,
    text: overflowText,
    fontPx,
    multiline: true,
  });
  paintOrderPdfTextInBox({
    ctx,
    boxPx,
    text: overflowText,
    fontPx,
    fontFamily,
    dir: 'rtl',
    align: 'right',
    multiline: true,
    preparedLines: prepared.lines,
    report,
  });

  const pngBytes = await canvasToPngBytes(canvas, winMaybe);
  const img = await outDoc.embedPng(pngBytes);
  const outPage = outDoc.addPage([pageW, pageH]);
  const drawImageOptions: PdfLibPageImageOptionsLike = { x: 0, y: 0, width: pageW, height: pageH };
  outPage.drawImage(img, drawImageOptions);
}
