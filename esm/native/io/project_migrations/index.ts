export {
  buildCanonicalProjectUiSnapshot,
  migrateProjectUiSnapshotToCanonicalRaw,
  type ProjectUiRawMigrationResult,
} from './ui_raw_snapshot_migration.js';

export {
  assertCanonicalProjectConfigSnapshot,
  buildCanonicalProjectConfigSnapshot,
  migrateProjectConfigSnapshotToCanonical,
  PROJECT_CONFIG_MIGRATION_REQUIRED_KEYS,
  PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS,
  type ProjectConfigMigrationRequiredKey,
  type ProjectConfigMigrationResult,
  type ProjectConfigSnapshotReplaceKey,
} from './config_snapshot_migration.js';
