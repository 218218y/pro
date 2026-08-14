// React-facing root selectors (typed)
//
// Purpose:
// - Centralize high-value reads that legitimately span more than one slice.
// - Keep expensive derived-count logic out of React owner components.

import type { RootStateLike } from '../../../../../types';
import { readModulesConfigurationListFromConfigSnapshot } from '../../../features/modules_configuration/modules_config_api.js';

export function readModulesCountFromRootSnapshot(state: RootStateLike, fallbackDoors: number): number {
  const arr = readModulesConfigurationListFromConfigSnapshot(state.config, 'modulesConfiguration');
  return arr.length || Math.max(0, Math.round(Number(fallbackDoors) / 2) || 0);
}
