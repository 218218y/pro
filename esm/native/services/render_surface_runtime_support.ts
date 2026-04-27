export type {
  AppLike,
  CameraLike,
  CameraPoseLike,
  CameraWritable,
  ControlsLike,
  ControlsWritable,
  Object3DCompatible,
  Object3DLike,
  Object3DWritable,
  RenderBag,
  RendererLike,
  RendererWritable,
  SurfaceRecord,
  ThreeRuntime,
  Vec3Writable,
  ViewportContainerLike,
} from './render_surface_runtime_support_shared.js';

export {
  clampNumber,
  readCameraWritable,
  readControlsWritable,
  readFiniteNumber,
  readObject3DWritable,
  readRendererWritable,
  readVec3Writable,
  readWebGLRenderTargetLike,
} from './render_surface_runtime_support_shared.js';

export {
  readCameraLike,
  readCameraPosition,
  readControlsLike,
  readControlsTarget,
  readObject3DLike,
  readRendererLike,
} from './render_surface_runtime_support_readers.js';

export {
  addNode,
  cloneVec3Like,
  ensureRendererShadowMap,
  scalePositionAroundTarget,
  setControlsEnableDamping,
  updateCameraAndControls,
  writeVec3,
} from './render_surface_runtime_support_ops.js';
