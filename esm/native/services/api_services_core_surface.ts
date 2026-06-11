// Core/cross-cutting service access public API section extracted from api_services_surface.ts

export { ensureServicesRoot } from '../runtime/services_root_access.js';
export {
  getToolsServiceMaybe,
  ensureToolsService,
  getTools,
  getUiFeedbackServiceMaybe,
  ensureUiFeedbackService,
  getUiFeedback,
} from '../runtime/service_access.js';
export {
  getCloudSyncServiceMaybe,
  getCloudSyncServiceStateMaybe,
  ensureCloudSyncServiceState,
  getCloudSyncTestHooksMaybe,
} from '../runtime/cloud_sync_access.js';
export {
  getBuildInfoServiceMaybe,
  ensureBuildInfoService,
  getBuildTagsSnapshot,
  setBuildTag,
  getSlidingDoorsFixTag,
  setSlidingDoorsFixTag,
} from '../runtime/build_info_access.js';
export { getErrorsServiceMaybe, ensureErrorsService } from '../runtime/errors_access.js';
export {
  getErrorsRuntimeServiceMaybe,
  ensureErrorsRuntimeService,
  isErrorsFatalShown,
  setErrorsFatalShown,
  getErrorsWindowEventsCleanup,
  setErrorsWindowEventsCleanup,
  clearErrorsWindowEventsCleanup,
} from '../runtime/errors_runtime_access.js';
export {
  getConfigCompoundsServiceMaybe,
  ensureConfigCompoundsService,
} from '../runtime/config_compounds_access.js';
export {
  getBuildReactionsServiceMaybe,
  ensureBuildReactionsService,
} from '../runtime/build_reactions_access.js';
export { getCommandsServiceMaybe, ensureCommandsService } from '../runtime/commands_access.js';
export { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';
export {
  getStorageServiceMaybe,
  getStorageKey,
  getStorageString,
  getStorageJSON,
  setStorageString,
  setStorageJSON,
  removeStorageKey,
} from '../runtime/storage_access.js';
export {
  getServiceInstallStateMaybe,
  ensureServiceInstallState,
  isAppStartInstalled,
  markAppStartInstalled,
  isAppStartStarted,
  setAppStartStarted,
  isCameraInstalled,
  markCameraInstalled,
  isAutosaveInstalled,
  markAutosaveInstalled,
  isViewportInstalled,
  markViewportInstalled,
  isConfigCompoundsInstalled,
  markConfigCompoundsInstalled,
  isErrorsInstalled,
  markErrorsInstalled,
  isUiBootMainInstalled,
  markUiBootMainInstalled,
  isBootInstalled,
  markBootInstalled,
  isPlatformInstalled,
  markPlatformInstalled,
  isSmokeChecksInstalled,
  markSmokeChecksInstalled,
  isBrowserUiOpsInstalled,
  markBrowserUiOpsInstalled,
  isLifecycleVisibilityInstalled,
  markLifecycleVisibilityInstalled,
} from '../runtime/install_state_access.js';
