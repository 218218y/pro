// React-facing root selectors (typed)
//
// Purpose:
// - Centralize high-value reads that legitimately span more than one slice.
// - Keep expensive derived-count logic out of React owner components.

import type { ConfigStateLike, RootStateLike, UnknownRecord } from '../../../../../types';
import { readModulesConfigurationListFromConfigSnapshot } from '../../../features/modules_configuration/modules_config_api.js';

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readConfigSnapshot(value: unknown): ConfigStateLike {
  return isRecord(value) ? value : {};
}

export function readModulesCountFromRootSnapshot(state: RootStateLike, fallbackDoors: number): number {
  const build = isRecord(state?.build) ? state.build : null;
  const modulesStructure = Array.isArray(build?.modulesStructure) ? build.modulesStructure : null;
  if (modulesStructure && modulesStructure.length) return modulesStructure.length;

  const cfg0 = readConfigSnapshot(state?.config);
  const arr = readModulesConfigurationListFromConfigSnapshot(cfg0, 'modulesConfiguration');
  return arr.length || Math.max(0, Math.round(Number(fallbackDoors) / 2) || 0);
}
