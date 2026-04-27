import type { AppContainer } from '../../../../types/app.js';
import type { OrderPdfDraftLike } from '../../../../types/build.js';
import { readStoreStateMaybe } from '../../services/api.js';

type OrderPdfCompositeCaptureCacheEntry = {
  signature: string;
  pngRenderSketch: Uint8Array | null;
  pngOpenClosed: Uint8Array | null;
};

type UnknownRecord = Record<string, unknown>;

function isUnknownRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object';
}

function asUnknownRecord(value: unknown): UnknownRecord | null {
  return isUnknownRecord(value) ? value : null;
}

const ORDER_PDF_CAPTURE_CACHE_LIMIT = 3;
const orderPdfCompositeCaptureCache = new Map<string, OrderPdfCompositeCaptureCacheEntry>();

function hashString32(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return `${value.length}:${hash}`;
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
  const rec = asUnknownRecord(value);
  if (!rec) return 'null';
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

function cloneBytes(bytes: Uint8Array | null | undefined): Uint8Array | null {
  if (!(bytes instanceof Uint8Array) || !bytes.byteLength) return bytes ? new Uint8Array(0) : null;
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

function cloneRecord(value: unknown): UnknownRecord {
  return { ...(asUnknownRecord(value) || {}) };
}

function sanitizeUiCaptureState(value: unknown): UnknownRecord {
  const ui = cloneRecord(value);
  delete ui.orderPdfEditorDraft;
  delete ui.orderPdfEditorZoom;
  delete ui.orderPdfEditorOpen;
  delete ui.sketchMode;
  delete ui.savedColors;
  delete ui.colorSwatchesOrder;
  const settings = cloneRecord(ui.settings);
  if (Object.keys(settings).length) {
    delete settings.editState;
    delete settings.__persistEditState;
    ui.settings = settings;
  }
  return ui;
}

function sanitizeRuntimeCaptureState(value: unknown): UnknownRecord {
  const runtime = cloneRecord(value);
  delete runtime.sketchMode;
  delete runtime.doorsOpen;
  return runtime;
}

function sanitizeBuildCaptureState(value: unknown): UnknownRecord | null {
  const build = asUnknownRecord(value);
  if (!build) return null;
  const next: UnknownRecord = {};
  if (Array.isArray(build.signature)) next.signature = build.signature;
  if (Array.isArray(build.modulesStructure)) next.modulesStructure = build.modulesStructure;
  return Object.keys(next).length ? next : null;
}

function readOrderPdfCompositeCaptureState(App: AppContainer): UnknownRecord {
  const state = readStoreStateMaybe<UnknownRecord>(App);
  if (!state) return {};
  const captureState: UnknownRecord = {
    ui: sanitizeUiCaptureState(state.ui),
    config: cloneRecord(state.config),
    mode: cloneRecord(state.mode),
    runtime: sanitizeRuntimeCaptureState(state.runtime),
  };
  const build = sanitizeBuildCaptureState(state.build);
  if (build) captureState.build = build;
  return captureState;
}

export function buildOrderPdfCompositeCaptureSignature(
  App: AppContainer,
  _draft: OrderPdfDraftLike | null | undefined
): string {
  const raw = stableSerialize(readOrderPdfCompositeCaptureState(App));
  return hashString32(raw);
}

export function readOrderPdfCompositeCaptureCache(
  signature: string
): OrderPdfCompositeCaptureCacheEntry | null {
  const entry = orderPdfCompositeCaptureCache.get(signature);
  if (!entry) return null;
  orderPdfCompositeCaptureCache.delete(signature);
  orderPdfCompositeCaptureCache.set(signature, entry);
  return {
    signature: entry.signature,
    pngRenderSketch: cloneBytes(entry.pngRenderSketch),
    pngOpenClosed: cloneBytes(entry.pngOpenClosed),
  };
}

export function writeOrderPdfCompositeCaptureCache(entry: {
  signature: string;
  pngRenderSketch: Uint8Array | null | undefined;
  pngOpenClosed: Uint8Array | null | undefined;
}): void {
  if (!entry.signature) return;
  orderPdfCompositeCaptureCache.set(entry.signature, {
    signature: entry.signature,
    pngRenderSketch: cloneBytes(entry.pngRenderSketch),
    pngOpenClosed: cloneBytes(entry.pngOpenClosed),
  });
  while (orderPdfCompositeCaptureCache.size > ORDER_PDF_CAPTURE_CACHE_LIMIT) {
    const firstKey = orderPdfCompositeCaptureCache.keys().next().value;
    if (typeof firstKey !== 'string') break;
    orderPdfCompositeCaptureCache.delete(firstKey);
  }
}

export function clearOrderPdfCompositeCaptureCache(): void {
  orderPdfCompositeCaptureCache.clear();
}
