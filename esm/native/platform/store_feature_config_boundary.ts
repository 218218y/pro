import {
  sanitizeModulesConfigurationListLight,
  sanitizeModulesConfigurationListForPatch,
  type ModulesConfigBucketKey,
  type PatchModulesConfigurationListOptions,
} from '../features/modules_configuration/modules_config_api.js';
import {
  sanitizeCornerConfigurationListsOnly,
  sanitizeCornerConfigurationForPatch,
} from '../features/modules_configuration/corner_cells_api.js';
import { canonicalizeProjectConfigStructuralSnapshot } from '../features/project_config/api.js';

type StoreFeatureConfigRecord = Record<string, unknown>;

/**
 * Canonical platform -> features boundary for store config normalization.
 *
 * Platform owns commit orchestration while feature modules own the domain rules
 * for structural project config. Keeping those imports here prevents store
 * plumbing modules from independently growing cross-layer dependencies.
 */
export function canonicalizeStoreProjectConfigSnapshot(
  cfgSnapshot: StoreFeatureConfigRecord,
  uiSnapshot: unknown
): StoreFeatureConfigRecord {
  return canonicalizeProjectConfigStructuralSnapshot(cfgSnapshot, {
    uiSnapshot,
    cfgSnapshot,
    cornerMode: 'auto',
    topMode: 'materialize',
  });
}

function getModulesSanitizeOptions(
  bucket: ModulesConfigBucketKey,
  cfgSnapshot: StoreFeatureConfigRecord,
  uiSnapshot: unknown
): PatchModulesConfigurationListOptions | undefined {
  if (bucket !== 'modulesConfiguration') return undefined;
  return { uiSnapshot, cfgSnapshot };
}

export function sanitizeStoreModulesConfigurationEntry(
  bucket: ModulesConfigBucketKey,
  value: unknown,
  prevValue: unknown,
  useLight: boolean,
  cfgSnapshot: StoreFeatureConfigRecord,
  uiSnapshot: unknown
): unknown {
  if (useLight) return sanitizeModulesConfigurationListLight(bucket, value, prevValue);
  return sanitizeModulesConfigurationListForPatch(
    bucket,
    value,
    prevValue,
    getModulesSanitizeOptions(bucket, cfgSnapshot, uiSnapshot)
  );
}

export function sanitizeStoreCornerConfiguration(
  value: unknown,
  prevValue: unknown,
  useLight: boolean
): unknown {
  return useLight
    ? sanitizeCornerConfigurationListsOnly(value, prevValue)
    : sanitizeCornerConfigurationForPatch(value, prevValue);
}
