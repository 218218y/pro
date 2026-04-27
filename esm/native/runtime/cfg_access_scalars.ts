import type {
  ActionMetaLike,
  ConfigScalarKey,
  ConfigScalarValueMap,
  CornerConfigurationLike,
} from '../../../types';
import {
  asCornerConfiguration,
  asModulesConfiguration,
  asRecord,
  getConfigNamespace,
  readScalarUpdaterFn,
  type ScalarUpdaterFn,
} from './cfg_access_shared.js';
import { applyConfigPatch, cfgGet, cfgPatchWithReplaceKeys, cfgRead } from './cfg_access_core.js';

export function applyConfigPatchReplaceKeys(
  App: unknown,
  patchObj: unknown,
  replaceKeys: unknown,
  meta?: ActionMetaLike
) {
  const base = asRecord(patchObj) || {};
  const patch = cfgPatchWithReplaceKeys(base, replaceKeys);
  void applyConfigPatch(App, patch, meta);
  return patch;
}

type CfgSetScalar = {
  <K extends ConfigScalarKey>(
    App: unknown,
    key: K,
    valueOrFn: ConfigScalarValueMap[K] | ScalarUpdaterFn<K>,
    meta?: ActionMetaLike
  ): ConfigScalarValueMap[K] | undefined;
  (App: unknown, key: string, valueOrFn: unknown, meta?: ActionMetaLike): unknown;
};

export const cfgSetScalar: CfgSetScalar = (
  App: unknown,
  key: unknown,
  valueOrFn: unknown,
  meta?: ActionMetaLike
): unknown => {
  const k = String(key || '');
  if (!k) return undefined;

  let next: unknown = valueOrFn;
  if (typeof valueOrFn === 'function') {
    const prev = cfgRead(App, k, undefined);
    const updater = readScalarUpdaterFn(valueOrFn);
    if (!updater) return undefined;
    next = updater(prev, cfgGet(App));
  }

  const cfgNs = getConfigNamespace(App);
  if (typeof cfgNs?.setScalar === 'function') {
    cfgNs.setScalar(k, next, meta);
    return next;
  }

  applyConfigPatch(App, { [k]: next }, meta);
  return next;
};

export function setCfgModulesConfiguration(App: unknown, next: unknown, meta?: ActionMetaLike): unknown {
  const cfgNs = getConfigNamespace(App);
  if (typeof cfgNs?.setModulesConfiguration === 'function') {
    return cfgNs.setModulesConfiguration(asModulesConfiguration(next), meta);
  }
  return cfgSetScalar(App, 'modulesConfiguration', next, meta);
}

export function setCfgLowerModulesConfiguration(App: unknown, next: unknown, meta?: ActionMetaLike): unknown {
  const cfgNs = getConfigNamespace(App);
  if (typeof cfgNs?.setLowerModulesConfiguration === 'function') {
    return cfgNs.setLowerModulesConfiguration(asModulesConfiguration(next), meta);
  }
  return cfgSetScalar(App, 'stackSplitLowerModulesConfiguration', next, meta);
}

export function setCfgCornerConfiguration(App: unknown, next: unknown, meta?: ActionMetaLike): unknown {
  const cfgNs = getConfigNamespace(App);
  if (typeof cfgNs?.setCornerConfiguration === 'function') {
    return cfgNs.setCornerConfiguration(asCornerConfiguration(next), meta);
  }
  return cfgSetScalar(App, 'cornerConfiguration', next, meta);
}

export function setCfgManualWidth(App: unknown, on: unknown, meta?: ActionMetaLike): boolean | undefined {
  const next = !!on;
  void cfgSetScalar(App, 'isManualWidth', next, meta);
  return next;
}

export function setCfgWardrobeType(App: unknown, value: unknown, meta?: ActionMetaLike): string | undefined {
  const next = value == null ? '' : String(value);
  if (!next) return undefined;
  void cfgSetScalar(App, 'wardrobeType', next, meta);
  return next;
}

export function setCfgMultiColorMode(App: unknown, on: unknown, meta?: ActionMetaLike): boolean | undefined {
  const next = !!on;
  void cfgSetScalar(App, 'isMultiColorMode', next, meta);
  return next;
}

export function setCfgBoardMaterial(App: unknown, value: unknown, meta?: ActionMetaLike): string | undefined {
  const next = value == null ? '' : String(value);
  void cfgSetScalar(App, 'boardMaterial', next, meta);
  return next;
}

export function setCfgGlobalHandleType(
  App: unknown,
  value: unknown,
  meta?: ActionMetaLike
): string | undefined {
  const next = value == null ? '' : String(value);
  void cfgSetScalar(App, 'globalHandleType', next, meta);
  return next;
}

export function setCfgShowDimensions(App: unknown, on: unknown, meta?: ActionMetaLike): boolean | undefined {
  const next = !!on;
  void cfgSetScalar(App, 'showDimensions', next, meta);
  return next;
}

export function setCfgLibraryMode(App: unknown, on: unknown, meta?: ActionMetaLike): boolean | undefined {
  const next = !!on;
  void cfgSetScalar(App, 'isLibraryMode', next, meta);
  return next;
}

export function setCfgWidth(App: unknown, value: unknown, meta?: ActionMetaLike): number | undefined {
  const next = typeof value === 'number' && Number.isFinite(value) ? value : Number(value || 0);
  void cfgSetScalar(App, 'width', next, meta);
  return next;
}

export function setCfgHeight(App: unknown, value: unknown, meta?: ActionMetaLike): number | undefined {
  const next = typeof value === 'number' && Number.isFinite(value) ? value : Number(value || 0);
  void cfgSetScalar(App, 'height', next, meta);
  return next;
}

export function setCfgDepth(App: unknown, value: unknown, meta?: ActionMetaLike): number | undefined {
  const next = typeof value === 'number' && Number.isFinite(value) ? value : Number(value || 0);
  void cfgSetScalar(App, 'depth', next, meta);
  return next;
}

export function setCfgCustomUploadedDataURL(
  App: unknown,
  value: unknown,
  meta?: ActionMetaLike
): string | null | undefined {
  const next = value == null ? null : String(value || '');
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
  const arr = Array.isArray(next) ? next.map(v => String(v)) : [];
  void cfgSetScalar(App, 'colorSwatchesOrder', arr, meta);
  return arr;
}

export function cfgDefaultCornerConfiguration(App: unknown): CornerConfigurationLike | null {
  const value = cfgRead(App, 'cornerConfiguration', null);
  return asCornerConfiguration(value);
}
