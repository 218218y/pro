// Native ESM implementation of the config compound seed service.
//
// Purpose: seed store.config compound objects (modulesConfiguration, cornerConfiguration)
//          through the canonical config service path.
//
// Goals:
// - No retired script imports on the ESM path.
// - No IIFE / implicit globals.
// - Idempotency marker is stored in internal boot flags (see runtime/internal_state).

export type {
  ConfigCompoundKey,
  ConfigCompoundsSeedOptions,
  SeedCompoundValueMap,
} from './config_compounds_shared.js';

export {
  buildSeedMeta,
  cloneSeedOptions,
  defaultCornerConfiguration,
  getCfgNow,
  getCfgSnapshot,
  getUiSnapshot,
  readConfigStateLike,
  readFiniteNumber,
  safeClone,
  seedIfMissing,
} from './config_compounds_shared.js';

export { isConfigCompoundsSeeded, seedConfigCompounds } from './config_compounds_seed.js';
export { installConfigCompoundsService } from './config_compounds_runtime.js';
