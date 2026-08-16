import type { ConfigStateLike, ConfigScalarKey } from '../../../types/index.js';

import { readConfigStateFromStore } from './root_state_access.js';
import { getStoreSurfaceMaybe } from './store_surface_access.js';
import type {
  ConfigScalarDefaultValue,
  ReadConfigScalar,
  ReadConfigScalarOrDefault,
  ReadConfigScalarOrDefaultFromRoot,
} from './config_selectors_shared.js';
import {
  emptyConfigState,
  isBoardMaterialKey,
  isBooleanConfigKey,
  isGlobalHandleTypeKey,
  isDrawerRunnerTypeKey,
  isNullableNumberConfigKey,
  isNullableStringConfigKey,
  isWardrobeTypeKey,
  normalizeBoardMaterial,
  normalizeBoolean,
  normalizeGlobalHandleType,
  normalizeDrawerRunnerType,
  normalizeNullableConfigNumber,
  normalizeWardrobeType,
  pickDefaultScalar,
  readBoardMaterialDefault,
  readGlobalHandleTypeDefault,
  readDrawerRunnerTypeDefault,
  readScalarValue,
  readWardrobeTypeDefault,
} from './config_selectors_shared.js';

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

/** Convenience: read scalar keys with safe defaults (typed). */
export const readConfigScalarOrDefault: ReadConfigScalarOrDefault = (
  cfg: unknown,
  key: ConfigScalarKey,
  defaultValue?: ConfigScalarDefaultValue
): unknown => {
  const def = pickDefaultScalar(key, defaultValue);
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

  if (isDrawerRunnerTypeKey(key)) {
    return normalizeDrawerRunnerType(value, readDrawerRunnerTypeDefault(def));
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
    let numberDefault: number | null = null;
    if (typeof def === 'number') numberDefault = def;
    return normalizeNullableConfigNumber(key, value, numberDefault);
  }

  return value ?? def;
};

export const readConfigScalarOrDefaultFromStore: ReadConfigScalarOrDefaultFromRoot = (
  store: unknown,
  key: ConfigScalarKey,
  defaultValue?: ConfigScalarDefaultValue
): unknown => {
  const cfg = readConfigStateFromStore(store);
  return readConfigScalarOrDefault(cfg, key, defaultValue);
};

export const readConfigScalarOrDefaultFromApp: ReadConfigScalarOrDefaultFromRoot = (
  App: unknown,
  key: ConfigScalarKey,
  defaultValue?: ConfigScalarDefaultValue
): unknown => {
  const cfg = readConfigStateFromApp(App);
  return readConfigScalarOrDefault(cfg, key, defaultValue);
};
