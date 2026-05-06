import { CORNER_WING_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type {
  CornerConnectorDoorContext,
  CornerConnectorDoorState,
} from './corner_connector_door_emit_contracts.js';
import {
  resolveCornerConnectorDefaultHandleAbsY,
  resolveCornerConnectorDoorSplitPolicy,
} from './corner_connector_door_emit_policy.js';
import { pushCornerConnectorDoorSegmentVisual } from './corner_connector_door_emit_visuals.js';

export function createCornerConnectorDoorStateInternal(
  ctx: CornerConnectorDoorContext,
  doorIndex: 1 | 2
): CornerConnectorDoorState {
  const doorBaseId = `corner_pent_door_${doorIndex}`;
  const scopedDoorBaseId = ctx.stackKey === 'bottom' ? ctx.stackScopePartKey(doorBaseId) : doorBaseId;
  const splitPolicy = resolveCornerConnectorDoorSplitPolicy(ctx, doorBaseId);

  return {
    doorIndex,
    doorBaseId,
    scopedDoorBaseId,
    hingeSide: doorIndex === 1 ? 'left' : 'right',
    pivotX: doorIndex === 1 ? -ctx.len / 2 : ctx.len / 2,
    meshOffset: doorIndex === 1 ? ctx.doorW / 2 : -ctx.doorW / 2,
    topSplitEnabled: splitPolicy.topSplitEnabled,
    bottomSplitEnabled: splitPolicy.bottomSplitEnabled,
    shouldSplit: splitPolicy.shouldSplit,
    defaultHandleAbsY: resolveCornerConnectorDefaultHandleAbsY(ctx, doorBaseId),
  };
}

export function readCornerConnectorCustomSplitCutsYInternal(
  ctx: CornerConnectorDoorContext,
  state: CornerConnectorDoorState
): number[] {
  try {
    const partKey = ctx.stackKey === 'bottom' ? state.scopedDoorBaseId : state.doorBaseId;
    const vals = ctx.readSplitPosListFromMap(ctx.splitMap0, partKey);
    if (!Array.isArray(vals) || !vals.length) return [];
    const topEdge = ctx.effectiveTopLimit - CORNER_WING_DIMENSIONS.connector.doorTopClearanceM;
    const out: number[] = [];
    const tol = Math.max(
      CORNER_WING_DIMENSIONS.connector.splitCutToleranceMinM,
      Math.min(
        CORNER_WING_DIMENSIONS.connector.splitCutToleranceMaxM,
        (topEdge - ctx.doorBottomY) * CORNER_WING_DIMENSIONS.connector.splitCutToleranceRatio
      )
    );
    for (let i = 0; i < vals.length; i++) {
      const raw = Number(vals[i]);
      if (!Number.isFinite(raw)) continue;
      const y = Math.max(
        ctx.doorBottomY + CORNER_WING_DIMENSIONS.connector.splitCutMinGapM,
        Math.min(topEdge - CORNER_WING_DIMENSIONS.connector.splitCutMinGapM, raw)
      );
      const prev = out.length ? out[out.length - 1] : NaN;
      if (Number.isFinite(prev) && Math.abs(prev - y) <= tol) continue;
      out.push(y);
    }
    return out;
  } catch {
    return [];
  }
}

export function mergeCornerConnectorSplitCutsInternal(
  ctx: CornerConnectorDoorContext,
  cutsMerged0: number[]
): number[] {
  const topEdge = ctx.effectiveTopLimit - CORNER_WING_DIMENSIONS.connector.doorTopClearanceM;
  const H = topEdge - ctx.doorBottomY;
  const minSegH = CORNER_WING_DIMENSIONS.connector.minSegmentHeightM;
  const xs = cutsMerged0.slice().filter(v => Number.isFinite(v));
  xs.sort((a, b) => a - b);
  const kept: number[] = [];
  let prevB = ctx.doorBottomY;
  for (let i = 0; i < xs.length; i++) {
    const y = xs[i];
    if (y - prevB < minSegH) continue;
    if (topEdge - y < minSegH) continue;
    kept.push(y);
    prevB = y;
  }
  const out: number[] = [];
  const tol = Math.max(
    CORNER_WING_DIMENSIONS.connector.splitCutToleranceMinM,
    Math.min(
      CORNER_WING_DIMENSIONS.connector.splitCutToleranceMaxM,
      H * CORNER_WING_DIMENSIONS.connector.splitCutToleranceRatio
    )
  );
  for (let i = 0; i < kept.length; i++) {
    const y = kept[i];
    const prev = out.length ? out[out.length - 1] : NaN;
    if (Number.isFinite(prev) && Math.abs(prev - y) <= tol) continue;
    out.push(y);
  }
  return out;
}

export function partIdForCornerConnectorSegmentInternal(
  state: CornerConnectorDoorState,
  segCount: number,
  segIndexFromBottom: number
): string {
  const topId = `${state.doorBaseId}_top`;
  const midId = `${state.doorBaseId}_mid`;
  const botId = `${state.doorBaseId}_bot`;
  if (segCount === 2) return segIndexFromBottom === 0 ? botId : topId;
  if (segCount === 3) return segIndexFromBottom === 0 ? botId : segIndexFromBottom === 1 ? midId : topId;
  if (segIndexFromBottom === 0) return botId;
  if (segIndexFromBottom === segCount - 1) return topId;
  return `${state.doorBaseId}_mid${segIndexFromBottom}`;
}

export function clampCornerConnectorHandleAbsYInternal(
  ctx: CornerConnectorDoorContext,
  partId: string,
  absY: number,
  segBottomY: number,
  segTopY: number
): number {
  return ctx.clampHandleAbsYForPart(ctx.cfg0, partId, absY, segBottomY, segTopY);
}

export function pushCornerConnectorDoorSegmentInternal(
  ctx: CornerConnectorDoorContext,
  state: CornerConnectorDoorState,
  partId: string,
  segH: number,
  segY: number,
  handleAbsY: number
): void {
  pushCornerConnectorDoorSegmentVisual(ctx, state, partId, segH, segY, handleAbsY);
}
