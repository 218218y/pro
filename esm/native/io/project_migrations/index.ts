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
  type ProjectConfigMigrationRequiredKey,
  type ProjectConfigMigrationResult,
} from './config_snapshot_migration.js';
