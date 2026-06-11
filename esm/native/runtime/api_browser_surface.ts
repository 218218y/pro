// Grouped browser/dom/runtime environment exports.

export {
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
} from './browser_env.js';

export { MODES, getModeId, getModes } from './modes_constants.js';
export { getAppLayers, ensureAppLayers, getAppLayer, ensureAppLayer } from './layers_access.js';
export {
  getBrowserSurfaceMaybe,
  ensureBrowserSurface,
  getBrowserDomStateMaybe,
  ensureBrowserDomState,
  getBrowserMethodMaybe,
  readBrowserStringMaybe,
} from './browser_surface_access.js';
export { getErrorsServiceMaybe, ensureErrorsService } from './errors_access.js';
export {
  getCloudSyncServiceMaybe,
  getCloudSyncServiceStateMaybe,
  ensureCloudSyncServiceState,
  getCloudSyncTestHooksMaybe,
} from './cloud_sync_access.js';
export { getConfigCompoundsServiceMaybe, ensureConfigCompoundsService } from './config_compounds_access.js';
