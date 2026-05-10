import type {
  CloudSyncJsonLike,
  CloudSyncOrderList,
  CloudSyncPayload,
  CloudSyncScalarLike,
  SavedColorLike,
  SavedModelLike,
  UiStateLike,
  UnknownRecord,
} from '../../../types';

import { normalizeUnknownError } from '../runtime/error_normalization.js';

export function asRecord(v: unknown): UnknownRecord | null {
  return v && typeof v === 'object' ? Object(v) : null;
}

export function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function asFiniteNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

export function asUiState(v: unknown): UiStateLike | null {
  const rec = asRecord(v);
  if (!rec) return null;
  const next: UiStateLike = {};
  if (typeof rec.orderPdfEditorDraft !== 'undefined') next.orderPdfEditorDraft = rec.orderPdfEditorDraft;
  const orderPdfEditorZoom = asFiniteNumber(rec.orderPdfEditorZoom);
  if (typeof orderPdfEditorZoom !== 'undefined') next.orderPdfEditorZoom = orderPdfEditorZoom;
  return next;
}

function isSavedModelLike(v: unknown): v is SavedModelLike {
  const rec = asRecord(v);
  return !!rec && typeof rec.id === 'string' && typeof rec.name === 'string';
}

function isSavedColorLike(v: unknown): v is SavedColorLike {
  const rec = asRecord(v);
  return (
    !!rec &&
    typeof rec.id === 'string' &&
    (typeof rec.type === 'undefined' || typeof rec.type === 'string') &&
    (typeof rec.value === 'undefined' || typeof rec.value === 'string')
  );
}

export function normalizeModelList(v: unknown): SavedModelLike[] {
  return Array.isArray(v) ? v.filter(isSavedModelLike) : [];
}

export function normalizeSavedColorsList(v: unknown): SavedColorLike[] {
  return Array.isArray(v) ? v.filter(isSavedColorLike) : [];
}

export function readCloudSyncErrorMessage(err: unknown, defaultMessage = ''): string {
  const normalized = normalizeUnknownError(err, defaultMessage || 'Cloud sync operation failed');
  return typeof normalized.message === 'string' ? normalized.message.trim() : '';
}

export function readCloudSyncScalarField(v: unknown): CloudSyncScalarLike | null | undefined {
  if (v === null) return null;
  if (typeof v === 'undefined') return undefined;
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? v : null;
}

export function readCloudSyncNumberOrStringField(v: unknown): number | string | null | undefined {
  if (v === null) return null;
  if (typeof v === 'undefined') return undefined;
  return typeof v === 'string' || typeof v === 'number' ? v : null;
}

export function readCloudSyncStringField(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v === 'undefined') return undefined;
  return typeof v === 'string' ? v : null;
}

export function readCloudSyncJsonField(v: unknown): CloudSyncJsonLike | undefined {
  if (v === null) return null;
  if (typeof v === 'undefined') return undefined;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v;
  const rec = asRecord(v);
  return rec || undefined;
}

export function normalizeList(v: unknown): CloudSyncOrderList {
  if (!Array.isArray(v)) return [];
  const out: CloudSyncOrderList = [];
  for (const item of v) {
    if (item == null || typeof item === 'string' || typeof item === 'number') out.push(item);
  }
  return out;
}

export function readPayloadList(
  payload: unknown,
  key: keyof Pick<CloudSyncPayload, 'colorSwatchesOrder' | 'presetOrder' | 'hiddenPresets'>
): CloudSyncOrderList {
  const rec = asRecord(payload);
  return normalizeList(rec?.[key]);
}

export function hasPayloadKey(payload: unknown, key: keyof CloudSyncPayload): boolean {
  const rec = asRecord(payload);
  return !!rec && Object.prototype.hasOwnProperty.call(rec, key);
}

export function safeParseJSON(s: string): unknown {
  return JSON.parse(s);
}
