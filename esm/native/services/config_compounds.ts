// Native ESM implementation of the config compound seed service.
//
// Legacy source: `js/services/pro_services_config_compounds.js`
//
// Purpose: seed store.config compound objects (modulesConfiguration, cornerConfiguration)
//          outside of legacy boot compat.
//
// Goals:
// - No legacy `js/**` imports on the ESM path.
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
