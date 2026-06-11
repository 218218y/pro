import type {
  ModuleConfigLike,
  ModulesConfigurationLike,
  NormalizedTopModuleConfigLike,
} from '../../../../types';

import { createDefaultTopModuleConfig } from './module_defaults.js';
import { createDefaultLowerModuleConfig } from '../stack_split/module_config.js';
import {
  asModuleConfigRecord,
  asUnknownList,
  cloneModuleConfig,
  cloneModuleConfigForPatch,
  cloneModuleCustomData,
  cloneMutableValue,
  isModuleConfigPatchLike,
  isRecord,
  readModulesConfigurationListFromConfigSnapshot,
} from './modules_config_contracts.js';
import type {
  ModulesConfigBucketKey,
  PatchModulesConfigurationListOptions,
} from './modules_config_contracts.js';
import {
  materializeTopModulesConfigurationForStructure,
  normalizeModuleItemForBucket,
  resolveTopModuleDoorsForIndex,
  resolveTopModulesStructureFromUiConfig,
} from './modules_config_structure.js';

/**
 * Light sanitizer for modulesConfiguration buckets that ONLY fixes list shapes if they exist.
 *
 * Why: kernel undo snapshots and preset records prefer not to materialize full defaults.
 * This function avoids inflating stored objects while still preventing holes/nulls
 * inside the lists.
 *
 * - Always returns an array (never null/undefined)
 * - Ensures each entry is a plain object (shallow-cloned)
 * - Does NOT normalize/expand module defaults
 */
export function sanitizeModulesConfigurationListLight(
  _bucket: ModulesConfigBucketKey,
  nextVal: unknown,
  prevVal: unknown
): ModulesConfigurationLike {
  const safeList = asUnknownList(Array.isArray(nextVal) ? nextVal : prevVal);
  const prevList = asUnknownList(prevVal);

  const out: ModuleConfigLike[] = new Array(safeList.length);
  for (let i = 0; i < safeList.length; i += 1) {
    const v = safeList[i];
    const pv = prevList[i];
    const candidate = isRecord(v) ? v : isRecord(pv) ? pv : {};
    out[i] = { ...candidate };
  }

  return out;
}

/**
 * Patch-time guardrail: modulesConfiguration buckets must never contain holes/nulls.
 * We also normalize each entry so builder/pure-core receives a stable object.
 *
 * Note: This always returns an array (never undefined/null), because these config keys
 * are expected to be lists. If nextVal is not an array we fall back to prevVal (if array)
 * or an empty list.
 */
export function sanitizeModulesConfigurationListForPatch(
  bucket: ModulesConfigBucketKey,
  nextVal: unknown,
  prevVal: unknown,
  options?: PatchModulesConfigurationListOptions
): ModulesConfigurationLike {
  const nextList = asUnknownList(Array.isArray(nextVal) ? nextVal : prevVal);
  const prevList = asUnknownList(prevVal);
  const out = new Array(nextList.length);

  for (let i = 0; i < nextList.length; i += 1) {
    const v = nextList[i];
    const pv = prevList[i];
    const candidate = isRecord(v)
      ? v
      : prevList.length === nextList.length && isRecord(pv)
        ? pv
        : bucket === 'stackSplitLowerModulesConfiguration'
          ? createDefaultLowerModuleConfig(i)
          : createDefaultTopModuleConfig(i, resolveTopModuleDoorsForIndex(pv, i, options));

    out[i] = normalizeModuleItemForBucket(bucket, asModuleConfigRecord(candidate), i, options);
  }

  return out;
}

function areModuleConfigValuesEqual(prev: unknown, next: unknown): boolean {
  if (Object.is(prev, next)) return true;

  if (Array.isArray(prev) || Array.isArray(next)) {
    if (!Array.isArray(prev) || !Array.isArray(next) || prev.length !== next.length) return false;
    for (let i = 0; i < prev.length; i += 1) {
      if (!areModuleConfigValuesEqual(prev[i], next[i])) return false;
    }
    return true;
  }

  if (!isRecord(prev) || !isRecord(next)) return false;

  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);
  if (prevKeys.length !== nextKeys.length) return false;

  for (let i = 0; i < prevKeys.length; i += 1) {
    const key = prevKeys[i];
    if (!Object.prototype.hasOwnProperty.call(next, key)) return false;
    if (!areModuleConfigValuesEqual(prev[key], next[key])) return false;
  }

  return true;
}

function sameModuleListRefs(a: ModuleConfigLike[], b: ModuleConfigLike[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

function isDenseRecordList(v: unknown): v is ModuleConfigLike[] {
  if (!Array.isArray(v)) return false;
  for (let i = 0; i < v.length; i += 1) {
    if (!Object.prototype.hasOwnProperty.call(v, i)) return false;
    if (!isRecord(v[i])) return false;
  }
  return true;
}

function normalizePatchedModuleItem(
  bucket: ModulesConfigBucketKey,
  item: ModuleConfigLike,
  index: number,
  options?: PatchModulesConfigurationListOptions
): ModuleConfigLike {
  return normalizeModuleItemForBucket(bucket, item, index, options);
}

function applyModuleRecordPatch(baseIn: ModuleConfigLike, patch: unknown): ModuleConfigLike {
  const prevRec = cloneModuleConfigForPatch(baseIn);
  const base = cloneModuleConfigForPatch(baseIn);
  let patchVal: unknown = patch;

  if (typeof patch === 'function') {
    try {
      patchVal = Reflect.apply(patch, undefined, [base, cloneModuleConfig(base)]);
    } catch {
      patchVal = undefined;
    }
  }

  if (!isModuleConfigPatchLike(patchVal)) {
    return areModuleConfigValuesEqual(prevRec, base) ? baseIn : base;
  }

  for (const k of Object.keys(patchVal)) {
    const v = patchVal[k];
    if (v === undefined || v === null) {
      try {
        delete base[k];
      } catch {
        // ignore
      }
      continue;
    }

    if (k === 'customData' && isRecord(v) && isRecord(base.customData)) {
      base.customData = cloneModuleCustomData({ ...base.customData, ...v });
      continue;
    }

    if (k === 'customData' && isRecord(v)) {
      base.customData = cloneModuleCustomData(v);
      continue;
    }

    base[k] = v;
  }

  return areModuleConfigValuesEqual(prevRec, base) ? baseIn : base;
}

export function materializeTopModulesConfigurationFromUiConfig(
  prevListValue: unknown,
  uiSnapshot: unknown,
  cfgSnapshot: unknown
): NormalizedTopModuleConfigLike[] {
  const structure = resolveTopModulesStructureFromUiConfig(uiSnapshot, cfgSnapshot);
  if (structure.length) return materializeTopModulesConfigurationForStructure(prevListValue, structure);

  return sanitizeModulesConfigurationListForPatch('modulesConfiguration', prevListValue, prevListValue, {
    uiSnapshot,
    cfgSnapshot,
  }) as NormalizedTopModuleConfigLike[];
}

export function cloneModulesConfigurationSnapshot(
  cfg: unknown,
  bucket: ModulesConfigBucketKey = 'modulesConfiguration',
  options?: PatchModulesConfigurationListOptions
): ModulesConfigurationLike {
  const list = readModulesConfigurationListFromConfigSnapshot(cfg, bucket);
  return cloneMutableValue(sanitizeModulesConfigurationListForPatch(bucket, list, list, options));
}

export function cloneLightModulesConfigurationSnapshot(
  cfg: unknown,
  bucket: ModulesConfigBucketKey = 'modulesConfiguration'
): ModulesConfigurationLike {
  const list = readModulesConfigurationListFromConfigSnapshot(cfg, bucket);
  return cloneMutableValue(sanitizeModulesConfigurationListLight(bucket, list, list));
}

export function ensureModulesConfigurationListAtForPatch(
  bucket: ModulesConfigBucketKey,
  nextVal: unknown,
  prevVal: unknown,
  index: number,
  options?: PatchModulesConfigurationListOptions
): ModulesConfigurationLike {
  return patchModulesConfigurationListAtForPatch(bucket, nextVal, prevVal, index, {}, options);
}

export function patchModulesConfigurationListAtForPatch(
  bucket: ModulesConfigBucketKey,
  nextVal: unknown,
  prevVal: unknown,
  index: number,
  patch: unknown,
  options?: PatchModulesConfigurationListOptions
): ModulesConfigurationLike {
  const i = Number.isFinite(index) && index >= 0 ? Math.floor(index) : 0;
  const cur =
    Object.is(nextVal, prevVal) && isDenseRecordList(prevVal)
      ? prevVal
      : sanitizeModulesConfigurationListForPatch(bucket, nextVal, prevVal, options);
  const out = cur.slice();

  while (out.length <= i) {
    out.push(
      bucket === 'stackSplitLowerModulesConfiguration'
        ? createDefaultLowerModuleConfig(out.length)
        : createDefaultTopModuleConfig(
            out.length,
            resolveTopModuleDoorsForIndex(undefined, out.length, options)
          )
    );
  }

  const prevItem = out[i];
  const rawNextItem = applyModuleRecordPatch(prevItem, patch);
  if (Object.is(rawNextItem, prevItem) && Object.is(cur, prevVal) && out.length === cur.length) return cur;
  const normalizedNextItem = normalizePatchedModuleItem(bucket, rawNextItem, i, options);
  const nextItem = areModuleConfigValuesEqual(rawNextItem, normalizedNextItem)
    ? rawNextItem
    : normalizedNextItem;
  if (Object.is(prevItem, nextItem) && out.length === cur.length) return cur;
  out[i] = nextItem;
  return sameModuleListRefs(cur, out) ? cur : out;
}
