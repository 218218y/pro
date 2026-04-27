import type { ConfigStateLike, ConfigScalarKey } from '../../../types/index.js';

import { readConfigStateFromStore } from './root_state_access.js';
import { getStoreSurfaceMaybe } from './store_surface_access.js';
import { getConfigRootMaybe } from './app_roots_access.js';
import type {
  ConfigScalarFallback,
  ReadConfigScalar,
  ReadConfigScalarOrDefault,
  ReadConfigScalarOrDefaultFromRoot,
} from './config_selectors_shared.js';
import {
  emptyConfigState,
  getCfgRecord,
  isBoardMaterialKey,
  isBooleanConfigKey,
  isGlobalHandleTypeKey,
  isNullableNumberConfigKey,
  isNullableStringConfigKey,
  isWardrobeTypeKey,
  normalizeBoardMaterial,
  normalizeBoolean,
  normalizeGlobalHandleType,
  normalizeNullableGrooveLinesCount,
  normalizeWardrobeType,
  pickDefaultScalar,
  readBoardMaterialDefault,
  readGlobalHandleTypeDefault,
  readScalarValue,
  readWardrobeTypeDefault,
} from './config_selectors_shared.js';
import type { UnknownRecord } from '../../../types/index.js';

/**
 * Read the current store.config snapshot (store-only).
 */
export function readConfigStateFromApp(App: unknown): ConfigStateLike {
  try {
    return readConfigStateFromStore(getStoreSurfaceMaybe(App));
  } catch {
    return emptyConfigState();
  }
}

/** Read a typed config scalar from a config snapshot. */
export const readConfigScalarFromSnapshot: ReadConfigScalar = (
  cfg: unknown,
  key: ConfigScalarKey
): unknown => {
  return readScalarValue(cfg, key);
};

/** Read a typed config scalar from the canonical store surface. */
export const readConfigScalarFromStore: ReadConfigScalar = (
  store: unknown,
  key: ConfigScalarKey
): unknown => {
  const c = readConfigStateFromStore(store);
  return readConfigScalarFromSnapshot(c, key);
};

/** Read a typed config scalar from App (store-only). */
export const readConfigScalarFromApp: ReadConfigScalar = (App: unknown, key: ConfigScalarKey): unknown => {
  const c = readConfigStateFromApp(App);
  return readConfigScalarFromSnapshot(c, key);
};

export function readConfigLooseScalarFromApp(App: unknown, key: string, fallback?: unknown): unknown {
  if (!key) return fallback;
  try {
    const cfg = readConfigStateFromApp(App);
    const value = getCfgRecord(cfg)[key];
    if (!(typeof value === 'undefined' || value === null || value === '')) return value;
  } catch {
    // ignore
  }

  const direct = getConfigRootMaybe<UnknownRecord>(App);
  const value = direct?.[key];
  return typeof value === 'undefined' || value === null || value === '' ? fallback : value;
}

export function readConfigNumberLooseFromApp(App: unknown, key: string, fallback: number): number {
  const value = readConfigLooseScalarFromApp(App, key, fallback);
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/** Convenience: read scalar keys with safe defaults (typed). */
export const readConfigScalarOrDefault: ReadConfigScalarOrDefault = (
  cfg: unknown,
  key: ConfigScalarKey,
  fallback?: ConfigScalarFallback
): unknown => {
  const def = pickDefaultScalar(key, fallback);
  const value = readScalarValue(cfg, key);

  if (typeof value === 'undefined' || value === null || (typeof value === 'string' && value === '')) {
    return def;
  }

  if (isBoardMaterialKey(key)) {
    return normalizeBoardMaterial(value, readBoardMaterialDefault(def));
  }

  if (isWardrobeTypeKey(key)) {
    return normalizeWardrobeType(value, readWardrobeTypeDefault(def));
  }

  if (isGlobalHandleTypeKey(key)) {
    return normalizeGlobalHandleType(value, readGlobalHandleTypeDefault(def));
  }

  if (isBooleanConfigKey(key)) {
    return normalizeBoolean(value, !!def);
  }

  if (isNullableStringConfigKey(key)) {
    if (value === null) return null;
    if (typeof value === 'string') return value.trim() ? value : null;
    return def ?? null;
  }

  if (isNullableNumberConfigKey(key)) {
    let fallbackNumber: number | null = null;
    if (typeof def === 'number') fallbackNumber = def;
    return normalizeNullableGrooveLinesCount(value, fallbackNumber);
  }

  return value ?? def;
};

export const readConfigScalarOrDefaultFromStore: ReadConfigScalarOrDefaultFromRoot = (
  store: unknown,
  key: ConfigScalarKey,
  fallback?: ConfigScalarFallback
): unknown => {
  const cfg = readConfigStateFromStore(store);
  return readConfigScalarOrDefault(cfg, key, fallback);
};

export const readConfigScalarOrDefaultFromApp: ReadConfigScalarOrDefaultFromRoot = (
  App: unknown,
  key: ConfigScalarKey,
  fallback?: ConfigScalarFallback
): unknown => {
  const cfg = readConfigStateFromApp(App);
  return readConfigScalarOrDefault(cfg, key, fallback);
};
