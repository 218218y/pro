import { HINGED_DOOR_SPLIT_GEOMETRY_POLICY } from '../../shared/dimensions/door_system_policy.js';
import { readSplitPosListSafe } from './hinged_doors_module_ops_shared.js';
import type {
  HingedDoorIterationState,
  HingedDoorModuleOpsContext,
} from './hinged_doors_module_ops_contracts.js';

function normalizeSplitCuts(ctx: HingedDoorModuleOpsContext, values: readonly number[]): number[] {
  const topEdge = ctx.effectiveTopLimit;
  const height = topEdge - ctx.doorBottomY;
  const minSegH = HINGED_DOOR_SPLIT_GEOMETRY_POLICY.minSegmentHeightM;
  const kept: number[] = [];
  let prevBottom = ctx.doorBottomY;

  for (const y of values) {
    if (y - prevBottom < minSegH) continue;
    if (topEdge - y < minSegH) continue;
    kept.push(y);
    prevBottom = y;
  }

  const out: number[] = [];
  const tol = Math.max(
    HINGED_DOOR_SPLIT_GEOMETRY_POLICY.duplicateCutToleranceMinM,
    Math.min(
      HINGED_DOOR_SPLIT_GEOMETRY_POLICY.duplicateCutToleranceMaxM,
      height * HINGED_DOOR_SPLIT_GEOMETRY_POLICY.duplicateCutToleranceHeightRatio
    )
  );
  for (const y of kept) {
    const prev = out.at(-1) ?? NaN;
    if (Number.isFinite(prev) && Math.abs(prev - y) <= tol) continue;
    out.push(y);
  }

  return out;
}

export function computeBottomSplitLineY(
  ctx: HingedDoorModuleOpsContext,
  state: HingedDoorIterationState,
  splitGap: number
): number {
  try {
    let storageLift = HINGED_DOOR_SPLIT_GEOMETRY_POLICY.storageLiftM;
    if (
      ctx.configRecord &&
      (ctx.configRecord.layout === 'storage' || ctx.configRecord.layout === 'storage_shelf')
    ) {
      storageLift = HINGED_DOOR_SPLIT_GEOMETRY_POLICY.storageLiftM;
    }
    if (
      ctx.configRecord.customData &&
      typeof ctx.configRecord.customData === 'object' &&
      'storage' in ctx.configRecord.customData
    ) {
      storageLift = HINGED_DOOR_SPLIT_GEOMETRY_POLICY.storageLiftM;
    }
    let y = ctx.effectiveBottomY + storageLift;
    if (ctx.doorBottomY > ctx.effectiveBottomY) {
      y += ctx.doorBottomY - ctx.effectiveBottomY + splitGap / 2;
    }
    y = Math.max(y, ctx.doorBottomY + HINGED_DOOR_SPLIT_GEOMETRY_POLICY.bottomClampOffsetM);
    y = Math.min(y, ctx.effectiveTopLimit - HINGED_DOOR_SPLIT_GEOMETRY_POLICY.topClampOffsetM);
    return y;
  } catch (error) {
    ctx.reportDoorSoftOnce('computeBottomSplitLineY', error, { doorId: state.currentDoorId });
    return ctx.doorBottomY + HINGED_DOOR_SPLIT_GEOMETRY_POLICY.storageLiftM;
  }
}

export function computeTopSplitLineY(
  ctx: HingedDoorModuleOpsContext,
  state: HingedDoorIterationState
): number {
  try {
    const norms = readSplitPosListSafe(ctx, `d${state.currentDoorId}`);
    const n0 = norms[0] ?? NaN;
    if (!Number.isFinite(n0)) return ctx.splitLineY;
    const topEdge = ctx.effectiveTopLimit;
    const height = topEdge - ctx.doorBottomY;
    if (!(height > HINGED_DOOR_SPLIT_GEOMETRY_POLICY.minHeightForSplitM)) return ctx.splitLineY;
    const padAbs = HINGED_DOOR_SPLIT_GEOMETRY_POLICY.topClampOffsetM;
    const y0 = ctx.doorBottomY + Math.max(0, Math.min(1, n0)) * height;
    return Math.max(ctx.doorBottomY + padAbs, Math.min(topEdge - padAbs, y0));
  } catch {
    return ctx.splitLineY;
  }
}

export function computeCustomSplitCutsY(
  ctx: HingedDoorModuleOpsContext,
  state: HingedDoorIterationState
): number[] {
  try {
    const norms = readSplitPosListSafe(ctx, `d${state.currentDoorId}`);
    if (!norms.length) return [];

    const topEdge = ctx.effectiveTopLimit;
    const height = topEdge - ctx.doorBottomY;
    if (!(height > HINGED_DOOR_SPLIT_GEOMETRY_POLICY.minHeightForSplitM)) return [];

    const padAbs = HINGED_DOOR_SPLIT_GEOMETRY_POLICY.topClampOffsetM;
    const abs: number[] = [];
    for (const raw of norms) {
      if (!Number.isFinite(raw)) continue;
      const normalized = Math.max(0, Math.min(1, raw));
      let y0 = ctx.doorBottomY + normalized * height;
      y0 = Math.max(ctx.doorBottomY + padAbs, Math.min(topEdge - padAbs, y0));
      abs.push(y0);
    }
    abs.sort((a, b) => a - b);
    return normalizeSplitCuts(ctx, abs);
  } catch {
    return [];
  }
}

export function mergeSplitCuts(
  ctx: HingedDoorModuleOpsContext,
  customSplitCutsY: readonly number[],
  bottomLineY: number,
  bottomSplitEnabled: boolean
): number[] {
  const values = customSplitCutsY.slice();
  if (bottomSplitEnabled && Number.isFinite(bottomLineY)) values.push(bottomLineY);
  values.sort((a, b) => a - b);
  return normalizeSplitCuts(ctx, values);
}
