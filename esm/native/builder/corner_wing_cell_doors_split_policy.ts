// Corner wing split-door cut policy.
//
// Own split-cut normalization and canonical segment naming so segment emitters can
// stay focused on geometry/rendering.

import type { CornerWingDoorContext, CornerWingDoorState } from './corner_wing_cell_doors_contracts.js';

export function readCustomSplitCutsY(ctx: CornerWingDoorContext, state: CornerWingDoorState): number[] {
  try {
    const norms = ctx.readSplitPosListFromMap(
      ctx.splitMap0,
      ctx.stackKey === 'bottom' ? state.scopedDoorBaseId : state.doorBaseId
    );
    if (!norms.length) return [];

    const topEdge = state.effectiveTopLimit - 0.002;
    const height = topEdge - state.doorBottomY;
    if (!(height > 0.2)) return [];

    const padAbs = 0.12;
    const minSegH = 0.12;
    const abs: number[] = [];
    for (let i = 0; i < norms.length; i++) {
      const rawNorm = norms[i];
      if (!Number.isFinite(rawNorm)) continue;
      const n = Math.max(0, Math.min(1, rawNorm));
      let y = state.doorBottomY + n * height;
      y = Math.max(state.doorBottomY + padAbs, Math.min(topEdge - padAbs, y));
      abs.push(y);
    }
    abs.sort((a, b) => a - b);

    return dedupeCuts(state, keepValidCuts(state, abs, minSegH), height);
  } catch {
    return [];
  }
}

export function mergeSplitCuts(
  _ctx: CornerWingDoorContext,
  state: CornerWingDoorState,
  cuts: number[]
): number[] {
  const topEdge = state.effectiveTopLimit - 0.002;
  const height = topEdge - state.doorBottomY;
  const minSegH = 0.12;
  const xs = cuts.slice().filter(value => Number.isFinite(value));
  xs.sort((a, b) => a - b);
  return dedupeCuts(state, keepValidCuts(state, xs, minSegH), height);
}

export function partIdForSegment(
  state: CornerWingDoorState,
  segCount: number,
  segIndexFromBottom: number
): string {
  if (segCount === 2) return segIndexFromBottom === 0 ? `${state.doorBaseId}_bot` : `${state.doorBaseId}_top`;
  if (segCount === 3) {
    if (segIndexFromBottom === 0) return `${state.doorBaseId}_bot`;
    if (segIndexFromBottom === 1) return `${state.doorBaseId}_mid`;
    return `${state.doorBaseId}_top`;
  }
  if (segIndexFromBottom === 0) return `${state.doorBaseId}_bot`;
  if (segIndexFromBottom === segCount - 1) return `${state.doorBaseId}_top`;
  return `${state.doorBaseId}_mid${segIndexFromBottom}`;
}

function keepValidCuts(state: CornerWingDoorState, cuts: number[], minSegH: number): number[] {
  const topEdge = state.effectiveTopLimit - 0.002;
  const kept: number[] = [];
  let prevBottom = state.doorBottomY;
  for (let i = 0; i < cuts.length; i++) {
    const y = cuts[i];
    if (y - prevBottom < minSegH) continue;
    if (topEdge - y < minSegH) continue;
    kept.push(y);
    prevBottom = y;
  }
  return kept;
}

function dedupeCuts(state: CornerWingDoorState, cuts: number[], height: number): number[] {
  const out: number[] = [];
  const tolerance = Math.max(0.004, Math.min(0.02, height * 0.01));
  for (let i = 0; i < cuts.length; i++) {
    const y = cuts[i];
    const prev = out.length ? out[out.length - 1] : NaN;
    if (Number.isFinite(prev) && Math.abs(prev - y) <= tolerance) continue;
    out.push(y);
  }
  return out;
}
