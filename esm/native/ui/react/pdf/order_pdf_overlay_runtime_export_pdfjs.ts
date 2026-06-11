import type { OrderPdfDraft, PdfJsLibLike } from './order_pdf_overlay_contracts.js';
import { asRecord, getFn } from './order_pdf_overlay_runtime_shared.js';

export type ExportApiLike = {
  exportOrderPdfInteractiveFromDraft?: (draft: OrderPdfDraft) => Promise<void> | void;
  buildOrderPdfInteractiveBlobFromDraft?: (
    draft: OrderPdfDraft
  ) =>
    | Promise<{ blob: Blob; fileName?: string; projectName?: string } | null>
    | { blob: Blob; fileName?: string; projectName?: string }
    | null;
};

function isPdfJsLibLike(v: unknown): v is PdfJsLibLike {
  const r = asRecord(v);
  return !!r && typeof r.getDocument === 'function';
}

function asPdfJsLibLike(v: unknown): PdfJsLibLike | null {
  return isPdfJsLibLike(v) ? v : null;
}

export function getPdfJsLibFromModule(mod: unknown): PdfJsLibLike | null {
  const m = asRecord(mod);
  if (!m) return null;

  const direct = asPdfJsLibLike(m);
  if (direct) return direct;

  const def = asRecord(m.default);
  return def ? asPdfJsLibLike(def) : null;
}

export function getOrderPdfDraftFn(v: unknown): (() => Promise<unknown> | unknown) | null {
  const fn = getFn<() => Promise<unknown> | unknown>(v, 'getOrderPdfDraft');
  return fn ? () => fn() : null;
}

function isInteractiveExportFn(
  value: unknown
): value is NonNullable<ExportApiLike['exportOrderPdfInteractiveFromDraft']> {
  return typeof value === 'function';
}

function isInteractiveBlobBuilderFn(
  value: unknown
): value is NonNullable<ExportApiLike['buildOrderPdfInteractiveBlobFromDraft']> {
  return typeof value === 'function';
}

export function asExportApiLike(v: unknown): ExportApiLike | null {
  const r = asRecord(v);
  if (!r) return null;
  const out: ExportApiLike = {};

  const exportInteractive = r.exportOrderPdfInteractiveFromDraft;
  if (isInteractiveExportFn(exportInteractive)) {
    out.exportOrderPdfInteractiveFromDraft = draft => exportInteractive(draft);
  }

  const buildInteractive = r.buildOrderPdfInteractiveBlobFromDraft;
  if (isInteractiveBlobBuilderFn(buildInteractive)) {
    out.buildOrderPdfInteractiveBlobFromDraft = draft => buildInteractive(draft);
  }

  return out;
}
