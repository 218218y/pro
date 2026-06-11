// Service/runtime access public API surface.
//
// This file intentionally stays as a thin barrel so the public API remains stable
// while ownership is grouped into smaller same-layer sections.

export * from './api_services_core_surface.js';
export * from './api_services_ui_surface.js';
export * from './api_services_project_surface.js';
export * from './api_services_platform_surface.js';

// Keep representative named exports visible here so source-contract guards can
// verify the grouped service surface without expanding every sub-surface file.
export {
  getUiFeedbackServiceMaybe,
  ensureUiFeedbackService,
  getUiFeedback,
  ensureCommandsService,
  installStableSurfaceMethod,
  getStorageString,
  ensureServicesRoot,
} from './api_services_core_surface.js';

export {
  ensureUiNotesService,
  persistNotesViaService,
  sanitizeNotesHtmlViaService,
  exitNotesDrawModeViaService,
  subscribeNotesDrawMode,
  beginUiBootSession,
  clearUiBootRuntimeState,
  installUiBootReadyTimers,
} from './api_services_ui_surface.js';

export {
  readAutosaveInfoFromStorage,
  readAutosavePayloadFromStorage,
  readAutosavePayloadFromStorageResult,
  normalizeAutosaveInfo,
  normalizeAutosavePayload,
  setAutosaveAllowed,
  resetAllEditModesViaService,
  getCustomUploadedTextureMaybe,
  normalizeModelRecord,
  normalizeModelList,
} from './api_services_project_surface.js';

export {
  reportErrorViaPlatform,
  triggerRenderViaPlatform,
  runPlatformRenderFollowThrough,
  runPlatformWakeupFollowThrough,
  runPlatformActivityRenderTouch,
  createCanvasViaPlatform,
  getBuilderDepsRoot,
  ensureBuilderDepsNamespace,
  ensureRoomDesignService,
  getRoomDesignServiceMaybe,
  requireRoomDesignService,
  getThreeMaybe,
  assertThreeViaDeps,
} from './api_services_platform_surface.js';
