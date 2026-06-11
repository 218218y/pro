export {
  canonicalizeComparableProjectConfigPatch,
  canonicalizeComparableProjectConfigSnapshot,
  normalizeProjectConfigScalarEntry,
} from '../features/project_config/project_config_snapshot_canonical.js';
export {
  cloneComparableProjectConfigValue,
  KNOWN_PROJECT_CONFIG_MAP_KEYS,
  PERSISTED_PROJECT_CONFIG_BRANCH_KEYS,
  STRUCTURAL_PROJECT_CONFIG_KEYS,
} from '../features/project_config/project_config_snapshot_canonical.js';
export type {
  PersistedProjectConfigBranchKey,
  ProjectConfigSnapshotCanonicalizationOptions,
} from '../features/project_config/project_config_snapshot_canonical.js';
