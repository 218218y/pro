import type { UnknownRecord } from '../../../../../types';

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function emptyRecord(): UnknownRecord {
  return {};
}

function asBoolean(value: unknown): boolean {
  return !!value;
}

function asStringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asStringOrNull(value: unknown): string | null {
  const next = asStringValue(value).trim();
  return next ? next : null;
}

function asNumberOrNull(value: unknown): number | null {
  const next = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(next) ? next : null;
}

export { asBoolean, asNumberOrNull, asStringOrNull, asStringValue, emptyRecord, isRecord, readRecord };
