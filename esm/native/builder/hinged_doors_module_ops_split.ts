import { DOOR_SYSTEM_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { computeDefaultHandleAbsY } from './hinged_doors_module_ops_shared.js';
import type {
  HingedDoorIterationState,
  HingedDoorModuleOpsContext,
} from './hinged_doors_module_ops_contracts.js';
import {
  computeBottomSplitLineY,
  computeCustomSplitCutsY,
  computeTopSplitLineY,
  mergeSplitCuts,
} from './hinged_doors_module_ops_split_policy.js';
import {
  appendBottomSplitHingedDoorSegments,
  appendCustomSplitHingedDoorSegments,
  appendTopSplitHingedDoorSegments,
  appendTripleSplitHingedDoorSegments,
  type HingedDoorSplitVisualState,
} from './hinged_doors_module_ops_split_routes.js';

function resolveHingedDoorSplitVisualState(
  ctx: HingedDoorModuleOpsContext,
  state: HingedDoorIterationState,
  splitGap: number
): HingedDoorSplitVisualState {
  const curtainFull = ctx.cfg.isMultiColorMode ? ctx.resolveCurtainForPart(state.sourceKey, null) : null;
  const isFullGrooved = ctx.grooveValSafe(state.currentDoorId, 'full', false);

  return {
    splitGap,
    defaultHandleAbsY: computeDefaultHandleAbsY(ctx, state.currentDoorId),
    curtainFull,
    isFullGrooved,
    topColorVal: ctx.getPartColorValueSafe(state.topKey),
    midColorVal: ctx.getPartColorValueSafe(state.midKey),
    botColorVal: ctx.getPartColorValueSafe(state.botKey),
    curtainTop: ctx.cfg.isMultiColorMode ? ctx.resolveCurtainForPart(state.topKey, curtainFull) : null,
    curtainMid: ctx.cfg.isMultiColorMode ? ctx.resolveCurtainForPart(state.midKey, curtainFull) : null,
    curtainBot: ctx.cfg.isMultiColorMode ? ctx.resolveCurtainForPart(state.botKey, curtainFull) : null,
    grooveTop: ctx.grooveValSafe(state.currentDoorId, 'top', isFullGrooved),
    grooveMid: ctx.grooveValSafe(state.currentDoorId, 'mid', isFullGrooved),
    grooveBot: ctx.grooveValSafe(state.currentDoorId, 'bot', isFullGrooved),
  };
}

export function appendSplitHingedDoorOps(
  ctx: HingedDoorModuleOpsContext,
  state: HingedDoorIterationState
): void {
  if (!ctx.opsList) {
    throw new Error('[WardrobePro] Hinged door ops list missing (split)');
  }

  const splitGap = DOOR_SYSTEM_DIMENSIONS.hinged.split.splitGapM;
  const visual = resolveHingedDoorSplitVisualState(ctx, state, splitGap);
  const bottomLineY = computeBottomSplitLineY(ctx, state, splitGap);
  const topSplitLineY = computeTopSplitLineY(ctx, state);
  const customSplitCutsY = computeCustomSplitCutsY(ctx, state);

  if (state.topSplitEnabled && customSplitCutsY.length) {
    appendCustomSplitHingedDoorSegments(
      ctx,
      state,
      visual,
      mergeSplitCuts(ctx, customSplitCutsY, bottomLineY, state.bottomSplitEnabled)
    );
    return;
  }

  if (
    state.topSplitEnabled &&
    state.bottomSplitEnabled &&
    bottomLineY < topSplitLineY - DOOR_SYSTEM_DIMENSIONS.hinged.split.minSegmentHeightM
  ) {
    appendTripleSplitHingedDoorSegments(ctx, state, visual, topSplitLineY, bottomLineY);
    return;
  }

  if (state.topSplitEnabled) {
    appendTopSplitHingedDoorSegments(ctx, state, visual, topSplitLineY);
    return;
  }

  if (state.bottomSplitEnabled) {
    appendBottomSplitHingedDoorSegments(ctx, state, visual, bottomLineY);
  }
}
