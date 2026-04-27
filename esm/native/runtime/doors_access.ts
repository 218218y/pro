// Canonical doors service/runtime access helpers.
//
// Goals:
// - Keep callers off `App.services.doors.runtime` shape probing.
// - Centralize common doors-service actions behind stable helpers.
// - Never throw; missing services simply become no-ops/defaults.

export {
  ensureDoorsService,
  getDoorsService,
  getDoorsRuntime,
  ensureDrawerService,
  getDrawerService,
  getDrawerRuntime,
  initDrawerRuntime,
  getDoorEditHoldActive,
  readDoorsRuntimeNumber,
  writeDoorsRuntimeNumber,
  readDoorsRuntimeBool,
  writeDoorsRuntimeBool,
} from './doors_access_services.js';
export {
  getDrawerMetaMap,
  ensureDrawerMetaMap,
  resetDrawerMetaMap,
  getDrawerMetaEntry,
  setDrawerMetaEntry,
  setDrawerRebuildIntent,
  consumeDrawerRebuildIntent,
} from './doors_access_drawers.js';
export {
  getDoorsOpenViaService,
  getDoorsLastToggleTime,
  setDoorsOpenViaService,
  toggleDoorsViaService,
  releaseDoorsEditHoldViaService,
  closeDrawerByIdViaService,
  captureLocalOpenStateBeforeBuild,
  applyLocalOpenStateAfterBuild,
  applyEditHoldAfterBuild,
  syncDoorsVisualsNow,
  snapDrawersToTargetsViaService,
  getSuppressGlobalToggleUntil,
  setSuppressGlobalToggleUntil,
  suppressGlobalToggleForMs,
  getHardCloseUntil,
  setHardCloseUntil,
  setHardCloseForMs,
} from './doors_access_doors.js';
