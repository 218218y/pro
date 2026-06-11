import type { ActionMetaLike, MetaActionsNamespaceLike, UnknownRecord } from '../../../../../types';
import { normalizeUnknownErrorInfo } from '../../../services/api.js';
import type { PdfLibTextSetter } from './order_pdf_overlay_contracts.js';

const __orderPdfOverlayReportNonFatalSeen = new Map<string, number>();

export function orderPdfOverlayReportNonFatal(op: string, err: unknown, dedupeMs = 4000): void {
  const now = Date.now();
  const e = err instanceof Error ? err : new Error(String(err));
  const key = `${op}|${e.name}|${e.message}`;
  const last = __orderPdfOverlayReportNonFatalSeen.get(key) ?? 0;
  if (dedupeMs > 0 && now - last < dedupeMs) return;
  __orderPdfOverlayReportNonFatalSeen.set(key, now);
  console.error(`[WardrobePro][OrderPdfInPlaceEditorOverlay] ${op}`, err);
}

export function isRecord(v: unknown): v is UnknownRecord {
  return !!v && (typeof v === 'object' || typeof v === 'function') && !Array.isArray(v);
}

export function getProp(obj: unknown, key: string): unknown {
  if (!isRecord(obj)) return undefined;
  return obj[key];
}

function isFunctionSurface<T>(value: unknown): value is T {
  return typeof value === 'function';
}

export function getFn<T>(obj: unknown, key: string): T | null {
  const v = getProp(obj, key);
  return isFunctionSurface<T>(v) ? v : null;
}

export function tryClearPdfTextField(f: unknown): void {
  const setText = getFn<PdfLibTextSetter>(f, 'setText');
  if (setText) setText('');
}

export function pdfUiOnlyMeta(meta: MetaActionsNamespaceLike, extra?: ActionMetaLike): ActionMetaLike {
  return meta.uiOnly ? meta.uiOnly(extra, 'react:pdf') : { ...(extra || {}), source: 'react:pdf' };
}

export function asRecord(v: unknown): UnknownRecord | null {
  return isRecord(v) ? v : null;
}

export function isPromiseLike(v: unknown): v is Promise<unknown> {
  const r = asRecord(v);
  return !!r && typeof r.then === 'function';
}

export function errorNameMessage(err: unknown): { name: string; message: string } {
  const normalized = normalizeUnknownErrorInfo(err);
  return {
    name: typeof normalized.name === 'string' ? normalized.name : '',
    message: normalized.message,
  };
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
