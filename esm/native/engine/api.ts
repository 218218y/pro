// Engine public API surface (Pure ESM)
//
// Engine layer owns Three.js runtime surfaces and the services that consume them.

export { handleCanvasClickNDC, handleCanvasHoverNDC } from '../services/canvas_picking_core.js';
export {
  adjustCameraForChest,
  adjustCameraForCorner,
  resetCameraPreset,
} from '../services/camera_presets.js';
export {
  createViewportSurface,
  getViewportRenderCore,
  getViewportCamera,
  getViewportCameraControls,
  getViewportWardrobeGroup,
  getViewportRoomGroup,
  stampMirrorLastUpdate,
  snapshotViewportCameraPose,
  restoreViewportCameraPose,
  setViewportCameraPose,
  scaleViewportCameraDistance,
} from '../services/render_surface_runtime.js';
export {
  applyViewportSketchMode,
  setOrbitControlsEnabled,
  initializeViewportSceneSync,
} from '../services/viewport_runtime.js';
export {
  initializeSceneRuntime,
  syncSceneRuntimeFromStore,
  refreshSceneRuntimeLights,
  refreshSceneRuntimeMode,
} from '../services/scene_runtime.js';
export {
  getRenderContext,
  getCameraAndControls,
  type RenderContextLike,
} from '../runtime/render_context_access.js';
export {
  ensureRenderNamespace,
  getViewportSurface,
  getDoorsArray,
  getDrawersArray,
  clearRenderArrays,
} from '../runtime/api.js';
