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
import { removeSpecialDimsInPlace } from '../special_dims/index.js';

function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function cloneRecord<T extends UnknownRecord>(src: T): T {
  return Object.assign({}, src);
}

function toInt(v: unknown, fallback: number): number {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function cloneModuleCustomData(src: unknown, fallbackCellCount: number): ModuleCustomDataLike {
  const base = isRecord(src) ? cloneRecord(src) : {};
  const defaults = createDefaultModuleCustomData(fallbackCellCount);
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
    intDrawersSlot: 0,
    intDrawersList: [],
    isCustom: false,
    customData: createDefaultModuleCustomData(),
    doors: 2,
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
    intDrawersSlot: toInt(base.intDrawersSlot, 0),
    intDrawersList: Array.isArray(base.intDrawersList) ? base.intDrawersList.slice() : [],
    isCustom: !!base.isCustom,
    customData: cloneModuleCustomData(base.customData, 6),
    doors: toInt(base.doors, 2),
  };
}

export function createDefaultLowerModuleConfig(_i: number): ModuleConfigLike {
  return {
    layout: 'shelves',
    extDrawersCount: 0,
    hasShoeDrawer: false,
    intDrawersSlot: 0,
    intDrawersList: [],
    isCustom: true,
    gridDivisions: 6,
    customData: {
      shelves: [false, true, false, true, false, false],
      rods: [false, false, false, false, false, false],
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
    intDrawersList: Array.isArray(base.intDrawersList) ? base.intDrawersList.slice() : [],
    isCustom: !!base.isCustom,
    gridDivisions: Math.max(1, toInt(base.gridDivisions, 6)),
    customData: cloneModuleCustomData(base.customData, 6),
  };

  // Lower stack must NOT inherit per-cell special dims or saved manual dims.
  try {
    removeSpecialDimsInPlace(cfg);
    delete cfg.savedDims;
  } catch (_) {}

  return cfg;
}

function createDefaultModuleCustomData(cellCount: number = 6): ModuleCustomDataLike {
  const n = Number.isFinite(cellCount) && cellCount > 0 ? Math.floor(cellCount) : 6;
  const arr = new Array(n).fill(false);
  return {
    shelves: arr.slice(),
    rods: arr.slice(),
    storage: false,
  };
}
