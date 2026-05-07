// modulesConfiguration defaults (pure / runtime-safe)
//
// Centralize the default per-module shape so kernel/builder/UI don't duplicate it.

import type { ModuleCustomDataLike, NormalizedTopModuleConfigLike } from '../../../../types';
import {
  INTERIOR_FITTINGS_DIMENSIONS,
  LIBRARY_PRESET_DIMENSIONS,
} from '../../../shared/wardrobe_dimension_tokens_shared.js';

export const DEFAULT_MODULE_CELL_COUNT = INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault;

export function createDefaultModuleCustomData(
  cellCount: number = DEFAULT_MODULE_CELL_COUNT
): ModuleCustomDataLike {
  const n = Number.isFinite(cellCount) && cellCount > 0 ? Math.floor(cellCount) : DEFAULT_MODULE_CELL_COUNT;
  const arr = new Array(n);
  for (let i = 0; i < n; i++) arr[i] = false;
  return {
    shelves: arr.slice(),
    rods: arr.slice(),
    storage: false,
  };
}

/**
 * Canonical default for a *top* module config item.
 * Note: First module uses hanging_top2 by convention.
 */
export function createDefaultTopModuleConfig(index: number, doors: number): NormalizedTopModuleConfigLike {
  const d =
    Number.isFinite(doors) && doors > 0
      ? Math.floor(doors)
      : LIBRARY_PRESET_DIMENSIONS.defaultModuleDoorsCount;
  const i = Number.isFinite(index) && index >= 0 ? Math.floor(index) : 0;

  return {
    layout: i === 0 ? 'hanging_top2' : 'shelves',
    extDrawersCount: 0,
    hasShoeDrawer: false,
    intDrawersSlot: 0,
    intDrawersList: [],
    isCustom: false,
    customData: createDefaultModuleCustomData(DEFAULT_MODULE_CELL_COUNT),
    doors: d,
  };
}
