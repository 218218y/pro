import type { ActionMetaLike, UnknownCallable, UnknownRecord } from '../../../types';

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown, defaultValue: UnknownRecord = {}): UnknownRecord {
  return isRecord(value) ? value : defaultValue;
}

export function asRecordOrNull(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function asString(value: unknown, defaultValue = ''): string {
  return typeof value === 'string'
    ? value
    : typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : defaultValue;
}

export function isFn(value: unknown): value is UnknownCallable {
  return typeof value === 'function';
}

export function asMeta(value: unknown): ActionMetaLike {
  return asRecord(value, {});
}
