import type { SplitDoorsBottomMap, SplitDoorsMap } from '../../../types/index.js';

import {
  readSplitDoorsBottomMapValue,
  readSplitDoorsMapValue,
} from '../features/project_config/project_config_persisted_payload_shared.js';

export function normalizeSplitDoorsMap(map: unknown): SplitDoorsMap {
  return readSplitDoorsMapValue(map);
}

export function normalizeSplitDoorsBottomMap(map: unknown): SplitDoorsBottomMap {
  return readSplitDoorsBottomMapValue(map);
}
