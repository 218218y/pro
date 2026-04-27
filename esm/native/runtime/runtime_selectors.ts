// Runtime selectors + normalization helpers (ESM)
//
// Purpose:
// - Keep all store.runtime scalar parsing rules in one place.
// - Allow legacy persisted values (string, '', null) without spreading checks everywhere.
// - Provide both snapshot-based and App/store-based readers.
//
// Notes:
// - No DOM access.
// - Fail-soft: never throw.

import type {
  RuntimeStateLike,
  RuntimeScalarKey,
  RuntimeScalarValueMap,
  UnknownRecord,
} from '../../../types/index.js';

import { readRuntimeStateFromStore } from './root_state_access.js';
import { getStoreSurfaceMaybe } from './store_surface_access.js';
import { asRecord as asUnknownRecord } from './record.js';

type RuntimeRecordLike = RuntimeStateLike & Partial<Record<RuntimeScalarKey, unknown>> & UnknownRecord;

const EMPTY_RUNTIME: RuntimeRecordLike = {};
const DEFAULTS: { [K in RuntimeScalarKey]: RuntimeScalarValueMap[K] } = {
  sketchMode: false,
  globalClickMode: true,
  doorsOpen: false,
  doorsLastToggleTime: 0,
  drawersOpenId: null,
  restoring: false,
  systemReady: false,
  failFast: false,
  verboseConsoleErrors: true,
  verboseConsoleErrorsDedupeMs: 4000,
  debug: false,
  roomDesignActive: false,
  notesPicking: false,
  wardrobeWidthM: null,
  wardrobeHeightM: null,
  wardrobeDepthM: null,
  wardrobeDoorsCount: null,
};

const RUNTIME_SCALAR_NORMALIZERS: {
  [K in RuntimeScalarKey]: (value: unknown, fallback: RuntimeScalarValueMap[K]) => RuntimeScalarValueMap[K];
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

function isRuntimeScalarValue<K extends RuntimeScalarKey>(
  key: K,
  value: unknown
): value is RuntimeScalarValueMap[K] {
  if (isRuntimeBooleanKey(key)) return typeof value === 'boolean';
  if (isRuntimeNumberKey(key)) return typeof value === 'number' && Number.isFinite(value);
  if (isRuntimeNullableNumberKey(key))
    return value === null || (typeof value === 'number' && Number.isFinite(value));
  if (key === 'drawersOpenId') {
    return (
      value === null || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))
    );
  }
  return false;
}

function isObj(v: unknown): v is UnknownRecord {
  return !!asUnknownRecord(v);
}

function isRuntimeRecordLike(v: unknown): v is RuntimeRecordLike {
  return isObj(v);
}

function getRtFromSnapshot(rt: unknown): RuntimeRecordLike {
  return isRuntimeRecordLike(rt) ? rt : EMPTY_RUNTIME;
}

function readRuntimeValue<K extends RuntimeScalarKey>(rt: unknown, key: K): unknown {
  return getRtFromSnapshot(rt)[key];
}

function readBooleanLike(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return !!value;
  const s = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!s) return fallback;
  if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true;
  if (s === 'false' || s === '0' || s === 'no' || s === 'off') return false;
  return !!value;
}

function readFiniteNumberLike(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function readFiniteNullableNumberLike(value: unknown, fallback: number | null): number | null {
  if (value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function normalizeDrawersOpenId(value: unknown, fallback: string | number | null): string | number | null {
  if (value === null) return null;
  if (typeof value === 'string') return value.trim() ? value : null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  return fallback;
}

/**
 * Read the current store.runtime snapshot (store-only).
 */
export function readRuntimeStateFromApp(App: unknown): RuntimeStateLike {
  try {
    return readRuntimeStateFromStore(getStoreSurfaceMaybe(App));
  } catch {
    return EMPTY_RUNTIME;
  }
}

/** Read a typed runtime scalar from a runtime snapshot. */
export function readRuntimeScalarFromSnapshot<K extends RuntimeScalarKey>(
  rt: unknown,
  key: K
): RuntimeScalarValueMap[K] | undefined {
  try {
    const value = readRuntimeValue(rt, key);
    return typeof value === 'undefined' || !isRuntimeScalarValue(key, value) ? undefined : value;
  } catch {
    return undefined;
  }
}

/** Read a typed runtime scalar from the canonical store surface. */
export function readRuntimeScalarFromStore<K extends RuntimeScalarKey>(
  store: unknown,
  key: K
): RuntimeScalarValueMap[K] | undefined {
  const r = readRuntimeStateFromStore(store);
  return readRuntimeScalarFromSnapshot(r, key);
}

/** Read a typed runtime scalar from App (store-only). */
export function readRuntimeScalarFromApp<K extends RuntimeScalarKey>(
  App: unknown,
  key: K
): RuntimeScalarValueMap[K] | undefined {
  const r = readRuntimeStateFromApp(App);
  return readRuntimeScalarFromSnapshot(r, key);
}

/** Read a boolean runtime key (supports legacy string values). */
export function readRuntimeBoolFromSnapshot(rt: unknown, key: string, fallback: boolean): boolean {
  try {
    return readBooleanLike(getRtFromSnapshot(rt)[key], fallback);
  } catch {
    return fallback;
  }
}

/** Read a finite number runtime key (supports numeric strings). */
export function readRuntimeNumberFromSnapshot(rt: unknown, key: string, fallback: number): number {
  try {
    return readFiniteNumberLike(getRtFromSnapshot(rt)[key], fallback);
  } catch {
    return fallback;
  }
}

/** Read a nullable finite number runtime key (supports numeric strings). */
export function readRuntimeNullableNumberFromSnapshot(
  rt: unknown,
  key: string,
  fallback: number | null
): number | null {
  try {
    return readFiniteNullableNumberLike(getRtFromSnapshot(rt)[key], fallback);
  } catch {
    return fallback;
  }
}

/** Convenience: read scalar keys with safe defaults (typed). */
function getRuntimeScalarDefault<K extends RuntimeScalarKey>(
  key: K,
  fallback?: RuntimeScalarValueMap[K]
): RuntimeScalarValueMap[K] {
  return typeof fallback !== 'undefined' ? fallback : DEFAULTS[key];
}

/** Convenience: read scalar keys with safe defaults (typed). */
export function readRuntimeScalarOrDefault<K extends RuntimeScalarKey>(
  rt: unknown,
  key: K,
  fallback?: RuntimeScalarValueMap[K]
): RuntimeScalarValueMap[K] {
  const def = getRuntimeScalarDefault(key, fallback);
  const rawValue = readRuntimeValue(rt, key);
  if (typeof rawValue === 'undefined') return def;
  return RUNTIME_SCALAR_NORMALIZERS[key](rawValue, def);
}

export function readRuntimeScalarOrDefaultFromStore<K extends RuntimeScalarKey>(
  store: unknown,
  key: K,
  fallback?: RuntimeScalarValueMap[K]
): RuntimeScalarValueMap[K] {
  const rt = readRuntimeStateFromStore(store);
  return readRuntimeScalarOrDefault(rt, key, fallback);
}

export function readRuntimeScalarOrDefaultFromApp<K extends RuntimeScalarKey>(
  App: unknown,
  key: K,
  fallback?: RuntimeScalarValueMap[K]
): RuntimeScalarValueMap[K] {
  const rt = readRuntimeStateFromApp(App);
  return readRuntimeScalarOrDefault(rt, key, fallback);
}
