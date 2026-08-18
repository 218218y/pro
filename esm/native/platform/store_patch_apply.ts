import type { ActionMetaLike, RootStateLike, UiSlicePatch } from '../../../types';
import type { ConfigSlicePatch } from '../../../types/backend_patch_payload';
import { cloneMutableStoreValue, shallowCloneRecord } from './store_contract.js';
import {
  asPatchRecord,
  asRecordOrEmpty,
  asRecordOrNull,
  cloneRecordInput,
  deleteOwn,
  hasOwn,
  isObj,
  storeValueEqual,
  type UnknownRecord,
} from './store_shared.js';
import {
  sanitizeModulesConfigurationListLight,
  sanitizeModulesConfigurationListForPatch,
  type ModulesConfigBucketKey,
  type PatchModulesConfigurationListOptions,
} from '../features/modules_configuration/modules_config_api.js';
import {
  sanitizeCornerConfigurationListsOnly,
  sanitizeCornerConfigurationForPatch,
} from '../features/modules_configuration/corner_cells_api.js';
import { extractConfigPatchWriteMetadata } from '../runtime/cfg_access.js';
import {
  assertStoreConfigMapWriteAllowed,
  type StoreConfigMapWriteOptions,
} from '../runtime/store_config_map_write_capability.js';
import { canonicalizeProjectConfigStructuralSnapshot } from '../features/project_config/api.js';

/**
 * Structural deep merge used by PATCH slices.
 * Important for Zustand backend: this function must never mutate the previous state tree.
 *
 * Stage 4 improvement:
 * - preserves reference equality for unchanged branches (structural sharing)
 * - reduces unnecessary React selector churn on semantically no-op patches
 */
function deepMerge(dst: unknown, src: unknown): UnknownRecord {
  if (!isObj(src)) return asRecordOrEmpty(dst);

  const dstObj = asRecordOrNull(dst);
  let out: UnknownRecord | null = null;
  let changed = !dstObj;

  for (const k in src) {
    if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
    const sv = src[k];
    const prev = dstObj ? dstObj[k] : undefined;
    let nextVal = prev;

    if (isObj(sv)) {
      nextVal = deepMerge(prev, sv);
    } else if (Array.isArray(sv)) {
      nextVal = Array.isArray(prev) && storeValueEqual(prev, sv) ? prev : cloneMutableStoreValue(sv);
    } else {
      nextVal = sv;
    }

    if (!Object.is(nextVal, prev)) {
      if (!out) out = dstObj ? shallowCloneRecord(dstObj) : {};
      out[k] = nextVal;
      changed = true;
    }
  }

  if (!changed && dstObj) return dstObj;
  return out || {};
}

export function isReplacePatchValueEqual(prev: unknown, next: unknown): boolean {
  return storeValueEqual(prev, next);
}

function applySnapshotOrMergeRecordSlice<T extends object>(
  prevSlice: T,
  patchSlice: unknown,
  allowSnapshot = false
): T {
  const input = asPatchRecord(patchSlice);
  const isSnapshot = allowSnapshot && input.__snapshot === true;
  if (isSnapshot) {
    if (storeValueEqual(prevSlice, input)) return prevSlice;
    return cloneMutableStoreValue(input) as T;
  }
  const merged = deepMerge(asPatchRecord(prevSlice), input);
  return merged as T;
}

export function toUiSlicePatch(patch: unknown): UiSlicePatch {
  return { ...asPatchRecord(patch) };
}

export function toConfigSlicePatch(patch: unknown): ConfigSlicePatch {
  return { ...asPatchRecord(patch) };
}

export function toModeSlicePatch(patch: unknown): RootStateLike['mode'] {
  return { ...asPatchRecord(patch) };
}

export function applyUiPatchSlice(prevUi: RootStateLike['ui'], patchUi: unknown): RootStateLike['ui'] {
  return applySnapshotOrMergeRecordSlice(prevUi, patchUi, true);
}

export function applyRuntimePatchSlice(
  prevRuntime: RootStateLike['runtime'],
  patchRuntime: unknown
): RootStateLike['runtime'] {
  return applySnapshotOrMergeRecordSlice(prevRuntime, patchRuntime);
}

export function applyModePatchSlice(
  prevMode: unknown,
  patchMode: unknown,
  getNoneMode: () => string
): RootStateLike['mode'] {
  const input = asPatchRecord(patchMode);
  const base = deepMerge(prevMode, input);
  const hasPrimary = Object.prototype.hasOwnProperty.call(input, 'primary');
  const hasOpts = Object.prototype.hasOwnProperty.call(input, 'opts');

  if (!hasPrimary && !hasOpts) return base;

  const prevModeRec = asRecordOrEmpty(prevMode);
  let next: UnknownRecord | null = null;

  if (hasPrimary) {
    const raw = input.primary;
    const normalizedPrimary = typeof raw === 'string' && raw ? raw : getNoneMode();
    if (!Object.is(prevModeRec.primary, normalizedPrimary)) {
      next = next || shallowCloneRecord(base);
      next.primary = normalizedPrimary;
    }
  }

  if (hasOpts) {
    const normalizedOpts = cloneMutableStoreValue(asRecordOrEmpty(input.opts));
    const prevOpts = asRecordOrEmpty(prevModeRec.opts);
    const sameOpts = storeValueEqual(prevOpts, normalizedOpts);
    if (!sameOpts) {
      next = next || shallowCloneRecord(base);
      next.opts = normalizedOpts;
    }
  }

  return next || base;
}

function cleanConfigPatchInput(configPatch: unknown): {
  clean: UnknownRecord;
  replace: UnknownRecord | null;
  snapshot: boolean;
} {
  const next = extractConfigPatchWriteMetadata(configPatch);
  return {
    clean: cloneRecordInput(next.clean),
    replace: asRecordOrNull(next.replace),
    snapshot: next.snapshot,
  };
}

function buildComparableCfgSnapshot(baseCfg: UnknownRecord, patchLike?: UnknownRecord | null): UnknownRecord {
  return patchLike ? Object.assign({}, baseCfg, patchLike) : Object.assign({}, baseCfg);
}

function getModulesSanitizeOptions(
  bucket: ModulesConfigBucketKey,
  cfgSnapshot: UnknownRecord,
  uiSnapshot: unknown
): PatchModulesConfigurationListOptions | undefined {
  if (bucket !== 'modulesConfiguration') return undefined;
  return { uiSnapshot, cfgSnapshot };
}

function sanitizeComparableModulesEntry(
  bucket: ModulesConfigBucketKey,
  value: unknown,
  prevValue: unknown,
  useLight: boolean,
  cfgSnapshot: UnknownRecord,
  uiSnapshot: unknown
): unknown {
  if (useLight) return sanitizeModulesConfigurationListLight(bucket, value, prevValue);
  return sanitizeModulesConfigurationListForPatch(
    bucket,
    value,
    prevValue,
    getModulesSanitizeOptions(bucket, cfgSnapshot, uiSnapshot)
  );
}

export function applyStoreConfigPatch(
  prevConfig: unknown,
  configPatch: unknown,
  actionMeta?: ActionMetaLike,
  uiSnapshot?: unknown,
  opts?: StoreConfigMapWriteOptions
): RootStateLike['config'] {
  assertStoreConfigMapWriteAllowed(configPatch, 'applyStoreConfigPatch', opts);
  const { clean, replace, snapshot } = cleanConfigPatchInput(configPatch);
  const prevRec = asRecordOrEmpty(prevConfig);

  if (snapshot) {
    const detached = cloneMutableStoreValue(clean);
    const canonical = canonicalizeProjectConfigStructuralSnapshot(detached, {
      uiSnapshot,
      cfgSnapshot: detached,
      cornerMode: 'auto',
      topMode: 'materialize',
    });
    return storeValueEqual(prevRec, canonical) ? (prevConfig as RootStateLike['config']) : canonical;
  }

  const useLight = !!(actionMeta && actionMeta.noHistory === true && actionMeta.noAutosave === true);
  const isReplaceKey = (key: string): boolean => !!(replace && hasOwn(replace, key) && replace[key]);
  const readSanitizePrev = (key: string, previousValue: unknown, nextValue: unknown): unknown =>
    isReplaceKey(key) ? nextValue : previousValue;
  const comparableCfgSnapshot = buildComparableCfgSnapshot(prevRec, clean);

  if (hasOwn(clean, 'modulesConfiguration')) {
    const prevMods = readSanitizePrev(
      'modulesConfiguration',
      prevRec.modulesConfiguration,
      clean.modulesConfiguration
    );
    const nextMods = clean.modulesConfiguration;
    const sanitized = sanitizeComparableModulesEntry(
      'modulesConfiguration',
      nextMods,
      prevMods,
      useLight,
      comparableCfgSnapshot,
      uiSnapshot
    );
    clean.modulesConfiguration = storeValueEqual(prevRec.modulesConfiguration, sanitized)
      ? prevRec.modulesConfiguration
      : sanitized;
  }

  if (hasOwn(clean, 'stackSplitLowerModulesConfiguration')) {
    const prevLower = readSanitizePrev(
      'stackSplitLowerModulesConfiguration',
      prevRec.stackSplitLowerModulesConfiguration,
      clean.stackSplitLowerModulesConfiguration
    );
    const nextLower = clean.stackSplitLowerModulesConfiguration;
    const sanitized = sanitizeComparableModulesEntry(
      'stackSplitLowerModulesConfiguration',
      nextLower,
      prevLower,
      useLight,
      comparableCfgSnapshot,
      uiSnapshot
    );
    clean.stackSplitLowerModulesConfiguration = storeValueEqual(
      prevRec.stackSplitLowerModulesConfiguration,
      sanitized
    )
      ? prevRec.stackSplitLowerModulesConfiguration
      : sanitized;
  }

  if (hasOwn(clean, 'cornerConfiguration')) {
    const nextCorner = clean.cornerConfiguration;
    const prevCorner = readSanitizePrev('cornerConfiguration', prevRec.cornerConfiguration, nextCorner);
    const sanitized = useLight
      ? sanitizeCornerConfigurationListsOnly(nextCorner, prevCorner)
      : sanitizeCornerConfigurationForPatch(nextCorner, prevCorner);
    clean.cornerConfiguration = storeValueEqual(prevRec.cornerConfiguration, sanitized)
      ? prevRec.cornerConfiguration
      : sanitized;
  }

  let base = asRecordOrEmpty(prevConfig);
  let baseCloned = false;

  if (replace) {
    for (const rk in replace) {
      if (!hasOwn(replace, rk)) continue;
      if (!replace[rk]) continue;
      if (!hasOwn(clean, rk)) continue;
      const nextVal = clean[rk];
      const prevVal = hasOwn(base, rk) ? base[rk] : undefined;
      if (isReplacePatchValueEqual(prevVal, nextVal)) {
        clean[rk] = prevVal;
        deleteOwn(clean, rk);
        continue;
      }
      if (!baseCloned) {
        base = cloneRecordInput(base);
        baseCloned = true;
      }
      base[rk] = cloneMutableStoreValue(nextVal);
      deleteOwn(clean, rk);
    }
  }

  return deepMerge(base, clean);
}

export function applyMetaPatch(prevMeta: RootStateLike['meta'], patchMeta: unknown): RootStateLike['meta'] {
  const patch = asPatchRecord(patchMeta);
  if (!hasOwn(patch, 'dirty')) return prevMeta;
  const nextDirty = !!patch.dirty;
  if (Object.is(prevMeta.dirty, nextDirty)) return prevMeta;
  const nextMeta = shallowCloneRecord(prevMeta);
  nextMeta.dirty = nextDirty;
  return nextMeta;
}
