import type { SplitDoorsBottomMap, SplitDoorsMap } from '../../../types/index.js';

import { readSplitDoorsBottomMapValue, readSplitDoorsMapValue } from './project_io_load_helpers_maps.js';

export function normalizeSplitDoorsMap(map: unknown): SplitDoorsMap {
  return readSplitDoorsMapValue(map);
}

export function normalizeSplitDoorsBottomMap(map: unknown): SplitDoorsBottomMap {
  return readSplitDoorsBottomMapValue(map);
}
