// Canonical drawer render shared facade.
//
// Drawer render consumers import this public seam while contracts, runtime
// guards, argument readers, drawer-op parsing, and visual-state policy live in
// focused owner modules below it.

export type {
  BuilderRenderDrawerDeps,
  DrawerConfig,
  ExternalDrawerOpLike,
  GetPartColorValueFn,
  GetPartMaterialFn,
  InternalDrawerOpLike,
  RegisterFn,
} from './render_drawer_ops_shared_types.js';
export {
  isFunction,
  isRecord,
  readFinite,
  readFinitePositive,
  readObject3D,
  readThreeLike,
} from './render_drawer_ops_shared_guards.js';
export {
  readAddFoldedClothes,
  readCreateDoorVisual,
  readCreateInternalDrawerBox,
  readDrawerConfig,
  readGetPartColorValue,
  readGetPartMaterial,
  readOutlineFn,
} from './render_drawer_ops_shared_readers.js';
export { readExternalDrawerOp, readInternalDrawerOp } from './render_drawer_ops_shared_ops.js';
export { resolveDrawerVisualState } from './render_drawer_ops_shared_visual_state.js';
