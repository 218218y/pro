export {
  canonicalizeComparableProjectConfigPatch,
  canonicalizeComparableProjectConfigSnapshot,
  normalizeProjectConfigScalarEntry,
} from './project_config_snapshot_canonical_runtime.js';
export {
  cloneComparableProjectConfigValue,
  KNOWN_PROJECT_CONFIG_MAP_KEYS,
  PERSISTED_PROJECT_CONFIG_BRANCH_KEYS,
  STRUCTURAL_PROJECT_CONFIG_KEYS,
} from './project_config_snapshot_canonical_shared.js';
export type {
  PersistedProjectConfigBranchKey,
  ProjectConfigSnapshotCanonicalizationOptions,
} from './project_config_snapshot_canonical_shared.js';
