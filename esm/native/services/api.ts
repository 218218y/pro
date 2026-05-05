// Services public API surface (Pure ESM)
//
// This module remains the single public entry point for UI/IO and other layers.
// Internals are grouped into smaller same-layer sections so the entry surface stays
// intentional and readable without changing the public contract.

export * from './api_feature_surface.js';
export * from './api_state_surface.js';
export * from './api_services_surface.js';
export * from './api_runtime_base_surface.js';
export * from './api_actions_surface.js';

// Keep representative named exports visible at the entry surface so source-contract
// guards can verify the public API without walking every grouped section.
export {
  getHeaderLogoImageMaybe,
  getViewerContainerMaybe,
  getReactMountRootMaybe,
  ensureToastContainerMaybe,
  triggerHrefDownloadResultViaBrowser,
  triggerHrefDownloadViaBrowser,
  triggerBlobDownloadResultViaBrowser,
  triggerBlobDownloadViaBrowser,
  triggerCanvasDownloadResultViaBrowser,
  triggerCanvasDownloadViaBrowser,
  validateRuntimeConfig,
  validateRuntimeFlags,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  getDefaultDepthForWardrobeType,
  getDefaultDoorsForWardrobeType,
} from './api_runtime_base_surface.js';

export {
  getDoorsActions,
  getModulesActions,
  listModulesActionFns,
  getSaveProjectAction,
  setSaveProjectAction,
  saveProjectResultViaActions,
  saveProjectViaActions,
  commitUiSnapshotViaActions,
  commitUiSnapshotViaActionsOrThrow,
  setDirtyViaActions,
  setDirtyViaActionsOrThrow,
  applyProjectConfigSnapshotViaActionsOrThrow,
  renderModelUiViaActionsOrThrow,
  patchViaActions,
} from './api_actions_surface.js';

export {
  createStructuralModulesRecomputeMeta,
  createStructuralModulesRecomputeOpts,
  didStructuralModulesRecomputeFail,
  getAppStructuralModulesRecompute,
  readStructuralModulesRecomputeResult,
  runStructuralModulesRecompute,
  runAppStructuralModulesRecompute,
} from './api_actions_surface.js';

export {
  createViewportSurface,
  setViewportCameraPose,
  resetCameraPreset,
  primeViewportBootCamera,
  primeViewportBootCameraOrThrow,
  initializeViewportSceneSyncOrThrow,
} from './api_feature_surface.js';

export {
  getUiFeedbackServiceMaybe,
  ensureUiFeedbackService,
  installStableSurfaceMethod,
  reportErrorViaPlatform,
  triggerRenderViaPlatform,
  runPlatformRenderFollowThrough,
  runPlatformWakeupFollowThrough,
  runPlatformActivityRenderTouch,
  createCanvasViaPlatform,
  ensureCommandsService,
  ensureServicesRoot,
  getStorageString,
  getThreeMaybe,
  assertThreeViaDeps,
  getBuilderDepsRoot,
  ensureBuilderDepsNamespace,
  ensureRoomDesignService,
  getRoomDesignServiceMaybe,
  requireRoomDesignService,
  moveCameraViaService,
  updateSceneLightsViaService,
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
  buildDefaultProjectDataViaService,
  buildResetDefaultProjectData,
  readResetDefaultProjectPayload,
  resetProjectToDefaultActionResult,
  resetProjectToDefault,
  normalizeProjectIoLoadResult,
  loadProjectDataViaService,
  loadProjectDataResultViaService,
  handleProjectFileLoadViaService,
  readAutosaveProjectPayload,
  restoreProjectAutosavePayloadActionResultViaService,
  restoreProjectSessionActionResultViaService,
  restoreProjectSessionActionResultViaServiceOrThrow,
  getUiNotesServiceMaybe,
  ensureUiNotesService,
  exitNotesDrawModeViaService,
  subscribeNotesDrawMode,
  beginUiBootSession,
  clearUiBootRuntimeState,
  installUiBootReadyTimers,
  nextProjectIoRestoreGeneration,
  isProjectIoRestoreGenerationCurrent,
  persistNotesViaService,
  sanitizeNotesHtmlViaService,
} from './api_services_surface.js';
