// Canonical modules-configuration public seam.
//
// Ownership split:
// - modules_config_contracts.ts: shared contracts + read/clone helpers + container guards
// - modules_config_structure.ts: structure-aware top-module doors/defaults/materialization
// - modules_config_patch.ts: light snapshot sanitization + patch/update semantics

export {
  normalizeConfigModulesConfigurationContainersInPlace,
  readModulesConfigurationListFromConfigSnapshot,
} from './modules_config_contracts.js';

export type {
  EnsureModuleConfigItemOptions,
  ModulesConfigBucketKey,
  PatchModulesConfigurationListOptions,
  TopModuleStructureLike,
  UnknownBag,
} from './modules_config_contracts.js';

export {
  ensureModulesConfigurationItemFromConfigSnapshot,
  ensureModulesConfigurationItemFromListSnapshot,
  materializeTopModulesConfigurationForStructure,
  normalizeModuleItemForBucket,
  normalizeTopModuleConfigTyped,
  resolveTopModuleDoorsForIndex,
  resolveTopModuleDoorsFromUiConfigAt,
  resolveTopModulesStructureFromUiConfig,
} from './modules_config_structure.js';

export {
  cloneLightModulesConfigurationSnapshot,
  cloneModulesConfigurationSnapshot,
  ensureModulesConfigurationListAtForPatch,
  materializeTopModulesConfigurationFromUiConfig,
  patchModulesConfigurationListAtForPatch,
  sanitizeModulesConfigurationListForPatch,
  sanitizeModulesConfigurationListLight,
} from './modules_config_patch.js';
