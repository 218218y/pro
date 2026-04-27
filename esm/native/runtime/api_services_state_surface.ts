// Grouped runtime-owned services/state access seams.

export {
  ensureDoorsService,
  getDoorsService,
  getDoorsRuntime,
  readDoorsRuntimeNumber,
  writeDoorsRuntimeNumber,
  readDoorsRuntimeBool,
  writeDoorsRuntimeBool,
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
  getDoorEditHoldActive,
  getSuppressGlobalToggleUntil,
  setSuppressGlobalToggleUntil,
  suppressGlobalToggleForMs,
  getHardCloseUntil,
  setHardCloseUntil,
  setHardCloseForMs,
} from './doors_access.js';

export {
  getServicesRootMaybe,
  ensureServicesRoot,
  getServiceSlotMaybe,
  ensureServiceSlot,
} from './services_root_access.js';
export { getBuildReactionsServiceMaybe, ensureBuildReactionsService } from './build_reactions_access.js';
export {
  getErrorsRuntimeServiceMaybe,
  ensureErrorsRuntimeService,
  isErrorsFatalShown,
  setErrorsFatalShown,
  getErrorsWindowEventsCleanup,
  setErrorsWindowEventsCleanup,
  clearErrorsWindowEventsCleanup,
} from './errors_runtime_access.js';
export {
  getUiNotesExportServiceMaybe,
  ensureUiNotesExportService,
  getUiNotesExportRuntimeServiceMaybe,
  ensureUiNotesExportRuntimeService,
  isUiNotesExportInstalled,
  markUiNotesExportInstalled,
  getNotesExportTransform,
  setNotesExportTransform,
  clearNotesExportTransform,
} from './ui_notes_export_access.js';
export {
  getUiBootRuntimeServiceMaybe,
  getUiBootRuntimeState,
  ensureUiBootRuntimeService,
  markUiBootDidInit,
  setUiBootBooting,
  setUiBootBuildScheduled,
} from './ui_boot_state_access.js';
export {
  getUiModesRuntimeServiceMaybe,
  ensureUiModesRuntimeService,
  getModesControllerMaybe,
  setModesController,
  getPrimaryModeEffectsMaybe,
  setPrimaryModeEffects,
} from './ui_modes_runtime_access.js';
