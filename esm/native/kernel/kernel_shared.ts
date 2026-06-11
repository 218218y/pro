import type { ActionMetaLike, UnknownCallable, UnknownRecord } from '../../../types';

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown, fallback: UnknownRecord = {}): UnknownRecord {
  return isRecord(value) ? value : fallback;
}

export function asRecordOrNull(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string'
    ? value
    : typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : fallback;
}

export function isFn(value: unknown): value is UnknownCallable {
  return typeof value === 'function';
}

export function asMeta(value: unknown): ActionMetaLike {
  return asRecord(value, {});
}
