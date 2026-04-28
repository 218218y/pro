import type {
  ConfigStateLike,
  ProjectDataEnvelopeLike,
  ProjectDataLike,
  UnknownRecord,
} from '../../../../types/index.js';

import { buildProjectConfigSnapshot as buildProjectConfigSnapshotFromProjectLoad } from '../project_io_load_helpers_config.js';

export type ProjectConfigMigrationRequiredKey =
  | 'wardrobeType'
  | 'boardMaterial'
  | 'isManualWidth'
  | 'showDimensions'
  | 'isMultiColorMode'
  | 'isLibraryMode'
  | 'preChestState'
  | 'grooveLinesCount';

export interface ProjectConfigMigrationResult {
  config: ConfigStateLike;
  missingKeys: ProjectConfigMigrationRequiredKey[];
}

export const PROJECT_CONFIG_MIGRATION_REQUIRED_KEYS: readonly ProjectConfigMigrationRequiredKey[] =
  Object.freeze([
    'wardrobeType',
    'boardMaterial',
    'isManualWidth',
    'showDimensions',
    'isMultiColorMode',
    'isLibraryMode',
    'preChestState',
    'grooveLinesCount',
  ]);

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
