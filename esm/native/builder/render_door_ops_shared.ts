export type {
  BuilderRenderDoorDeps,
  DoorsArrayFn,
  GetHandleTypeFn,
  GetMaterialFn,
  GetMirrorMaterialFn,
  GetPartColorValueFn,
  GetPartMaterialFn,
  HandleMeshFactory,
  HingedDoorOpLike,
  MarkDirtyFn,
  RegisterFn,
  SlidingDoorConfig,
  SlidingDoorOpLike,
  SlidingDoorVisualState,
  SlidingRailLike,
  SlidingTrackPalette,
  SlidingUiState,
  TagMirrorSurfaceFn,
  WardrobeGroupFn,
} from './render_door_ops_shared_contracts.js';

export {
  isRecord,
  isFunction,
  readCurtainType,
  readThreeLike,
  readObject3D,
  readCloneableMaterial,
  readGetMaterial,
  readGetPartMaterial,
  readGetPartColorValue,
  readDoorVisualFactory,
  readHandleMeshFactory,
  readGetHandleType,
} from './render_door_ops_shared_core.js';
export {
  readDoorConfig,
  readSlidingUiState,
  resolveDoorVisualStyle,
  resolveMirrorLayout,
  resolveSlidingDoorVisualState,
  resolveHandleType,
} from './render_door_ops_shared_config.js';
export { readSlidingDoorOp, readSlidingRail, readHingedDoorOp } from './render_door_ops_shared_ops.js';
export {
  createSlidingTrackPalette,
  createRailMaterial,
  buildRailGroup,
} from './render_door_ops_shared_materials.js';
