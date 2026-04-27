import type { UnknownRecord } from '../../../../types/index.js';

import type { ProjectConfigCornerCloneMode } from './project_config_lists_shared.js';
import type { ProjectConfigListsCanonicalizationOptions } from './project_config_lists_runtime.js';

export const STRUCTURAL_PROJECT_CONFIG_KEYS = new Set([
  'modulesConfiguration',
  'stackSplitLowerModulesConfiguration',
  'cornerConfiguration',
]);

export const KNOWN_PROJECT_CONFIG_MAP_KEYS = new Set([
  'groovesMap',
  'grooveLinesCountMap',
  'splitDoorsMap',
  'splitDoorsBottomMap',
  'removedDoorsMap',
  'drawerDividersMap',
  'individualColors',
  'doorSpecialMap',
  'doorStyleMap',
  'mirrorLayoutMap',
  'handlesMap',
  'hingeMap',
  'curtainMap',
  'doorTrimMap',
]);

export type PersistedProjectConfigBranchKey =
  | 'modulesConfiguration'
  | 'stackSplitLowerModulesConfiguration'
  | 'cornerConfiguration'
  | 'groovesMap'
  | 'grooveLinesCountMap'
  | 'splitDoorsMap'
  | 'splitDoorsBottomMap'
  | 'removedDoorsMap'
  | 'drawerDividersMap'
  | 'individualColors'
  | 'doorSpecialMap'
  | 'doorStyleMap'
  | 'mirrorLayoutMap'
  | 'doorTrimMap'
  | 'handlesMap'
  | 'hingeMap'
  | 'curtainMap'
  | 'savedColors'
  | 'savedNotes'
  | 'preChestState'
  | 'isLibraryMode'
  | 'grooveLinesCount';

export const PERSISTED_PROJECT_CONFIG_BRANCH_KEYS: ReadonlyArray<PersistedProjectConfigBranchKey> = [
  'modulesConfiguration',
  'stackSplitLowerModulesConfiguration',
  'cornerConfiguration',
  'groovesMap',
  'grooveLinesCountMap',
  'splitDoorsMap',
  'splitDoorsBottomMap',
  'removedDoorsMap',
  'drawerDividersMap',
  'individualColors',
  'doorSpecialMap',
  'doorStyleMap',
  'mirrorLayoutMap',
  'doorTrimMap',
  'handlesMap',
  'hingeMap',
  'curtainMap',
  'savedColors',
  'savedNotes',
  'preChestState',
  'isLibraryMode',
  'grooveLinesCount',
];

export interface ProjectConfigSnapshotCanonicalizationOptions extends ProjectConfigListsCanonicalizationOptions {
  cornerMode?: ProjectConfigCornerCloneMode;
  savedColorsMode?: 'objects' | 'mixed';
}

export function isComparableRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function isKnownProjectConfigMapKey(key: string): boolean {
  return KNOWN_PROJECT_CONFIG_MAP_KEYS.has(key);
}

function cloneComparableProjectConfigValueInner(value: unknown, seen: Map<object, unknown>): unknown {
  if (Array.isArray(value)) {
    if (seen.has(value)) return seen.get(value);
    const out: unknown[] = [];
    seen.set(value, out);
    for (let i = 0; i < value.length; i += 1) out[i] = cloneComparableProjectConfigValueInner(value[i], seen);
    return out;
  }
  if (!isComparableRecord(value)) return value;
  if (seen.has(value)) return seen.get(value);
  const out: UnknownRecord = {};
  seen.set(value, out);
  for (const key of Object.keys(value)) out[key] = cloneComparableProjectConfigValueInner(value[key], seen);
  return out;
}

export function cloneComparableProjectConfigValue(value: unknown): unknown {
  return cloneComparableProjectConfigValueInner(value, new Map<object, unknown>());
}
