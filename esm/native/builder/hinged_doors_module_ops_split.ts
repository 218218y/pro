import type { DoorArchPoint } from '../../../types/maps.js';
import {
  doorArchCutEdges,
  doorArchCutsAreSeparate,
  readDoorArchCuts,
  sampleDoorCutEdgePair,
  resolveDoorArchCutSlice,
} from '../../shared/door_arch_geometry.js';
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
import { grooveForPart, partIdForSegment } from './hinged_doors_module_ops_split_parts.js';
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
  const cuts = ctx.splitDoors
    ? readDoorArchCuts(ctx.cfg.splitDoorsMap?.[`splitarch_d${state.currentDoorId}`])
    : [];
  if (
    !cuts.length ||
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
  if (!(halfWidth > 0)) return false;
  const minSegment = HINGED_DOOR_SPLIT_GEOMETRY_POLICY.minSegmentHeightM;
  const custom = state.topSplitEnabled ? computeCustomSplitCutsY(ctx, state) : [];
  const fixedTop =
    state.topSplitEnabled && ctx.isDoorSplitExplicitOn(ctx.cfg.splitDoorsMap, state.currentDoorId);
  const straight = mergeSplitCuts(
    ctx,
    custom.length ? custom : fixedTop ? [computeTopSplitLineY(ctx, state)] : [],
    computeBottomSplitLineY(ctx, state, HINGED_DOOR_SPLIT_GEOMETRY_POLICY.splitGapM),
    state.bottomSplitEnabled
  );
  const clearance = HINGED_DOOR_SPLIT_GEOMETRY_POLICY.splitGapM + minSegment;
  const accepted: typeof cuts = [];
  const curved = cuts.flatMap(cut => {
    const slice = resolveDoorArchCutSlice(rect, cut);
    const edges = doorArchCutEdges(slice.rect, slice.profile).map(curve => ({
      min: Math.min(...curve.map(point => point.y)),
      max: Math.max(...curve.map(point => point.y)),
      curve,
      ellipse: slice.profile.shape === 'ellipse' ? cut : null,
    }));
    const low = edges[0]!.min;
    const high = edges.at(-1)!.max;
    const outerMargin = HINGED_DOOR_SPLIT_GEOMETRY_POLICY.archOuterClearanceM - 1e-8;
    if (low < rect.minY + outerMargin || high > rect.maxY - outerMargin) return [];
    if (straight.some(y => y > low - clearance && y < high + clearance)) return [];
    if (!accepted.every(other => doorArchCutsAreSeparate(rect, cut, other, clearance))) return [];
    accepted.push(cut);
    return edges;
  });
  if (!curved.length) return false;
  const boundaries = [...straight.map(y => ({ min: y, max: y, curve: null, ellipse: null })), ...curved].sort(
    (a, b) => a.min - b.min
  );
  const count = boundaries.length + 1;
  const fullCurtain = ctx.resolveCurtainForPart(state.sourceKey, null);
  const fullGroove = ctx.grooveValSafe(state.currentDoorId, 'full', false);
  const defaultHandle = computeDefaultHandleAbsY(ctx, state.currentDoorId);
  const halfClearance = HINGED_DOOR_RENDER_POLICY.visualHeightClearanceM / 2;
  const splitHalfGap = HINGED_DOOR_SPLIT_GEOMETRY_POLICY.splitGapM / 2;
  for (let index = 0; index < count; index++) {
    const lower = boundaries[index - 1];
    const upper = boundaries[index];
    const partId = partIdForSegment(state, count, index);
    const bottom = lower ? lower.min + (lower.curve ? gap : splitHalfGap) : rect.minY;
    const top = upper ? upper.max - (upper.curve ? gap : splitHalfGap) : rect.maxY;
    const segY = (bottom + top) / 2;
    const safeHandleBottom = lower?.curve ? lower.max + gap : bottom;
    const safeHandleTop = upper?.curve ? upper.min - gap : top;
    const ellipseInsert = !!(lower?.ellipse && lower.ellipse === upper?.ellipse);
    const lowerEdge = lower?.curve?.map(point => ({ x: point.x, y: point.y - segY + gap }));
    const upperEdge = upper?.curve?.map(point => ({ x: point.x, y: point.y - segY - gap }));
    let contour: DoorArchPoint[] | null = null;
    if (lowerEdge && upperEdge) {
      contour = joinCurvedCutEdges(lowerEdge, upperEdge);
    } else {
      const curve = lowerEdge ?? upperEdge;
      if (curve) {
        const flatY = (lowerEdge ? top - halfClearance : bottom + halfClearance) - segY;
        contour = [{ x: -halfWidth, y: flatY }, ...curve, { x: halfWidth, y: flatY }];
      }
    }
    pushHingedDoorSegment(ctx, state, {
      partId,
      segY,
      segH: top - bottom,
      curtainVal: ctx.resolveCurtainForPart(partId, fullCurtain),
      grooveFlag: grooveForPart(ctx, partId, fullGroove),
      handleAbsY: clampHandleAbsY(ctx, defaultHandle, safeHandleBottom, safeHandleTop, partId),
      allowHandle:
        !ellipseInsert &&
        safeHandleTop - safeHandleBottom > HINGED_DOOR_SPLIT_GEOMETRY_POLICY.renderMinSegmentHeightM,
      ...(ellipseInsert ? { fixedClosed: true } : {}),
      colorVal: ctx.getPartColorValueSafe(partId),
      ...(contour ? { archCut: { contour, baseMinY: rect.minY - segY, baseMaxY: rect.maxY - segY } } : {}),
    });
  }
  return true;
}

function joinCurvedCutEdges(lower: DoorArchPoint[], upper: DoorArchPoint[]): DoorArchPoint[] {
  const bottom: DoorArchPoint[] = [];
  const top: DoorArchPoint[] = [];
  const stations = sampleDoorCutEdgePair(lower, upper);
  for (let index = 0; index < stations.length; index++) {
    const { x, low, high } = stations[index]!;
    const span = high - low;
    const previous = stations[index - 1];
    if (previous) {
      const previousSpan = previous.high - previous.low;
      if (span * previousSpan < 0) {
        const ratio = previousSpan / (previousSpan - span);
        const join = {
          x: previous.x + ratio * (x - previous.x),
          y: previous.low + ratio * (low - previous.low),
        };
        bottom.push(join);
        top.push(join);
      }
    }
    if (span <= 0) continue;
    bottom.push({ x, y: low });
    top.push({ x, y: high });
  }
  return [...bottom, ...top.reverse()];
}
