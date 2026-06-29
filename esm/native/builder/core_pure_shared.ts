// Builder core pure shared helpers and types.

import type {
  InteriorCustomOpsLike,
  InteriorRodOpLike,
  ModulesStructureItemLike,
  NormalizedTopModuleConfigLike,
  UnknownRecord,
} from '../../../types';

import { asRecord } from '../runtime/record.js';
import { readCorePureInteger, readCorePureNumber } from './core_pure_number_contracts.js';

export type ModuleStructureItem = ModulesStructureItemLike;
export type ModuleConfig = NormalizedTopModuleConfigLike;

export type HingedDoorPivotSpec = {
  doorId: number;
  moduleIndex: number;
  doorIndex: number;
  doorWidth: number;
  doorLeftEdge: number;
  pivotX: number;
  meshOffsetX: number;
  isLeftHinge: boolean;
};

export type MutableRecord = UnknownRecord & { [key: string]: unknown };

export type { InteriorCustomOpsLike, InteriorRodOpLike, UnknownRecord };

export function _asObject(x: unknown): UnknownRecord | null {
  return asRecord(x);
}

export function __asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? [...v] : [];
}

export function __asInt(v: unknown, d: number) {
  return readCorePureInteger(v, d);
}

export function __asNum(v: unknown, d: number) {
  return readCorePureNumber(v, d);
}

export function __sumDoors(modulesStructure: unknown) {
  if (!Array.isArray(modulesStructure)) return 0;
  let sum = 0;
  for (let i = 0; i < modulesStructure.length; i++) {
    const m = modulesStructure[i];
    const doors = __asInt(_asObject(m)?.doors, 0);
    if (doors > 0) sum += doors;
  }
  return sum;
}

export function __normalizeModulesStructure(modulesStructure: unknown): ModuleStructureItem[] {
  if (!Array.isArray(modulesStructure)) return [];
  return modulesStructure
    .map(function (m: unknown) {
      let doors = __asInt(_asObject(m)?.doors, 0);
      if (doors < 1) doors = 1;
      return { doors: doors };
    })
    .filter(Boolean);
}

export function __defaultModuleCfg(doors: number): ModuleConfig {
  return {
    layout: 'shelves',
    extDrawersCount: 0,
    hasShoeDrawer: false,
    isCustom: false,
    customData: {
      shelves: [false, false, false, false, false, false],
      rods: [false, false, false, false, false, false],
      storage: false,
    },
    doors: doors,
  };
}
