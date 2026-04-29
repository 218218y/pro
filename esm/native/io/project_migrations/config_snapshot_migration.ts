import type {
  ConfigStateLike,
  ProjectDataEnvelopeLike,
  ProjectDataLike,
  UnknownRecord,
} from '../../../../types/index.js';

import type { PersistedProjectConfigBranchKey } from '../../features/project_config/project_config_snapshot_canonical_shared.js';
import { buildProjectConfigSnapshot as buildProjectConfigSnapshotFromProjectLoad } from '../project_io_load_helpers_config.js';

export type ProjectConfigSnapshotReplaceKey = Extract<
  PersistedProjectConfigBranchKey,
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
  | 'savedColors'
  | 'savedNotes'
  | 'preChestState'
  | 'handlesMap'
  | 'hingeMap'
  | 'curtainMap'
>;

export type ProjectConfigScalarMigrationRequiredKey =
  | 'wardrobeType'
  | 'boardMaterial'
  | 'isManualWidth'
  | 'showDimensions'
  | 'isMultiColorMode'
  | 'isLibraryMode'
  | 'grooveLinesCount';

export type ProjectConfigMigrationRequiredKey =
  | ProjectConfigScalarMigrationRequiredKey
  | ProjectConfigSnapshotReplaceKey;

export interface ProjectConfigMigrationResult {
  config: ConfigStateLike;
  missingKeys: ProjectConfigMigrationRequiredKey[];
}

/**
 * Snapshot-owned project config branches must be replaced on load.
 *
 * Keeping this list with the project migration owner prevents the loader from carrying a second
 * compatibility policy that can drift away from the canonical snapshot contract. Every key here
 * must be materialized by `buildCanonicalProjectConfigSnapshot` so empty saved maps/lists clear
 * stale live config state instead of silently merging with it.
 */
export const PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS: Readonly<
  Record<ProjectConfigSnapshotReplaceKey, true>
> = Object.freeze({
  modulesConfiguration: true,
  stackSplitLowerModulesConfiguration: true,
  cornerConfiguration: true,
  groovesMap: true,
  grooveLinesCountMap: true,
  splitDoorsMap: true,
  splitDoorsBottomMap: true,
  removedDoorsMap: true,
  drawerDividersMap: true,
  individualColors: true,
  doorSpecialMap: true,
  doorStyleMap: true,
  mirrorLayoutMap: true,
  doorTrimMap: true,
  savedColors: true,
  savedNotes: true,
  preChestState: true,
  handlesMap: true,
  hingeMap: true,
  curtainMap: true,
});

export const PROJECT_CONFIG_MIGRATION_REQUIRED_KEYS: readonly ProjectConfigMigrationRequiredKey[] =
  Object.freeze([
    'wardrobeType',
    'boardMaterial',
    'isManualWidth',
    'showDimensions',
    'isMultiColorMode',
    'isLibraryMode',
    'grooveLinesCount',
    ...Object.keys(PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS),
  ] as ProjectConfigMigrationRequiredKey[]);

function hasOwn(record: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function readMissingCanonicalProjectConfigKeys(config: ConfigStateLike): ProjectConfigMigrationRequiredKey[] {
  const record = config as UnknownRecord;
  const missing: ProjectConfigMigrationRequiredKey[] = [];
  for (const key of PROJECT_CONFIG_MIGRATION_REQUIRED_KEYS) {
    if (!hasOwn(record, key) || typeof record[key] === 'undefined') missing.push(key);
  }
  return missing;
}

export function migrateProjectConfigSnapshotToCanonical(
  data: ProjectDataLike | ProjectDataEnvelopeLike | UnknownRecord | null | undefined
): ProjectConfigMigrationResult {
  const config = buildProjectConfigSnapshotFromProjectLoad(data);
  return {
    config,
    missingKeys: readMissingCanonicalProjectConfigKeys(config),
  };
}

export function assertCanonicalProjectConfigSnapshot(
  config: ConfigStateLike,
  context = 'project.config'
): ConfigStateLike {
  const missing = readMissingCanonicalProjectConfigKeys(config);
  if (missing.length) {
    throw new Error(`${context} missing canonical config key(s): ${missing.join(', ')}`);
  }
  return config;
}

export function buildCanonicalProjectConfigSnapshot(
  data: ProjectDataLike | ProjectDataEnvelopeLike | UnknownRecord | null | undefined
): ConfigStateLike {
  const result = migrateProjectConfigSnapshotToCanonical(data);
  return assertCanonicalProjectConfigSnapshot(result.config, 'project.load.config');
}
