import type { UnknownRecord } from '../../../types';

import { getUi } from './store_access.js';
import {
  normalizeColorSwatchesOrderSnapshot,
  normalizeKnownMapSnapshot,
  normalizeSavedColorObjectsSnapshot,
} from '../runtime/maps_access.js';
import {
  sanitizeModulesConfigurationListForPatch,
  sanitizeModulesConfigurationListLight,
} from '../features/modules_configuration/modules_config_api.js';
import type {
  ModulesConfigBucketKey,
  PatchModulesConfigurationListOptions,
} from '../features/modules_configuration/modules_config_api.js';
import {
  sanitizeCornerConfigurationForPatch,
  sanitizeCornerConfigurationListsOnly,
} from '../features/modules_configuration/corner_cells_api.js';
import { canonicalizeComparableProjectConfigSnapshot } from './kernel_project_config_snapshot_canonical.js';
import type { KernelStateKernelConfigHelpers } from './kernel_state_kernel_config_shared.js';

export interface KernelStateKernelConfigMapsTools {
  buildComparableCfgSnapshot: (baseCfg: UnknownRecord, patchLike?: UnknownRecord | null) => UnknownRecord;
  normalizeComparableConfigEntry: (
    key: string,
    value: unknown,
    useLight: boolean,
    cfgSnapshot: UnknownRecord
  ) => unknown;
  normalizePatchConfigEntry: (
    key: string,
    value: unknown,
    prevValue: unknown,
    useLight: boolean,
    cfgSnapshot: UnknownRecord
  ) => unknown;
  normalizePatchConfigEntries: (
    patchLike: unknown,
    baseCfg: UnknownRecord,
    useLight: boolean
  ) => UnknownRecord;
  sanitizeComparableModulesEntry: (
    key: ModulesConfigBucketKey,
    value: unknown,
    prevValue: unknown,
    useLight: boolean,
    cfgSnapshot: UnknownRecord
  ) => unknown;
  captureConfigFromObject: (obj: unknown) => UnknownRecord;
}

export function createKernelStateKernelConfigMapsTools(
  helpers: KernelStateKernelConfigHelpers
): KernelStateKernelConfigMapsTools {
  const { App, asRecord, clone, asBucketKey } = helpers;

  const buildComparableCfgSnapshot = (
    baseCfg: UnknownRecord,
    patchLike?: UnknownRecord | null
  ): UnknownRecord => {
    return patchLike ? Object.assign({}, baseCfg, patchLike) : Object.assign({}, baseCfg);
  };

  const getModulesSanitizeOptions = (
    bucket: ModulesConfigBucketKey,
    cfgSnapshot: UnknownRecord
  ): PatchModulesConfigurationListOptions | undefined => {
    if (bucket !== 'modulesConfiguration') return undefined;
    return {
      uiSnapshot: getUi(App),
      cfgSnapshot,
    };
  };

  const sanitizeComparableModulesEntry = (
    key: ModulesConfigBucketKey,
    value: unknown,
    prevValue: unknown,
    useLight: boolean,
    cfgSnapshot: UnknownRecord
  ): unknown => {
    if (useLight) return sanitizeModulesConfigurationListLight(key, value, prevValue);
    return sanitizeModulesConfigurationListForPatch(
      key,
      value,
      prevValue,
      getModulesSanitizeOptions(key, cfgSnapshot)
    );
  };

  const captureConfigFromObject = (obj: unknown): UnknownRecord => {
    const src = asRecord(obj, {});
    const cfg = canonicalizeComparableProjectConfigSnapshot(src, {
      uiSnapshot: getUi(App),
      cfgSnapshot: src,
      cornerMode: 'full',
      topMode: 'materialize',
    });
    cfg.__snapshot = true;
    return cfg;
  };

  const normalizeComparableConfigEntry = (
    key: string,
    value: unknown,
    useLight: boolean,
    cfgSnapshot: UnknownRecord
  ): unknown => {
    if (value === undefined) return undefined;

    switch (key) {
      case 'modulesConfiguration':
      case 'stackSplitLowerModulesConfiguration':
        return sanitizeComparableModulesEntry(asBucketKey(key), value, value, useLight, cfgSnapshot);
      case 'cornerConfiguration':
        return useLight
          ? sanitizeCornerConfigurationListsOnly(value, value)
          : sanitizeCornerConfigurationForPatch(value, value);
      case 'groovesMap':
      case 'grooveLinesCountMap':
      case 'splitDoorsMap':
      case 'splitDoorsBottomMap':
      case 'removedDoorsMap':
      case 'drawerDividersMap':
      case 'individualColors':
      case 'doorSpecialMap':
      case 'doorStyleMap':
      case 'mirrorLayoutMap':
      case 'handlesMap':
      case 'hingeMap':
      case 'curtainMap':
      case 'doorTrimMap':
        return normalizeKnownMapSnapshot(key, value);
      case 'savedColors':
        return normalizeSavedColorObjectsSnapshot(value);
      case 'colorSwatchesOrder':
        return normalizeColorSwatchesOrderSnapshot(value);
      case 'savedNotes':
        return clone(Array.isArray(value) ? value : [], []);
      case 'preChestState':
        return clone(value !== undefined ? value : null, null);
      case 'isLibraryMode':
      case 'isMultiColorMode':
      case 'showDimensions':
      case 'isManualWidth':
        return !!value;
      case 'wardrobeType':
      case 'boardMaterial':
      case 'globalHandleType':
        return value == null ? '' : String(value);
      case 'customUploadedDataURL':
        return value == null ? null : String(value);
      case 'grooveLinesCount': {
        const grooveLinesCount = Number(value);
        return value == null || value === ''
          ? null
          : Number.isFinite(grooveLinesCount)
            ? Math.max(1, Math.floor(grooveLinesCount))
            : null;
      }
      default:
        return clone(value, value);
    }
  };

  const normalizePatchConfigEntry = (
    key: string,
    value: unknown,
    prevValue: unknown,
    useLight: boolean,
    cfgSnapshot: UnknownRecord
  ): unknown => {
    if (value === undefined) return undefined;

    switch (key) {
      case 'modulesConfiguration':
      case 'stackSplitLowerModulesConfiguration':
        return sanitizeComparableModulesEntry(asBucketKey(key), value, prevValue, useLight, cfgSnapshot);
      case 'cornerConfiguration':
        return useLight
          ? sanitizeCornerConfigurationListsOnly(value, prevValue)
          : sanitizeCornerConfigurationForPatch(value, prevValue);
      default:
        return normalizeComparableConfigEntry(key, value, useLight, cfgSnapshot);
    }
  };

  const normalizePatchConfigEntries = (
    patchLike: unknown,
    baseCfg: UnknownRecord,
    useLight: boolean
  ): UnknownRecord => {
    const patchRec = asRecord(patchLike, {});
    const comparableCfgSnapshot = buildComparableCfgSnapshot(baseCfg, patchRec);
    const normalized: UnknownRecord = {};
    for (const [key, value] of Object.entries(patchRec)) {
      normalized[key] = normalizePatchConfigEntry(key, value, baseCfg[key], useLight, comparableCfgSnapshot);
    }
    return normalized;
  };

  return {
    buildComparableCfgSnapshot,
    normalizeComparableConfigEntry,
    normalizePatchConfigEntry,
    normalizePatchConfigEntries,
    sanitizeComparableModulesEntry,
    captureConfigFromObject,
  };
}
