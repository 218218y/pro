export type {
  HingedDoorIterationState,
  HingedDoorModuleOpsContext,
  HingedDoorPivotSpec,
} from './hinged_doors_module_ops_contracts.js';
export type { AppendHingedDoorOpsParams } from './hinged_doors_shared.js';

export { createHingedDoorModuleOpsContext } from './hinged_doors_module_ops_context.js';
export {
  appendDrawerShadowPlane,
  createHingedDoorIterationState,
} from './hinged_doors_module_ops_iteration.js';
export {
  computeDefaultHandleAbsY,
  hasExplicitHandleOverride,
  clampHandleAbsY,
  topSplitHandleInsetForPart,
} from './hinged_doors_module_ops_handle_policy.js';
export { pushHingedDoorSegment, readSplitPosListSafe } from './hinged_doors_module_ops_segments.js';
