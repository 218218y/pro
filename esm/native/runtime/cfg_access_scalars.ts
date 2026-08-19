import type {
  ActionMetaLike,
  ConfigScalarKey,
  ConfigScalarValueMap,
  CornerConfigurationLike,
  BoardMaterial,
  DoorMountMode,
  DrawerRunnerType,
  HandleType,
  WardrobeType,
} from '../../../types';
import { isConfigScalarKey } from '../../../types/config_scalar.js';
import {
  asCornerConfiguration,
  asModulesConfiguration,
  asRecord,
  getConfigNamespace,
  readScalarUpdaterFn,
  type ScalarUpdaterFn,
} from './cfg_access_shared.js';
import {
  applyConfigNonMapPatch,
  assertNoGenericKnownConfigMapPatch,
  cfgGet,
  cfgRead,
} from './cfg_access_core.js';
import { buildConfigPatchWithReplaceMetadata } from './cfg_access_patch_metadata.js';

export function applyConfigNonMapPatchWithReplaceKeys(
  App: unknown,
  patchObj: unknown,
  replaceKeys: unknown,
  meta?: ActionMetaLike
) {
  const base = asRecord(patchObj) || {};
  const patch = buildConfigPatchWithReplaceMetadata(base, replaceKeys);
  assertNoGenericKnownConfigMapPatch(patch, 'applyConfigNonMapPatchWithReplaceKeys');
  void applyConfigNonMapPatch(App, patch, meta);
  return patch;
}

export function cfgSetScalar<K extends ConfigScalarKey>(
  App: unknown,
  key: K,
  valueOrFn: ConfigScalarValueMap[K] | ScalarUpdaterFn<K>,
  meta?: ActionMetaLike
): ConfigScalarValueMap[K] | undefined {
  const k = typeof key === 'string' ? key.trim() : '';
  if (!isConfigScalarKey(k)) {
    throw new Error(`[WardrobePro] cfgSetScalar rejects unknown scalar key: ${k || '<empty>'}.`);
  }

  let next: unknown = valueOrFn;
  if (typeof valueOrFn === 'function') {
    const prev = cfgRead(App, k, undefined) as ConfigScalarValueMap[K] | undefined;
    const updater = readScalarUpdaterFn<K>(valueOrFn);
    if (!updater) return undefined;
    next = updater(prev, cfgGet(App));
  }

  const cfgNs = getConfigNamespace(App);
  if (typeof cfgNs?.setScalar === 'function') {
    cfgNs.setScalar(k, next as ConfigScalarValueMap[K], meta);
    return next as ConfigScalarValueMap[K];
  }

  applyConfigNonMapPatch(App, { [k]: next }, meta);
  return next as ConfigScalarValueMap[K];
}

export function setCfgModulesConfiguration(App: unknown, next: unknown, meta?: ActionMetaLike): unknown {
  const normalized = asModulesConfiguration(next);
  const cfgNs = getConfigNamespace(App);
  if (typeof cfgNs?.setModulesConfiguration === 'function') {
    return cfgNs.setModulesConfiguration(normalized, meta);
  }
  return cfgSetScalar(App, 'modulesConfiguration', normalized, meta);
}

export function setCfgLowerModulesConfiguration(App: unknown, next: unknown, meta?: ActionMetaLike): unknown {
  const normalized = asModulesConfiguration(next);
  const cfgNs = getConfigNamespace(App);
  if (typeof cfgNs?.setLowerModulesConfiguration === 'function') {
    return cfgNs.setLowerModulesConfiguration(normalized, meta);
  }
  return cfgSetScalar(App, 'stackSplitLowerModulesConfiguration', normalized, meta);
}

export function setCfgCornerConfiguration(App: unknown, next: unknown, meta?: ActionMetaLike): unknown {
  const normalized = asCornerConfiguration(next);
  const cfgNs = getConfigNamespace(App);
  if (typeof cfgNs?.setCornerConfiguration === 'function') {
    return cfgNs.setCornerConfiguration(normalized, meta);
  }
  return cfgSetScalar(App, 'cornerConfiguration', normalized, meta);
}

export function setCfgManualWidth(App: unknown, on: unknown, meta?: ActionMetaLike): boolean | undefined {
  const next = !!on;
  void cfgSetScalar(App, 'isManualWidth', next, meta);
  return next;
}

export function setCfgWardrobeType(
  App: unknown,
  value: unknown,
  meta?: ActionMetaLike
): WardrobeType | undefined {
  if (value !== 'hinged' && value !== 'sliding') return undefined;
  void cfgSetScalar(App, 'wardrobeType', value, meta);
  return value;
}

export function setCfgMultiColorMode(App: unknown, on: unknown, meta?: ActionMetaLike): boolean | undefined {
  const next = !!on;
  void cfgSetScalar(App, 'isMultiColorMode', next, meta);
  return next;
}

export function setCfgBoardMaterial(
  App: unknown,
  value: unknown,
  meta?: ActionMetaLike
): BoardMaterial | undefined {
  if (value !== 'sandwich' && value !== 'melamine') return undefined;
  void cfgSetScalar(App, 'boardMaterial', value, meta);
  return value;
}

export function setCfgDoorMountMode(
  App: unknown,
  value: unknown,
  meta?: ActionMetaLike
): DoorMountMode | undefined {
  if (value !== 'overlay' && value !== 'inset') return undefined;
  void cfgSetScalar(App, 'doorMountMode', value, meta);
  return value;
}

export function setCfgDrawerRunnerType(
  App: unknown,
  value: unknown,
  meta?: ActionMetaLike
): DrawerRunnerType | undefined {
  if (value !== 'roller' && value !== 'blum') return undefined;
  void cfgSetScalar(App, 'drawerRunnerType', value, meta);
  return value;
}

export function setCfgGlobalHandleType(
  App: unknown,
  value: unknown,
  meta?: ActionMetaLike
): HandleType | undefined {
  if (value !== 'standard' && value !== 'edge' && value !== 'none') return undefined;
  void cfgSetScalar(App, 'globalHandleType', value, meta);
  return value;
}

export function setCfgShowDimensions(App: unknown, on: unknown, meta?: ActionMetaLike): boolean | undefined {
  const next = !!on;
  void cfgSetScalar(App, 'showDimensions', next, meta);
  return next;
}

export function setCfgMirrorReflectorEnabled(
  App: unknown,
  on: unknown,
  meta?: ActionMetaLike
): boolean | undefined {
  const next = !!on;
  void cfgSetScalar(App, 'MIRROR_REFLECTOR_ENABLED', next, meta);
  return next;
}

export function setCfgLibraryMode(App: unknown, on: unknown, meta?: ActionMetaLike): boolean | undefined {
  const next = !!on;
  void cfgSetScalar(App, 'isLibraryMode', next, meta);
  return next;
}

export function setCfgCustomUploadedDataURL(
  App: unknown,
  value: unknown,
  meta?: ActionMetaLike
): string | null | undefined {
  const next = typeof value === 'string' ? value : value == null ? null : undefined;
  if (typeof next === 'undefined') return undefined;
  void cfgSetScalar(App, 'customUploadedDataURL', next, meta);
  return next;
}

export function setCfgSavedColors(App: unknown, next: unknown, meta?: ActionMetaLike): unknown[] | undefined {
  const arr = Array.isArray(next) ? next : [];
  void cfgSetScalar(App, 'savedColors', arr, meta);
  return arr;
}

export function setCfgColorSwatchesOrder(
  App: unknown,
  next: unknown,
  meta?: ActionMetaLike
): string[] | undefined {
  const arr = Array.isArray(next) ? next.filter((value): value is string => typeof value === 'string') : [];
  void cfgSetScalar(App, 'colorSwatchesOrder', arr, meta);
  return arr;
}

export function cfgDefaultCornerConfiguration(App: unknown): CornerConfigurationLike | null {
  const value = cfgRead(App, 'cornerConfiguration', null);
  return asCornerConfiguration(value);
}
