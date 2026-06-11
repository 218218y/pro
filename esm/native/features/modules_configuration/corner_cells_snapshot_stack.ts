// Corner stack snapshot/read/apply owner.
// Keeps stack-aware lower-shell seeding, stack reads, and stack patching aligned on one mutation base.

import type { ModuleConfigLike, NormalizedTopModuleConfigLike } from '../../../../types';

import {
  cloneMutableCornerValue,
  cloneRecord,
  isRecord,
  type CornerConfigurationLike,
  type NormalizedLowerCornerConfigurationLike,
  type UnknownRecord,
} from './corner_cells_contracts.js';
import {
  createDefaultTopCornerCellNormalizer,
  patchLowerCornerCellListAtForPatch,
  patchNormalizedCornerCellListAtForPatch,
  type NormalizeCornerCellForPatchOptions,
} from './corner_cells_patch.js';
import {
  cloneCornerConfigurationListsSnapshot,
  normalizeLowerCornerConfigurationSnapshot,
  readCornerConfigurationLike,
  sanitizeCornerConfigurationForPatch,
  sanitizeCornerConfigurationListsOnly,
  sanitizeLowerCornerConfigurationForPatch,
} from './corner_cells_snapshot_normalize.js';
import {
  cornerValueDeepEqual,
  createDefaultLowerCornerConfiguration,
  hasOwn,
  shallowCornerConfigurationRefsEqual,
  shallowRecordEqual,
} from './corner_cells_snapshot_shared.js';

export type CornerStackKey = 'top' | 'bottom';

function reusePreviousCornerSnapshotIfEquivalent(
  prevVal: unknown,
  nextCorner: CornerConfigurationLike
): CornerConfigurationLike {
  const prevCorner = readCornerConfigurationLike(prevVal);
  if (prevCorner && cornerValueDeepEqual(prevCorner, nextCorner)) return prevCorner;
  return nextCorner;
}

function resolveLowerCornerSeedForMutation(base: CornerConfigurationLike): unknown {
  return hasOwn(base, 'stackSplitLower')
    ? base.stackSplitLower
    : cloneCornerConfigurationForLowerSnapshot(base);
}

function readSeededLowerCornerForMutation(
  base: CornerConfigurationLike
): NormalizedLowerCornerConfigurationLike {
  const lowerSeed = resolveLowerCornerSeedForMutation(base);
  return sanitizeLowerCornerConfigurationForPatch(lowerSeed, lowerSeed);
}

function readTopCornerConfigurationSnapshot(value: unknown): CornerConfigurationLike {
  const corner = readCornerConfigurationLike(value);
  return cloneCornerConfigurationListsSnapshot(corner || {});
}

function readBottomCornerConfigurationSnapshot(value: unknown): NormalizedLowerCornerConfigurationLike {
  const corner = readCornerConfigurationLike(value);
  const lowerSeed = isRecord(corner?.stackSplitLower) ? corner.stackSplitLower : {};
  return normalizeLowerCornerConfigurationSnapshot(lowerSeed);
}

function cloneModuleConfig(value: ModuleConfigLike | null | undefined): ModuleConfigLike | null {
  return value && isRecord(value) ? cloneRecord(value) : null;
}

export function readCornerConfigurationSnapshotForStack(
  value: unknown,
  stack: CornerStackKey
): CornerConfigurationLike | NormalizedLowerCornerConfigurationLike {
  return stack === 'bottom'
    ? readBottomCornerConfigurationSnapshot(value)
    : readTopCornerConfigurationSnapshot(value);
}

export function readCornerConfigurationCellListForStack(
  value: unknown,
  stack: CornerStackKey
): ModuleConfigLike[] {
  if (stack === 'bottom') {
    const lower = readBottomCornerConfigurationSnapshot(value);
    return Array.isArray(lower.modulesConfiguration) ? lower.modulesConfiguration : [];
  }
  const corner = readTopCornerConfigurationSnapshot(value);
  return Array.isArray(corner.modulesConfiguration) ? corner.modulesConfiguration : [];
}

export function readCornerConfigurationCellForStack(
  value: unknown,
  stack: CornerStackKey,
  index: number
): ModuleConfigLike | null {
  const i = Number.isFinite(index) && index >= 0 ? Math.floor(index) : -1;
  if (i < 0) return null;
  const list = readCornerConfigurationCellListForStack(value, stack);
  return cloneModuleConfig(list[i]);
}

export function ensureCornerConfigurationForStack(
  nextVal: unknown,
  prevVal: unknown,
  stack: CornerStackKey
): CornerConfigurationLike {
  if (stack === 'bottom') {
    const base = sanitizeCornerConfigurationListsOnly(nextVal, prevVal);
    const out: UnknownRecord = Object.assign({}, base, {
      stackSplitLower: readSeededLowerCornerForMutation(base),
    });
    const sanitized = sanitizeCornerConfigurationListsOnly(out, base);
    if (shallowCornerConfigurationRefsEqual(base, sanitized)) {
      return reusePreviousCornerSnapshotIfEquivalent(prevVal, base);
    }
    return reusePreviousCornerSnapshotIfEquivalent(prevVal, sanitized);
  }
  return reusePreviousCornerSnapshotIfEquivalent(
    prevVal,
    sanitizeCornerConfigurationForPatch(nextVal, prevVal)
  );
}

export function ensureCornerConfigurationCellForStack(
  nextVal: unknown,
  prevVal: unknown,
  stack: CornerStackKey,
  index: number,
  options?: NormalizeCornerCellForPatchOptions<NormalizedTopModuleConfigLike>
): CornerConfigurationLike {
  return patchCornerConfigurationCellForStack(nextVal, prevVal, stack, index, {}, options);
}

export function cloneCornerConfigurationForLowerSnapshot(nextVal: unknown): CornerConfigurationLike {
  const base = sanitizeCornerConfigurationListsOnly(nextVal, nextVal);
  const out: CornerConfigurationLike = Object.assign({}, base, createDefaultLowerCornerConfiguration(), {
    modulesConfiguration: [],
  });
  try {
    delete out.stackSplitLower;
  } catch {
    // ignore
  }
  return cloneMutableCornerValue(out);
}

export function patchCornerConfigurationCellForStack(
  nextVal: unknown,
  prevVal: unknown,
  stack: CornerStackKey,
  index: number,
  patch: unknown,
  options?: NormalizeCornerCellForPatchOptions<NormalizedTopModuleConfigLike>
): CornerConfigurationLike {
  const base = sanitizeCornerConfigurationListsOnly(nextVal, prevVal);
  const out: UnknownRecord = Object.assign({}, base);

  if (stack === 'bottom') {
    const lowerPrev = readSeededLowerCornerForMutation(base);
    out.stackSplitLower = sanitizeLowerCornerConfigurationForPatch(
      Object.assign({}, lowerPrev, {
        modulesConfiguration: patchLowerCornerCellListAtForPatch(
          lowerPrev.modulesConfiguration,
          lowerPrev.modulesConfiguration,
          index,
          patch
        ),
      }),
      lowerPrev
    );
    const sanitized = sanitizeCornerConfigurationListsOnly(out, base);
    if (shallowCornerConfigurationRefsEqual(base, sanitized)) {
      return reusePreviousCornerSnapshotIfEquivalent(prevVal, base);
    }
    return reusePreviousCornerSnapshotIfEquivalent(prevVal, sanitized);
  }

  out.modulesConfiguration = patchNormalizedCornerCellListAtForPatch(
    out.modulesConfiguration,
    out.modulesConfiguration,
    index,
    patch,
    options || createDefaultTopCornerCellNormalizer()
  );

  const sanitized = sanitizeCornerConfigurationForPatch(out, base);
  if (shallowCornerConfigurationRefsEqual(base, sanitized)) {
    return reusePreviousCornerSnapshotIfEquivalent(prevVal, base);
  }
  return reusePreviousCornerSnapshotIfEquivalent(prevVal, sanitized);
}

export function patchCornerConfigurationForStack(
  nextVal: unknown,
  prevVal: unknown,
  stack: CornerStackKey,
  patch: unknown
): CornerConfigurationLike {
  const base = sanitizeCornerConfigurationListsOnly(nextVal, prevVal);

  if (stack === 'bottom') {
    const out: UnknownRecord = Object.assign({}, base);
    const lowerPrev = readSeededLowerCornerForMutation(base);
    const lowerPatched = applyCornerConfigurationPatch(lowerPrev, patch);
    out.stackSplitLower = sanitizeLowerCornerConfigurationForPatch(lowerPatched, lowerPrev);
    const sanitized = sanitizeCornerConfigurationListsOnly(out, base);
    if (shallowCornerConfigurationRefsEqual(base, sanitized)) {
      return reusePreviousCornerSnapshotIfEquivalent(prevVal, base);
    }
    return reusePreviousCornerSnapshotIfEquivalent(prevVal, sanitized);
  }

  const topPatched = applyCornerConfigurationPatch(base, patch);
  const sanitized = sanitizeCornerConfigurationForPatch(topPatched, base);
  if (shallowCornerConfigurationRefsEqual(base, sanitized)) {
    return reusePreviousCornerSnapshotIfEquivalent(prevVal, base);
  }
  return reusePreviousCornerSnapshotIfEquivalent(prevVal, sanitized);
}

function applyCornerConfigurationPatch<T extends UnknownRecord>(base: T, patch: unknown): T {
  let patchValue: unknown = patch;
  const target: UnknownRecord = Object.assign({}, base);
  if (typeof patch === 'function') {
    try {
      patchValue = Reflect.apply(patch, undefined, [target, Object.assign({}, target)]);
    } catch {
      patchValue = undefined;
    }
  }
  if (!isRecord(patchValue)) return base;
  for (const key of Object.keys(patchValue)) {
    const value = patchValue[key];
    if (value === undefined || value === null) {
      try {
        delete target[key];
      } catch {
        // ignore
      }
      continue;
    }
    if (key === 'customData' && isRecord(value) && isRecord(target.customData)) {
      target.customData = Object.assign({}, target.customData, value);
      continue;
    }
    target[key] = value;
  }
  return shallowRecordEqual(base, target) ? base : Object.assign({}, base, target);
}
