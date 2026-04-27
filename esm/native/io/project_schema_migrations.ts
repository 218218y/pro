export type { EnsureSettingsRecordFn, EnsureTogglesRecordFn } from './project_schema_migrations_shared.js';

export {
  canonicalSegmentedDoorKey,
  ensureMapRecord,
  isSegmentedDoorBaseId,
  migrateBaseKeysToFull,
  readCornerConfigurationRecord,
} from './project_schema_migrations_shared.js';

export {
  canonicalizeSegmentedDoorMaps,
  migrateDoorStylePayloadMaps,
} from './project_schema_migrations_doors.js';

export {
  inferStackSplitManualFlags,
  normalizeGlobalHandleType,
  normalizeToggleDefaults,
  stripDeprecatedProjectCompatFields,
} from './project_schema_migrations_settings.js';

export {
  inferInternalDrawersToggle,
  normalizeCornerConfigurationShape,
} from './project_schema_migrations_corner.js';

export { stampProjectSchemaMetadata } from './project_schema_migrations_metadata.js';
