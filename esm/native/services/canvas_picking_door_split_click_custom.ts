import type {
  CanvasDoorSplitBounds,
  CanvasDoorSplitClickArgs,
} from './canvas_picking_door_split_click_contracts.js';
import { requestDoorAuthoringBurstRefresh } from './canvas_picking_door_authoring_burst.js';
import {
  callCanvasDoorSplitAction,
  callCanvasDoorSplitBottomAction,
  createCanvasDoorSplitKeyState,
  readCanvasDoorSplitPosList,
  runCanvasDoorSplitHistoryBatch,
  writeCanvasDoorSplitPosList,
} from './canvas_picking_door_split_click_shared.js';

function sanitizeCanvasDoorSplitCuts(bounds: CanvasDoorSplitBounds, normsIn: number[]): number[] {
  const { minY, maxY } = bounds;
  const H = maxY - minY;
  const norms: number[] = [];
  try {
    const padAbs = 0.12;
    const minSegH = 0.12;
    const topEdge = maxY;
    const abs: number[] = [];
    for (let i = 0; i < normsIn.length; i++) {
      const n0 = normsIn[i];
      if (!Number.isFinite(n0)) continue;
      const n = Math.max(0, Math.min(1, n0));
      let y0 = minY + n * H;
      y0 = Math.max(minY + padAbs, Math.min(topEdge - padAbs, y0));
      abs.push(y0);
    }
    abs.sort((a, b) => a - b);

    const keptAbs: number[] = [];
    let prevB = minY;
    for (let i = 0; i < abs.length; i++) {
      const y = abs[i];
      if (y - prevB < minSegH) continue;
      if (topEdge - y < minSegH) continue;
      keptAbs.push(y);
      prevB = y;
    }

    for (let i = 0; i < keptAbs.length; i++) {
      norms.push(Math.max(0, Math.min(1, (keptAbs[i] - minY) / H)));
    }
  } catch {
    // ignore
  }
  return norms;
}

export function handleCanvasDoorCustomSplitClick(args: {
  click: CanvasDoorSplitClickArgs;
  doorBaseKey: string;
  bounds: CanvasDoorSplitBounds | null;
}): boolean {
  const { click, doorBaseKey, bounds } = args;
  const { App, doorHitY } = click;
  const hitY = typeof doorHitY === 'number' ? doorHitY : null;
  if (!bounds || typeof hitY !== 'number') return true;

  const minY = Number(bounds.minY);
  const maxY = Number(bounds.maxY);
  const H = maxY - minY;
  if (!Number.isFinite(H) || !(H > 0.05)) return true;

  const padAbs = 0.12;
  const yAbs = Math.max(minY + padAbs, Math.min(maxY - padAbs, hitY));
  const yNorm = Math.max(0, Math.min(1, (yAbs - minY) / H));

  const { splitKey, splitBottomKey, splitPosKey } = createCanvasDoorSplitKeyState(doorBaseKey);
  const prevList0 = sanitizeCanvasDoorSplitCuts(bounds, readCanvasDoorSplitPosList(App, doorBaseKey));

  const tolAbs = Math.max(0.03, Math.min(0.08, H * 0.06));
  let nearestIdx = -1;
  let nearestDy = Infinity;
  for (let i = 0; i < prevList0.length; i++) {
    const n = prevList0[i];
    const y0 = minY + Math.max(0, Math.min(1, n)) * H;
    const dy = Math.abs(y0 - yAbs);
    if (dy < nearestDy) {
      nearestDy = dy;
      nearestIdx = i;
    }
  }
  const isRemove = nearestIdx >= 0 && nearestDy <= tolAbs;

  const nextListRaw =
    !prevList0.length && isRemove
      ? []
      : isRemove
        ? prevList0.filter((_n, idx) => idx !== nearestIdx)
        : prevList0.concat([yNorm]);
  const nextList = sanitizeCanvasDoorSplitCuts(bounds, nextListRaw);
  const hasAnyCuts = nextList.length > 0;

  runCanvasDoorSplitHistoryBatch(App, { source: 'splitDoors:custom', immediate: true }, () => {
    callCanvasDoorSplitBottomAction({
      App,
      key: splitBottomKey,
      next: false,
      source: 'splitDoors:custom',
      op: 'splitBottom.custom.missingDomainApi',
    });
    callCanvasDoorSplitAction({
      App,
      key: splitKey,
      next: hasAnyCuts,
      source: 'splitDoors:custom',
      op: 'split.custom.missingDomainApi',
    });
    writeCanvasDoorSplitPosList({
      App,
      splitPosKey,
      nextList,
      source: 'splitDoors:custom',
    });
    return undefined;
  });

  try {
    requestDoorAuthoringBurstRefresh(App, 'splitDoors:custom');
  } catch {
    // ignore
  }
  return true;
}
