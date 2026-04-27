// Feature/service-level public API sections extracted from services/api.ts
//
// Goal:
// - Keep the main services/api.ts entrypoint intentional and readable.
// - Preserve the exact public API while grouping feature seams by ownership.

export { handleCanvasClickNDC, handleCanvasHoverNDC } from './canvas_picking_core.js';
export { __wp_clearSketchHover as clearSketchHoverPreview } from './canvas_picking_local_helpers.js';
export { historyBatch } from '../runtime/app_helpers.js';

// Edit state helpers (used by UI bindings)
export { resetAllEditModes, syncWardrobeState } from './edit_state.js';

// Models helpers (used by export and presets)
export { getModelById } from './models.js';

export { materializeActiveGrooveLinesCountMap } from '../runtime/groove_lines_access.js';

// Site variant helpers
export { getSiteVariant, isSite2Variant } from './site_variant.js';

// Camera / viewport / scene / render helpers
export { adjustCameraForChest, adjustCameraForCorner, resetCameraPreset } from './camera_presets.js';
export {
  applyViewportSketchMode,
  setOrbitControlsEnabled,
  initializeViewportSceneSync,
  initializeViewportSceneSyncOrThrow,
  primeViewportBootCamera,
  primeViewportBootCameraOrThrow,
} from './viewport_runtime.js';
export {
  initializeSceneRuntime,
  syncSceneRuntimeFromStore,
  refreshSceneRuntimeLights,
  refreshSceneRuntimeMode,
} from './scene_runtime.js';
export {
  createViewportSurface,
  getViewportRenderCore,
  getViewportCamera,
  getViewportCameraControls,
  getViewportWardrobeGroup,
  stampMirrorLastUpdate,
  snapshotViewportCameraPose,
  restoreViewportCameraPose,
  setViewportCameraPose,
  scaleViewportCameraDistance,
} from './render_surface_runtime.js';
export {
  getDoorsOpen,
  setDoorsOpen,
  holdOpenForEdit,
  releaseEditHold,
  closeAllLocal,
  closeDrawerById,
  snapDrawersToTargets,
} from './doors_runtime.js';
export {
  getHistoryStatusMaybe,
  subscribeHistoryStatusMaybe,
  runHistoryUndoMaybe,
  runHistoryRedoMaybe,
  type HistoryStatusLike,
} from '../runtime/history_system_access.js';
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
} from '../runtime/doors_access.js';
