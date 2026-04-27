import type { ActionMetaLike, ConfigSlicePatch, RootStateLike, UiSlicePatch } from '../../../types';
import { ensureRootMetaRecord, shallowCloneRecord } from './store_contract.js';
import {
  asPatchRecord,
  asRecordOrEmpty,
  asRecordOrNull,
  arrayShallowEqual,
  cloneRecordInput,
  deleteOwn,
  hasOwn,
  isObj,
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
      nextVal = Array.isArray(prev) && arrayShallowEqual(prev, sv) ? prev : sv.slice();
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

function shallowRecordEqual(a: UnknownRecord, b: UnknownRecord): boolean {
  if (a === b) return true;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i += 1) {
    const key = aKeys[i];
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!Object.is(a[key], b[key])) return false;
  }
  return true;
}

export function isReplacePatchValueEqual(prev: unknown, next: unknown): boolean {
  if (Object.is(prev, next)) return true;
  if (Array.isArray(prev) && Array.isArray(next)) return arrayShallowEqual(prev, next);
  if (isObj(prev) && isObj(next)) return shallowRecordEqual(prev, next);
  return false;
}

function applySnapshotOrMergeRecordSlice(
  prevSlice: UnknownRecord,
  patchSlice: unknown,
  allowSnapshot = false
): UnknownRecord {
  const input = asPatchRecord(patchSlice);
  const isSnapshot = allowSnapshot && input.__snapshot === true;
  return isSnapshot ? input : deepMerge(prevSlice, input);
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
    const normalizedPrimary = raw ? String(raw) : getNoneMode();
    if (!Object.is(prevModeRec.primary, normalizedPrimary)) {
      next = next || shallowCloneRecord(base);
      next.primary = normalizedPrimary;
    }
  }

  if (hasOpts) {
    const normalizedOpts = shallowCloneRecord(asRecordOrEmpty(input.opts));
    const prevOpts = asRecordOrEmpty(prevModeRec.opts);
    const sameOpts = shallowRecordEqual(prevOpts, normalizedOpts);
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

export function applyConfigPatch(
  prevConfig: unknown,
  configPatch: unknown,
  actionMeta?: ActionMetaLike,
  uiSnapshot?: unknown
): RootStateLike['config'] {
  const { clean, replace, snapshot } = cleanConfigPatchInput(configPatch);
  const prevRec = asRecordOrEmpty(prevConfig);
  const useLight = !!(actionMeta && actionMeta.noHistory === true && actionMeta.noAutosave === true);
  const comparableCfgSnapshot = buildComparableCfgSnapshot(prevRec, clean);

  if (hasOwn(clean, 'modulesConfiguration')) {
    const prevMods = prevRec.modulesConfiguration;
    const nextMods = clean.modulesConfiguration;
    clean.modulesConfiguration = sanitizeComparableModulesEntry(
      'modulesConfiguration',
      nextMods,
      prevMods,
      useLight,
      comparableCfgSnapshot,
      uiSnapshot
    );
  }

  if (hasOwn(clean, 'stackSplitLowerModulesConfiguration')) {
    const prevLower = prevRec.stackSplitLowerModulesConfiguration;
    const nextLower = clean.stackSplitLowerModulesConfiguration;
    clean.stackSplitLowerModulesConfiguration = sanitizeComparableModulesEntry(
      'stackSplitLowerModulesConfiguration',
      nextLower,
      prevLower,
      useLight,
      comparableCfgSnapshot,
      uiSnapshot
    );
  }

  if (hasOwn(clean, 'cornerConfiguration')) {
    const prevCorner = prevRec.cornerConfiguration;
    const nextCorner = clean.cornerConfiguration;
    clean.cornerConfiguration = useLight
      ? sanitizeCornerConfigurationListsOnly(nextCorner, prevCorner)
      : sanitizeCornerConfigurationForPatch(nextCorner, prevCorner);
  }

  if (snapshot) return clean;

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
      base[rk] = nextVal;
      deleteOwn(clean, rk);
    }
  }

  return deepMerge(base, clean);
}

export function applyMetaPatch(prevState: RootStateLike, patchMeta: unknown): RootStateLike['meta'] {
  const prevMeta = ensureRootMetaRecord(prevState);
  const patch = asPatchRecord(patchMeta);
  if (!hasOwn(patch, 'dirty')) return prevMeta;
  const nextDirty = !!patch.dirty;
  if (Object.is(prevMeta.dirty, nextDirty)) return prevMeta;
  const nextMeta = shallowCloneRecord(prevMeta);
  nextMeta.dirty = nextDirty;
  return nextMeta;
}
