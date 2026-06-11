import type { PdfLibDocumentCtorLike, PdfLibLoadedDocumentLike } from './order_pdf_overlay_pdf_lib.js';
import type {
  InteractivePdfBuildResult,
  OrderPdfDraft,
  PdfJsLibLike,
} from './order_pdf_overlay_contracts.js';

export type OrderPdfOverlayExportOpsDeps = {
  docMaybe: Document | null;
  winMaybe: Window | null | undefined;
  ensurePdfJs: () => Promise<PdfJsLibLike>;
  loadPdfLib?: () => Promise<unknown>;
  _buildInteractivePdfBlobForEditorDraft: (draft: OrderPdfDraft) => Promise<InteractivePdfBuildResult>;
  getFn: <T>(obj: unknown, key: string) => T | null;
  getProp: (obj: unknown, key: string) => unknown;
  isPromiseLike: (value: unknown) => value is Promise<unknown>;
  isRecord: (value: unknown) => value is Record<string, unknown>;
  orderPdfOverlayReportNonFatal: (op: string, err: unknown, dedupeMs?: number) => void;
  canvasToPngBytes: (canvas: HTMLCanvasElement, winMaybe: Window | null | undefined) => Promise<Uint8Array>;
};

export type PdfLibCreateDocFn = PdfLibDocumentCtorLike['create'];
export type PdfLibDocumentLike = PdfLibLoadedDocumentLike;
export type FontFaceCtorLike = new (family: string, src: string) => { load: () => Promise<unknown> };
export type CanvasDirectionValue = 'ltr' | 'rtl' | 'inherit';

export function isFontFaceCtorLike(value: unknown): value is FontFaceCtorLike {
  return typeof value === 'function';
}

export function setCanvasDirection(
  ctx: CanvasRenderingContext2D,
  direction: CanvasDirectionValue,
  report: (op: string, err: unknown, dedupeMs?: number) => void,
  op: string
): void {
  try {
    Reflect.set(ctx, 'direction', direction);
  } catch (err) {
    report(op, err);
  }
}
