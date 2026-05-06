import {
  LIBRARY_PRESET_DIMENSIONS,
  resolveAutoWidthForDoors,
} from '../../../shared/wardrobe_dimension_tokens_shared.js';

import type {
  ModuleConfigLike,
  ModulesConfigurationLike,
  NormalizedTopModuleConfigLike,
} from '../../../../types';

export const LIBRARY_PRESET_DEFAULT_DOORS = LIBRARY_PRESET_DIMENSIONS.defaultDoorsCount;
export const LIBRARY_PRESET_DOOR_WIDTH_CM = resolveAutoWidthForDoors('hinged', 1);

export function calcLibraryPresetAutoWidth(doors: unknown): number {
  const n = Math.max(0, Math.round(Number(doors) || 0));
  return resolveAutoWidthForDoors('hinged', n);
}

function normalizeDoors(raw: unknown): number {
  const n = Math.round(Number(raw) || 0);
  return Math.max(0, Number.isFinite(n) ? n : 0);
}

function createLibraryModuleConfig(
  doors: number,
  options: { gridDivisions: number; shelves: boolean[] }
): ModuleConfigLike {
  const gridDivisions = Math.max(1, Math.round(Number(options.gridDivisions) || 1));
  const shelves = Array.isArray(options.shelves) ? options.shelves.slice() : [];
  return {
    layout: 'shelves',
    extDrawersCount: 0,
    hasShoeDrawer: false,
    intDrawersSlot: 0,
    intDrawersList: [],
    isCustom: true,
    gridDivisions,
    customData: {
      shelves,
      rods: new Array(gridDivisions).fill(false),
      storage: false,
    },
    doors: normalizeDoors(doors),
  };
}

export function createLibraryTopModuleConfig(doors: number): NormalizedTopModuleConfigLike {
  const base = createLibraryModuleConfig(doors, {
    gridDivisions: LIBRARY_PRESET_DIMENSIONS.topGridDivisions,
    shelves: [true, true, true, true, false],
  });
  return {
    ...base,
    layout: typeof base.layout === 'string' ? base.layout : 'shelves',
    extDrawersCount: typeof base.extDrawersCount === 'number' ? base.extDrawersCount : 0,
    hasShoeDrawer: !!base.hasShoeDrawer,
    intDrawersSlot: typeof base.intDrawersSlot === 'number' ? base.intDrawersSlot : 0,
    intDrawersList: Array.isArray(base.intDrawersList) ? base.intDrawersList.slice() : [],
    isCustom: !!base.isCustom,
    customData: base.customData || {
      shelves: [true, true, true, true, false],
      rods: new Array(LIBRARY_PRESET_DIMENSIONS.topGridDivisions).fill(false),
      storage: false,
    },
    doors: normalizeDoors(base.doors),
  };
}

export function createLibraryLowerModuleConfig(doors: number): ModuleConfigLike {
  return createLibraryModuleConfig(doors, {
    gridDivisions: LIBRARY_PRESET_DIMENSIONS.lowerGridDivisions,
    shelves: [true, false],
  });
}

export function buildLibraryModuleCfgs(
  topDoorsSig: number[],
  bottomDoorsSig: number[]
): {
  topCfgList: ModulesConfigurationLike;
  bottomCfgList: ModulesConfigurationLike;
} {
  const mcTop = Math.max(0, topDoorsSig.length || 0);
  const mcBottom = Math.max(0, bottomDoorsSig.length || 0);

  const topCfgList: ModulesConfigurationLike = [];
  const bottomCfgList: ModulesConfigurationLike = [];

  for (let i = 0; i < mcTop; i++) {
    const doors = topDoorsSig[i] != null ? topDoorsSig[i] : LIBRARY_PRESET_DIMENSIONS.defaultModuleDoorsCount;
    topCfgList.push(createLibraryTopModuleConfig(doors));
  }

  for (let i = 0; i < mcBottom; i++) {
    const doors =
      bottomDoorsSig[i] != null ? bottomDoorsSig[i] : LIBRARY_PRESET_DIMENSIONS.defaultModuleDoorsCount;
    bottomCfgList.push(createLibraryLowerModuleConfig(doors));
  }

  return { topCfgList, bottomCfgList };
}
