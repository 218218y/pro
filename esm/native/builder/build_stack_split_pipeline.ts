import { getWardrobeGroup } from '../runtime/render_access.js';
import { readRecord } from './build_flow_readers.js';
import { buildModulesLoop } from './module_loop_pipeline.js';
import { applyHingedDoorOpsAfterModules } from './hinged_doors_pipeline.js';
import { applySlidingDoorsIfNeeded } from './sliding_doors_pipeline.js';
import {
  shiftWardrobeRange,
  syncShiftedBuildContextDims,
  syncShiftedInternalGridMapY,
} from './build_stack_shift_runtime.js';
import {
  finalizeBuiltStackSplitLowerRange,
  prepareStackSplitLowerSetup,
} from './build_stack_split_shared.js';
import {
  applyStackSplitLowerCornerWingIfNeeded,
  createStackSplitLowerBuildContext,
} from './build_stack_split_context.js';

import type {
  BuildStackSplitLowerUnitArgs,
  BuildStackSplitLowerUnitResult,
  FinalizeStackSplitUpperShiftArgs,
} from './build_stack_split_shared.js';

export function buildStackSplitLowerUnit(args: BuildStackSplitLowerUnitArgs): BuildStackSplitLowerUnitResult {
  const prepared = prepareStackSplitLowerSetup(args);
  const lowerCtx = createStackSplitLowerBuildContext({ buildArgs: args, prepared });

  buildModulesLoop(lowerCtx);
  applyHingedDoorOpsAfterModules(lowerCtx);
  applySlidingDoorsIfNeeded(lowerCtx);
  applyStackSplitLowerCornerWingIfNeeded({ buildArgs: args, lowerCtx });

  const upperStartIndex = finalizeBuiltStackSplitLowerRange({
    App: args.App,
    group: prepared.group,
    splitBottomStartIndex: prepared.splitBottomStartIndex,
    splitDzBottom: prepared.splitDzBottom,
  });

  return {
    splitY: prepared.splitY,
    splitDzTop: prepared.splitDzTop,
    upperStartIndex,
  };
}

export function finalizeStackSplitUpperShift(args: FinalizeStackSplitUpperShiftArgs): void {
  if (!args.splitActive || !(args.splitY > 0) || args.upperStartIndex < 0) return;

  const group = readRecord(getWardrobeGroup(args.App));
  const endIdx = group && Array.isArray(group.children) ? group.children.length : -1;
  shiftWardrobeRange({
    App: args.App,
    fromIdx: args.upperStartIndex,
    toIdx: endIdx,
    dy: args.splitY,
    dz: args.splitDzTop,
    adjustHandleAbsY: false,
  });
  syncShiftedInternalGridMapY(args.App, args.splitY);
  syncShiftedBuildContextDims(args.buildCtx, args.splitY, args.splitDzTop);
}
