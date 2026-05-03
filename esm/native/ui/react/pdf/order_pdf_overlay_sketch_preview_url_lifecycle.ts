import type { OrderPdfSketchPreviewEntry } from './order_pdf_overlay_contracts.js';

export type OrderPdfSketchPreviewBlobCtor = typeof Blob;
export type OrderPdfSketchPreviewUrlApi = Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>;

type UnknownRecord = Record<string, unknown>;

function isUnknownRecord(value: unknown): value is UnknownRecord {
  return !!value && (typeof value === 'object' || typeof value === 'function');
}

function isBlobCtor(value: unknown): value is OrderPdfSketchPreviewBlobCtor {
  return typeof value === 'function';
}

function isUrlApi(value: unknown): value is OrderPdfSketchPreviewUrlApi {
  return (
    !!value &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof Reflect.get(value, 'createObjectURL') === 'function' &&
    typeof Reflect.get(value, 'revokeObjectURL') === 'function'
  );
}

export function getOrderPdfSketchPreviewBlobCtor(
  winMaybe: Window | null | undefined
): OrderPdfSketchPreviewBlobCtor | null {
  const candidate = isUnknownRecord(winMaybe) ? Reflect.get(winMaybe, 'Blob') : null;
  if (isBlobCtor(candidate)) return candidate;
  return typeof Blob === 'function' ? Blob : null;
}

export function getOrderPdfSketchPreviewUrlApi(
  winMaybe: Window | null | undefined
): OrderPdfSketchPreviewUrlApi | null {
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
  const urlApi = getOrderPdfSketchPreviewUrlApi(winMaybe);
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
