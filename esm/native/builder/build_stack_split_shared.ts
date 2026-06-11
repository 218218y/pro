// Stack-split lower-build shared seam (Pure ESM)
//
// Keeps the public stack-split lower-unit surface stable while focused owners
// handle contracts, bottom-layout seeding, handle/pivot remapping, lower-setup
// assembly, and lower-range shifting.

export type {
  BuildStackSplitLowerUnitArgs,
  BuildStackSplitLowerUnitResult,
  FinalizeStackSplitUpperShiftArgs,
  PreparedStackSplitLowerSetup,
  ShowToastFn,
} from './build_stack_split_contracts.js';

export { toStr } from './build_stack_split_contracts.js';
export {
  buildBottomModuleConfigSeed,
  computeBottomModulesCount,
  makeBottomUi,
} from './build_stack_split_bottom_layout.js';
export {
  buildShiftedBottomHingedPivotMap,
  createBottomHandleTypeResolver,
} from './build_stack_split_bottom_handles.js';
export { prepareStackSplitLowerSetup } from './build_stack_split_lower_setup.js';
export { finalizeBuiltStackSplitLowerRange } from './build_stack_split_shift.js';
