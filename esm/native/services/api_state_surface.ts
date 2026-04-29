// State/config/meta public API sections extracted from services/api.ts

// Store/root state access (App.store-backed)
export {
  asRootState,
  readRootStateFromStore,
  readSliceFromStore,
  readSliceFromApp,
  readUiStateFromStore,
  readUiStateFromApp,
  readUiRawInputsFromStore,
  readUiRawScalarFromStore,
  readConfigStateFromStore,
  readConfigStateFromApp,
  readRuntimeStateFromStore,
  readRuntimeStateFromApp,
  readModeStateFromStore,
  readModeStateFromApp,
  readMetaStateFromStore,
  readMetaStateFromApp,
  readRootState,
} from '../runtime/root_state_access.js';

// Mode ids (canonical constants)
export { MODES, getModeId, getModes } from '../runtime/modes_constants.js';

// Config selectors (typed readers + normalization)
export {
  readConfigScalarFromSnapshot,
  readConfigScalarFromStore,
  readConfigScalarFromApp,
  readConfigLooseScalarFromApp,
  readConfigNumberLooseFromApp,
  readConfigBoolFromSnapshot,
  readConfigBoolFromStore,
  readConfigBoolFromApp,
  readConfigEnumFromSnapshot,
  readConfigEnumFromStore,
  readConfigEnumFromApp,
  readConfigStringFromSnapshot,
  readConfigNullableStringFromSnapshot,
  readConfigScalarOrDefault,
  readConfigScalarOrDefaultFromStore,
  readConfigScalarOrDefaultFromApp,
  readConfigArrayFromSnapshot,
  readConfigMapFromSnapshot,
} from '../runtime/config_selectors.js';

// Runtime selectors
export {
  readRuntimeScalarFromSnapshot,
  readRuntimeScalarFromStore,
  readRuntimeScalarFromApp,
  readRuntimeBoolFromSnapshot,
  readRuntimeNumberFromSnapshot,
  readRuntimeNullableNumberFromSnapshot,
  readRuntimeScalarOrDefault,
  readRuntimeScalarOrDefaultFromStore,
  readRuntimeScalarOrDefaultFromApp,
} from '../runtime/runtime_selectors.js';

// UI raw selectors + snapshot sanity
export {
  readUiRawScalarFromSnapshot,
  readUiRawScalarFromCanonicalSnapshot,
  hasEssentialUiDimsFromSnapshot,
  hasCanonicalEssentialUiRawDimsFromSnapshot,
  ensureUiRawDimsFromSnapshot,
  assertCanonicalUiRawDims,
  readUiRawNumberFromSnapshot,
  readUiRawIntFromSnapshot,
  readCanonicalUiRawNumberFromSnapshot,
  readCanonicalUiRawIntFromSnapshot,
  readCanonicalUiRawDimsCmFromSnapshot,
  readUiRawNumberFromStore,
  readUiRawIntFromStore,
  readUiRawNumberFromStoreUi,
  readUiRawIntFromStoreUi,
  readUiRawDimsCmFromSnapshot,
  readUiRawDimsCmFromStore,
  readCanonicalUiRawDimsCmFromStore,
} from '../runtime/ui_raw_selectors.js';

// Config write/router seam
export {
  asModulesConfiguration,
  readCurtainMapSnapshot,
  readDoorSpecialMapSnapshot,
  readHandlesMapSnapshot,
  readHingeMapSnapshot,
  readIndividualColorsMapSnapshot,
} from '../runtime/cfg_access_shared.js';

export {
  cfgGet,
  cfgRead,
  cfgMap,
  cfgSetScalar,
  applyConfigPatch,
  applyConfigPatchReplaceKeys,
  cfgSetMap,
  patchConfigMap,
  cfgBatch,
  setCfgModulesConfiguration,
  setCfgLowerModulesConfiguration,
  setCfgCornerConfiguration,
  setCfgHingeMap,
  setCfgHandlesMap,
  setCfgManualWidth,
  setCfgWardrobeType,
  setCfgMultiColorMode,
  setCfgBoardMaterial,
  setCfgGlobalHandleType,
  setCfgShowDimensions,
  setCfgLibraryMode,
  setCfgWidth,
  setCfgHeight,
  setCfgDepth,
  setCfgCustomUploadedDataURL,
  setCfgSavedColors,
  setCfgColorSwatchesOrder,
  setCfgIndividualColors,
  setCfgCurtainMap,
  setCfgDoorSpecialMap,
} from '../runtime/cfg_access.js';

// UI / Runtime write access seams (canonical-first; keeps callsites off store.patch envelopes).
export {
  patchUi,
  patchUiSoft,
  setUiScalar,
  setUiScalarSoft,
  setUiRawScalar,
  setUiLastSelectedWallColor,
  setUiLightScalar,
  patchUiLightingState,
} from '../runtime/ui_write_access.js';
export {
  patchRuntime,
  setRuntimeScalar,
  setRuntimeSketchMode,
  setRuntimeGlobalClickMode,
  setRuntimeRestoring,
  setRuntimeSystemReady,
} from '../runtime/runtime_write_access.js';
export { patchMode, setModePrimary } from '../runtime/mode_write_access.js';

// Meta profiles (canonical-first; keeps UI/IO off kernel/runtime probing).
export {
  metaMerge,
  metaUiOnly,
  metaRestore,
  metaTransient,
  metaNoHistory,
  metaNoBuild,
  metaInteractive,
} from '../runtime/meta_profiles_access.js';

// Maps access seam
export {
  getGrooveReader,
  getCurtainReader,
  readMap,
  readMapOrEmpty,
  readHandle,
  writeHandle,
  writeHinge,
  writeMapKey,
  readSavedColors,
  writeSavedColors,
  writeColorSwatchesOrder,
} from '../runtime/maps_access.js';

// Corner cells canonical API (feature-level helpers, safe for UI/runtime use)
export {
  readCornerConfigurationFromConfigSnapshot,
  sanitizeCornerCellListForPatch,
  sanitizeLowerCornerCellListForPatch,
  sanitizeCornerConfigurationListsOnly,
  sanitizeCornerConfigurationSnapshot,
  sanitizeCornerConfigurationForPatch,
} from '../features/modules_configuration/corner_cells_api.js';

// Canonical store/app root seams exposed for same-layer consumers (UI/IO) without direct runtime imports.
export {
  getStoreSurfaceMaybe,
  requireStoreSurface,
  getStorePatchSurfaceMaybe,
  requireStorePatchSurface,
  getStoreSelectorSurfaceMaybe,
  requireStoreSelectorSurface,
  readStoreStateMaybe,
  getStoreSubscriber,
  getStoreSelectorSubscriber,
} from '../runtime/store_surface_access.js';

export { getConfigRootMaybe } from '../runtime/app_roots_access.js';
