// WardrobePro — Export canvas viewport + projection helpers (Native ESM)

export {
  getRenderCoreOrNull as _getRenderCore,
  getCameraOrNull,
  getCameraControlsOrNull,
  cloneRefTargetLike as _cloneRefTargetLike,
  planePointFromRefTarget as _planePointFromRefTarget,
} from './export_canvas_viewport_shared.js';
export {
  snapCameraToFrontPreset as _snapCameraToFrontPreset,
  autoZoomCamera,
} from './export_canvas_viewport_camera.js';
export {
  computeNotesRefZ as _computeNotesRefZ,
  captureExportRefPoints as _captureExportRefPoints,
  captureCameraPvInfo as _captureCameraPvInfo,
  buildNotesExportTransformFromArgs as _buildNotesExportTransform,
} from './export_canvas_viewport_refs.js';
export type { ThreeVector3Like } from './export_canvas_viewport_shared.js';
