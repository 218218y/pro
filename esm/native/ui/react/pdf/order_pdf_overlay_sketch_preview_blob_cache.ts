import type { OrderPdfDraft } from './order_pdf_overlay_contracts.js';

export type OrderPdfSketchPreviewBlobCacheEntry = {
  signature: string;
  blob: Blob;
  fileName: string;
  projectName: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function stableSerialize(value: unknown, seen: WeakSet<object> = new WeakSet<object>()): string {
  if (value === null) return 'null';
  const valueType = typeof value;
  if (valueType === 'string') return JSON.stringify(value);
  if (valueType === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (valueType === 'boolean') return value ? 'true' : 'false';
  if (valueType !== 'object') return 'null';
  if (Array.isArray(value)) return `[${value.map(item => stableSerialize(item, seen)).join(',')}]`;
  if (ArrayBuffer.isView(value)) {
    return `{"$view":${JSON.stringify(value.constructor.name)},"byteLength":${value.byteLength}}`;
  }
  if (!isRecord(value)) return 'null';
  const rec = value;
  if (seen.has(rec)) return '"[Circular]"';
  seen.add(rec);
  const keys = Object.keys(rec).sort();
  const parts: string[] = [];
  for (const key of keys) {
    const next = rec[key];
    if (typeof next === 'undefined' || typeof next === 'function') continue;
    parts.push(`${JSON.stringify(key)}:${stableSerialize(next, seen)}`);
  }
  seen.delete(rec);
  return `{${parts.join(',')}}`;
}

function hashString32(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return `${value.length}:${hash}`;
}

export function buildOrderPdfSketchPreviewBlobCacheSignature(args: {
  draft: OrderPdfDraft | null | undefined;
  pdfSourceTick: number;
  importedTailIndexes: readonly number[] | null | undefined;
  loadedPdfOriginalBytes: Uint8Array | null | undefined;
}): string {
  const importedTailIndexes = Array.isArray(args.importedTailIndexes) ? args.importedTailIndexes : [];
  const loadedPdfOriginalBytes = args.loadedPdfOriginalBytes;
  return hashString32(
    stableSerialize({
      pdfSourceTick: Number.isFinite(args.pdfSourceTick) ? args.pdfSourceTick : 0,
      importedTailIndexes,
      loadedPdfOriginalByteLength:
        loadedPdfOriginalBytes instanceof Uint8Array ? loadedPdfOriginalBytes.byteLength : 0,
      draft: args.draft || null,
    })
  );
}

export function readOrderPdfSketchPreviewBlobCache(
  cacheRef: { current: OrderPdfSketchPreviewBlobCacheEntry | null },
  signature: string
): OrderPdfSketchPreviewBlobCacheEntry | null {
  const cache = cacheRef.current;
  if (!cache || cache.signature !== signature) return null;
  return cache;
}

export function writeOrderPdfSketchPreviewBlobCache(
  cacheRef: { current: OrderPdfSketchPreviewBlobCacheEntry | null },
  entry: OrderPdfSketchPreviewBlobCacheEntry
): void {
  cacheRef.current = {
    signature: entry.signature,
    blob: entry.blob,
    fileName: entry.fileName,
    projectName: entry.projectName,
  };
}

export function clearOrderPdfSketchPreviewBlobCache(cacheRef: {
  current: OrderPdfSketchPreviewBlobCacheEntry | null;
}): void {
  cacheRef.current = null;
}
