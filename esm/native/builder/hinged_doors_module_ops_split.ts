import { readDoorArchCut, sampleDoorArch } from '../../shared/door_arch_geometry.js';
import {
  HINGED_DOOR_RENDER_POLICY,
  HINGED_DOOR_SPLIT_GEOMETRY_POLICY,
} from '../../shared/dimensions/door_system_policy.js';
import {
  clampHandleAbsY,
  computeDefaultHandleAbsY,
  pushHingedDoorSegment,
} from './hinged_doors_module_ops_shared.js';
import { hasSketchExternalDrawerDoorCutsInConfig } from './sketch_external_drawer_door_cut_ownership.js';
import { grooveForPart } from './hinged_doors_module_ops_split_parts.js';
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

  const splitGap = HINGED_DOOR_SPLIT_GEOMETRY_POLICY.splitGapM;
  const visual = resolveHingedDoorSplitVisualState(ctx, state, splitGap);
  const bottomLineY = computeBottomSplitLineY(ctx, state, splitGap);
  const topSplitLineY = computeTopSplitLineY(ctx, state);
  const customSplitCutsY = computeCustomSplitCutsY(ctx, state);

  if (ctx.winterBraceDoorPlan.cuts.length) {
    appendCustomSplitHingedDoorSegments(
      ctx,
      state,
      visual,
      mergeSplitCuts(
        ctx,
        [
          ...(state.topSplitEnabled ? (customSplitCutsY.length ? customSplitCutsY : [topSplitLineY]) : []),
          ...ctx.winterBraceDoorPlan.cuts,
        ],
        bottomLineY,
        state.bottomSplitEnabled
      )
    );
    return;
  }

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
    bottomLineY < topSplitLineY - HINGED_DOOR_SPLIT_GEOMETRY_POLICY.minSegmentHeightM
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

export function appendArchedHingedDoorOps(
  ctx: HingedDoorModuleOpsContext,
  state: HingedDoorIterationState
): boolean {
  const cut = ctx.splitDoors && readDoorArchCut(ctx.cfg.splitDoorsMap?.[`splitarch_d${state.currentDoorId}`]);
  if (
    !cut ||
    ctx.winterBraceDoorPlan.cuts.length ||
    hasSketchExternalDrawerDoorCutsInConfig(ctx.configRecord)
  )
    return false;

  const halfWidth = (state.doorWidth - HINGED_DOOR_RENDER_POLICY.visualWidthClearanceM) / 2;
  const gap =
    (HINGED_DOOR_SPLIT_GEOMETRY_POLICY.splitGapM + HINGED_DOOR_RENDER_POLICY.visualHeightClearanceM) / 2;
  const rect = {
    minX: -halfWidth,
    maxX: halfWidth,
    minY: ctx.doorBottomY,
    maxY: ctx.doorBottomY + ctx.totalDoorSpace,
  };
  const curve = sampleDoorArch(
    { ...rect, maxY: rect.minY + cut.peak * ctx.totalDoorSpace },
    {
      start: cut.profile.start,
      end: cut.profile.end,
      rise: cut.profile.rise / cut.peak,
    }
  );
  const curveLow = Math.min(...curve.map(point => point.y));
  const curveHigh = Math.max(...curve.map(point => point.y));
  const minSegment = HINGED_DOOR_SPLIT_GEOMETRY_POLICY.minSegmentHeightM;
  if (!(halfWidth > 0) || curveLow - gap - rect.minY < minSegment || rect.maxY - curveHigh - gap < minSegment)
    return false;

  const fullCurtain = ctx.resolveCurtainForPart(state.sourceKey, null);
  const fullGroove = ctx.grooveValSafe(state.currentDoorId, 'full', false);
  const defaultHandle = computeDefaultHandleAbsY(ctx, state.currentDoorId);
  for (const upper of [false, true]) {
    const partId = upper ? state.topKey : state.botKey;
    const bottom = upper ? curveLow + gap : rect.minY;
    const top = upper ? rect.maxY : curveHigh - gap;
    const segY = (bottom + top) / 2;
    const safeHandleBottom = upper ? curveHigh + gap : bottom;
    const safeHandleTop = upper ? top : curveLow - gap;
    const halfClearance = HINGED_DOOR_RENDER_POLICY.visualHeightClearanceM / 2;
    const straightEdge = (upper ? top - halfClearance : bottom + halfClearance) - segY;
    const contour = [
      { x: -halfWidth, y: straightEdge },
      ...curve.map(point => ({ x: point.x, y: point.y - segY + (upper ? gap : -gap) })),
      { x: halfWidth, y: straightEdge },
    ];
    pushHingedDoorSegment(ctx, state, {
      partId,
      segY,
      segH: top - bottom,
      curtainVal: ctx.resolveCurtainForPart(partId, fullCurtain),
      grooveFlag: grooveForPart(ctx, partId, fullGroove),
      handleAbsY: clampHandleAbsY(ctx, defaultHandle, safeHandleBottom, safeHandleTop, partId),
      allowHandle: true,
      colorVal: ctx.getPartColorValueSafe(partId),
      archCut: { contour, baseMinY: rect.minY - segY, baseMaxY: rect.maxY - segY },
    });
  }
  return true;
}
