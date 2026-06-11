// Core public API surface (Pure ESM)
//
// Core/State layer owns store access, selectors, write access, persistence-oriented helpers,
// and cross-cutting runtime utilities that are not specific to Three.js / viewport ownership.

// Edit state helpers (used by UI bindings)
export { resetAllEditModes, syncWardrobeState } from '../services/edit_state.js';

// Models helpers (used by export and presets)
export { getModelById } from '../services/models.js';

// Site variant helpers
export { getSiteVariant, isSite2Variant } from '../services/site_variant.js';

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

export { MODES, getModeId, getModes } from '../runtime/modes_constants.js';

export {
  readConfigScalarFromSnapshot,
  readConfigScalarFromStore,
  readConfigScalarFromApp,
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

export {
  cfgGet,
  cfgRead,
  cfgMap,
  cfgSetScalar,
  applyConfigPatch,
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

export {
  metaMerge,
  metaUiOnly,
  metaRestore,
  metaTransient,
  metaNoHistory,
  metaNoBuild,
  metaInteractive,
} from '../runtime/meta_profiles_access.js';

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

export {
  readCornerConfigurationFromConfigSnapshot,
  sanitizeCornerCellListForPatch,
  sanitizeLowerCornerCellListForPatch,
  sanitizeCornerConfigurationListsOnly,
  sanitizeCornerConfigurationSnapshot,
  sanitizeCornerConfigurationForPatch,
} from '../features/modules_configuration/corner_cells_api.js';

export { getTools, getUiFeedback } from '../runtime/service_access.js';

export {
  shouldFailFast,
  reportError,
  toErrorMessage,
  getReportError,
  toError,
  guard,
  guardVoid,
  reportErrorThrottled,
  getBrowserDeps,
  getWindowMaybe,
  getDocumentMaybe,
  getLocationSearchMaybe,
  requestAnimationFrameMaybe,
  cancelAnimationFrameMaybe,
  requestIdleCallbackMaybe,
  getBrowserTimers,
  getBrowserFetchMaybe,
  queueMicrotaskMaybe,
  performanceNowMaybe,
  getNavigatorMaybe,
  getUserAgentMaybe,
  hasDom,
  get$,
  getById,
  getQs,
  getQsa,
  getDataAttrMaybe,
  getDataAttr,
  getDataAttrAny,
  hasDataAttr,
  setDataAttr,
  clearEl,
  setIconText,
  setStrongInline,
  setStrongSmall,
  getTabs,
  getTabContents,
  getScrollContainer,
  byId,
  hasStoreReactivityInstalled,
  installStoreReactivityMaybe,
  canCommitBootSeedUiSnapshot,
  commitBootSeedUiSnapshotMaybe,
  getHistorySystemMaybe,
  flushHistoryPendingPushMaybe,
  scheduleHistoryPushMaybe,
  pushHistoryStateMaybe,
  flushOrPushHistoryStateMaybe,
  validateRuntimeConfig,
  validateRuntimeFlags,
} from '../runtime/api.js';
