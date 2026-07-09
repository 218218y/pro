// Stack Split module configuration helpers (top vs bottom stacks)
//
// Goals:
// - Single source of truth for which config bucket to read/write for a given stack.
// - Centralized defaults + normalization so kernel/builder/picking don't duplicate logic.

import type {
  ModuleConfigLike,
  ModuleCustomDataLike,
  NormalizedTopModuleConfigLike,
  UnknownRecord,
} from '../../../../types';
import type { StackKey } from './stack_split.js';
import {
  INTERIOR_FITTINGS_DIMENSIONS,
  LIBRARY_PRESET_DIMENSIONS,
} from '../../../shared/wardrobe_dimension_tokens_shared.js';

function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function cloneRecord<T extends UnknownRecord>(src: T): T {
  return Object.assign({}, src);
}

function toInt(v: unknown, defaultValue: number): number {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : defaultValue;
}

function normalizeLowerWidthDepthSpecialDims(src: unknown): UnknownRecord | null {
  if (!isRecord(src)) return null;
  const out: UnknownRecord = {};
  for (const key of ['widthCm', 'baseWidthCm', 'depthCm', 'baseDepthCm']) {
    const n = Number(src[key]);
    if (Number.isFinite(n) && n > 0) out[key] = n;
  }
  return Object.keys(out).length ? out : null;
}

function cloneModuleCustomData(src: unknown, defaultCellCount: number): ModuleCustomDataLike {
  const base = isRecord(src) ? cloneRecord(src) : {};
  const defaults = createDefaultModuleCustomData(defaultCellCount);
  return {
    ...base,
    shelves: Array.isArray(base.shelves) ? base.shelves.slice() : defaults.shelves.slice(),
    rods: Array.isArray(base.rods) ? base.rods.slice() : defaults.rods.slice(),
    storage: !!base.storage,
  };
}

export function modulesConfigurationKeyForStack(
  stackKey: StackKey
): 'modulesConfiguration' | 'stackSplitLowerModulesConfiguration' {
  return stackKey === 'bottom' ? 'stackSplitLowerModulesConfiguration' : 'modulesConfiguration';
}

export function createDefaultTopModuleConfig(i: number): NormalizedTopModuleConfigLike {
  return {
    layout: i === 0 ? 'hanging_top2' : 'shelves',
    extDrawersCount: 0,
    hasShoeDrawer: false,
    isCustom: false,
    customData: createDefaultModuleCustomData(),
    doors: LIBRARY_PRESET_DIMENSIONS.defaultModuleDoorsCount,
  };
}

export function normalizeTopModuleConfig(src: unknown, i: number): NormalizedTopModuleConfigLike {
  const base = isRecord(src) ? cloneRecord(src) : createDefaultTopModuleConfig(i);
  const layout =
    typeof base.layout === 'string' && base.layout ? base.layout : i === 0 ? 'hanging_top2' : 'shelves';

  return {
    ...base,
    layout,
    extDrawersCount: toInt(base.extDrawersCount, 0),
    hasShoeDrawer: !!base.hasShoeDrawer,
    isCustom: !!base.isCustom,
    customData: cloneModuleCustomData(
      base.customData,
      INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault
    ),
    doors: toInt(base.doors, LIBRARY_PRESET_DIMENSIONS.defaultModuleDoorsCount),
  };
}

export function createDefaultLowerModuleConfig(_i: number): ModuleConfigLike {
  return {
    layout: 'shelves',
    extDrawersCount: 0,
    hasShoeDrawer: false,
    isCustom: true,
    gridDivisions: INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault,
    customData: {
      shelves: Array.from(INTERIOR_FITTINGS_DIMENSIONS.storage.defaultLowerShelfSlots),
      rods: Array.from({ length: INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault }, () => false),
      storage: false,
    },
  };
}

export function normalizeLowerModuleConfig(src: unknown, i: number): ModuleConfigLike {
  const base = isRecord(src) ? cloneRecord(src) : createDefaultLowerModuleConfig(i);
  const cfg: ModuleConfigLike = {
    ...base,
    layout: typeof base.layout === 'string' && base.layout ? base.layout : 'shelves',
    extDrawersCount: toInt(base.extDrawersCount, 0),
    hasShoeDrawer: !!base.hasShoeDrawer,
    isCustom: !!base.isCustom,
    gridDivisions: Math.max(
      1,
      toInt(base.gridDivisions, INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault)
    ),
    customData: cloneModuleCustomData(
      base.customData,
      INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault
    ),
  };

  // Lower stack supports per-cell width/depth, but not height or saved manual height state.
  const lowerSpecialDims = normalizeLowerWidthDepthSpecialDims(base.specialDims);
  if (lowerSpecialDims) cfg.specialDims = lowerSpecialDims;
  else delete cfg.specialDims;
  delete cfg.savedDims;

  return cfg;
}

function createDefaultModuleCustomData(
  cellCount: number = INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault
): ModuleCustomDataLike {
  const n =
    Number.isFinite(cellCount) && cellCount > 0
      ? Math.floor(cellCount)
      : INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault;
  const arr = Array.from({ length: n }, () => false);
  return {
    shelves: arr.slice(),
    rods: arr.slice(),
    storage: false,
  };
}
