// Runtime scalar normalizers (ESM)
//
// Keeps string/number normalization in one audited table instead of spreading
// per-key casts through runtime access surfaces.

import type { RuntimeScalarKey, RuntimeScalarValueMap } from '../../../types/index.js';

type RuntimeBooleanKey =
  | 'sketchMode'
  | 'globalClickMode'
  | 'doorsOpen'
  | 'restoring'
  | 'systemReady'
  | 'roomDesignActive'
  | 'notesPicking'
  | 'failFast'
  | 'verboseConsoleErrors'
  | 'debug';
type RuntimeNumberKey = 'doorsLastToggleTime' | 'verboseConsoleErrorsDedupeMs';
type RuntimeNullableNumberKey =
  | 'wardrobeWidthM'
  | 'wardrobeHeightM'
  | 'wardrobeDepthM'
  | 'wardrobeDoorsCount';

function isRuntimeBooleanKey(key: RuntimeScalarKey): key is RuntimeBooleanKey {
  return (
    key === 'sketchMode' ||
    key === 'globalClickMode' ||
    key === 'doorsOpen' ||
    key === 'restoring' ||
    key === 'systemReady' ||
    key === 'roomDesignActive' ||
    key === 'notesPicking' ||
    key === 'failFast' ||
    key === 'verboseConsoleErrors' ||
    key === 'debug'
  );
}

function isRuntimeNumberKey(key: RuntimeScalarKey): key is RuntimeNumberKey {
  return key === 'doorsLastToggleTime' || key === 'verboseConsoleErrorsDedupeMs';
}

function isRuntimeNullableNumberKey(key: RuntimeScalarKey): key is RuntimeNullableNumberKey {
  return (
    key === 'wardrobeWidthM' ||
    key === 'wardrobeHeightM' ||
    key === 'wardrobeDepthM' ||
    key === 'wardrobeDoorsCount'
  );
}

export function isRuntimeScalarValue<K extends RuntimeScalarKey>(
  key: K,
  value: unknown
): value is RuntimeScalarValueMap[K] {
  if (isRuntimeBooleanKey(key)) return typeof value === 'boolean';
  if (isRuntimeNumberKey(key)) return typeof value === 'number' && Number.isFinite(value);
  if (isRuntimeNullableNumberKey(key)) {
    return value === null || (typeof value === 'number' && Number.isFinite(value));
  }
  if (key === 'drawersOpenId') {
    return (
      value === null || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))
    );
  }
  return false;
}

export function readBooleanLike(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return !!value;
  const s = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!s) return defaultValue;
  if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true;
  if (s === 'false' || s === '0' || s === 'no' || s === 'off') return false;
  return !!value;
}

export function readFiniteNumberLike(value: unknown, defaultValue: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return defaultValue;
}

export function readFiniteNullableNumberLike(value: unknown, defaultValue: number | null): number | null {
  if (value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return defaultValue;
}

export function normalizeDrawersOpenId(
  value: unknown,
  defaultValue: string | number | null
): string | number | null {
  if (value === null) return null;
  if (typeof value === 'string') return value.trim() ? value : null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  return defaultValue;
}

export const RUNTIME_SCALAR_NORMALIZERS: {
  [K in RuntimeScalarKey]: (
    value: unknown,
    defaultValue: RuntimeScalarValueMap[K]
  ) => RuntimeScalarValueMap[K];
} = {
  sketchMode: readBooleanLike,
  globalClickMode: readBooleanLike,
  doorsOpen: readBooleanLike,
  doorsLastToggleTime: readFiniteNumberLike,
  drawersOpenId: normalizeDrawersOpenId,
  restoring: readBooleanLike,
  systemReady: readBooleanLike,
  failFast: readBooleanLike,
  verboseConsoleErrors: readBooleanLike,
  verboseConsoleErrorsDedupeMs: readFiniteNumberLike,
  debug: readBooleanLike,
  roomDesignActive: readBooleanLike,
  notesPicking: readBooleanLike,
  wardrobeWidthM: readFiniteNullableNumberLike,
  wardrobeHeightM: readFiniteNullableNumberLike,
  wardrobeDepthM: readFiniteNullableNumberLike,
  wardrobeDoorsCount: readFiniteNullableNumberLike,
};
