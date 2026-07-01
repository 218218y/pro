import type {
  CanvasDoorSplitBounds,
  CanvasDoorSplitClickArgs,
} from './canvas_picking_door_split_click_contracts.js';
import { DOOR_SYSTEM_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { getCamera, getDoorsArray } from '../runtime/render_access.js';
import { __wp_toast } from './canvas_picking_core_helpers.js';
import { requestDoorAuthoringBurstRefresh } from './canvas_picking_door_authoring_burst.js';
import { resolveCanvasDoorSplitPointerWorldY } from './canvas_picking_door_split_pointer_y.js';
import {
  resolveCanvasDoorCustomSplitRemoveTarget,
  resolveCanvasDoorCustomSplitRemoveTolerance,
  resolveCanvasDoorCustomSplitScreenRemoveCandidate,
} from './canvas_picking_door_split_remove_target.js';
import {
  callCanvasDoorSplitAction,
  callCanvasDoorSplitBottomAction,
  createCanvasDoorSplitKeyState,
  readCanvasDoorSplitBounds,
  readCanvasDoorSplitPosList,
  resolveCanvasDoorSplitBaseKey,
  runCanvasDoorSplitHistoryBatch,
  writeCanvasDoorSplitPosList,
} from './canvas_picking_door_split_click_shared.js';

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export const CANVAS_DOOR_CUSTOM_SPLIT_BLOCK_MESSAGE =
  'אי אפשר לחתוך דלת במרחק קטן מדי מחיתוך קיים או מקצה הדלת.';

function readCanvasDoorCustomSplitPolicy(bounds: CanvasDoorSplitBounds): {
  height: number;
  padAbs: number;
  minSegmentHeight: number;
  duplicateTolerance: number;
} {
  const height = Number(bounds.maxY) - Number(bounds.minY);
  const splitDims = DOOR_SYSTEM_DIMENSIONS.hinged.split;
  return {
    height,
    padAbs: splitDims.topClampOffsetM,
    minSegmentHeight: splitDims.minSegmentHeightM,
    duplicateTolerance: Math.max(
      splitDims.duplicateCutToleranceMinM,
      Math.min(splitDims.duplicateCutToleranceMaxM, height * splitDims.duplicateCutToleranceHeightRatio)
    ),
  };
}

function sanitizeCanvasDoorSplitCuts(bounds: CanvasDoorSplitBounds, normsIn: number[]): number[] {
  const { minY, maxY } = bounds;
  const { height: H, padAbs, minSegmentHeight, duplicateTolerance } = readCanvasDoorCustomSplitPolicy(bounds);
  const norms: number[] = [];
  try {
    if (!Number.isFinite(H) || !(H > 0)) return norms;
    const topEdge = maxY;
    const abs: number[] = [];
    for (let i = 0; i < normsIn.length; i++) {
      const n0 = normsIn[i];
      if (!Number.isFinite(n0)) continue;
      const n = clampNumber(n0, 0, 1);
      const y0 = clampNumber(minY + n * H, minY + padAbs, topEdge - padAbs);
      abs.push(y0);
    }
    abs.sort((a, b) => a - b);

    const keptAbs: number[] = [];
    let prevB = minY;
    for (let i = 0; i < abs.length; i++) {
      const y = abs[i];
      if (y - prevB < minSegmentHeight) continue;
      if (topEdge - y < minSegmentHeight) continue;
      const prevKept = keptAbs.length ? keptAbs[keptAbs.length - 1] : NaN;
      if (Number.isFinite(prevKept) && Math.abs(prevKept - y) <= duplicateTolerance) continue;
      keptAbs.push(y);
      prevB = y;
    }

    for (let i = 0; i < keptAbs.length; i++) {
      norms.push(clampNumber((keptAbs[i] - minY) / H, 0, 1));
    }
  } catch {
    // ignore
  }
  return norms;
}

export type CanvasDoorCustomSplitAddValidation = {
  canAdd: boolean;
  yAbs: number;
  yNorm: number;
  reason: 'ok' | 'invalid-bounds' | 'too-close-to-edge' | 'too-close-to-existing';
  nearestDistanceAbs: number | null;
};

export function validateCanvasDoorCustomSplitAdd(args: {
  bounds: CanvasDoorSplitBounds;
  prevList: number[];
  pointerY: number;
}): CanvasDoorCustomSplitAddValidation {
  const { bounds, prevList, pointerY } = args;
  const minY = Number(bounds.minY);
  const maxY = Number(bounds.maxY);
  const { height: H, padAbs, minSegmentHeight, duplicateTolerance } = readCanvasDoorCustomSplitPolicy(bounds);
  const rawY = Number(pointerY);
  const defaultY = Number.isFinite(rawY) ? rawY : minY;
  const invalidResult: CanvasDoorCustomSplitAddValidation = {
    canAdd: false,
    yAbs: defaultY,
    yNorm: 0,
    reason: 'invalid-bounds',
    nearestDistanceAbs: null,
  };

  if (!Number.isFinite(minY) || !Number.isFinite(maxY) || !Number.isFinite(H) || !(H > 0.05)) {
    return invalidResult;
  }
  if (!Number.isFinite(rawY)) return invalidResult;

  const yAbs = clampNumber(rawY, minY, maxY);
  const yNorm = clampNumber((yAbs - minY) / H, 0, 1);
  const edgeBlockDistance = Math.max(padAbs, minSegmentHeight);
  const blockDistance = Math.max(minSegmentHeight, duplicateTolerance);

  if (rawY - minY < edgeBlockDistance || maxY - rawY < edgeBlockDistance) {
    return { canAdd: false, yAbs, yNorm, reason: 'too-close-to-edge', nearestDistanceAbs: null };
  }

  let nearestDistanceAbs: number | null = null;
  const sanitizedPrev = sanitizeCanvasDoorSplitCuts(bounds, Array.isArray(prevList) ? prevList : []);
  for (let i = 0; i < sanitizedPrev.length; i++) {
    const n = sanitizedPrev[i];
    if (!Number.isFinite(n)) continue;
    const cutY = clampNumber(minY + clampNumber(n, 0, 1) * H, minY + padAbs, maxY - padAbs);
    const distance = Math.abs(cutY - rawY);
    nearestDistanceAbs = nearestDistanceAbs == null ? distance : Math.min(nearestDistanceAbs, distance);
    if (distance < blockDistance) {
      return { canAdd: false, yAbs, yNorm, reason: 'too-close-to-existing', nearestDistanceAbs: distance };
    }
  }

  return {
    canAdd: true,
    yAbs: rawY,
    yNorm: clampNumber((rawY - minY) / H, 0, 1),
    reason: 'ok',
    nearestDistanceAbs,
  };
}

function commitCanvasDoorCustomSplitList(args: {
  App: CanvasDoorSplitClickArgs['App'];
  doorBaseKey: string;
  nextListRaw: number[];
  bounds: CanvasDoorSplitBounds;
}): void {
  const { App, doorBaseKey, nextListRaw, bounds } = args;
  const nextList = sanitizeCanvasDoorSplitCuts(bounds, nextListRaw);
  const hasAnyCuts = nextList.length > 0;
  const { splitKey, splitBottomKey } = createCanvasDoorSplitKeyState(doorBaseKey);

  runCanvasDoorSplitHistoryBatch(App, 'splitDoors:custom', () => {
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
      doorBaseKey,
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
}

function readCanvasDoorCustomSplitScreenRoots(App: CanvasDoorSplitClickArgs['App']): unknown[] {
  const doorsArray = getDoorsArray(App);
  const roots: unknown[] = [];
  for (let i = 0; i < doorsArray.length; i++) {
    const entry = doorsArray[i] as { group?: unknown } | null | undefined;
    if (entry?.group) roots.push(entry.group);
  }
  return roots;
}

export function tryHandleCanvasDoorCustomSplitScreenRemoveClick(args: {
  App: CanvasDoorSplitClickArgs['App'];
  ndcX?: number | null;
  ndcY?: number | null;
  camera?: unknown;
}): boolean {
  const { App, ndcX, ndcY } = args;
  const candidate = resolveCanvasDoorCustomSplitScreenRemoveCandidate({
    App,
    roots: readCanvasDoorCustomSplitScreenRoots(App),
    ndcX,
    ndcY,
    camera: args.camera || getCamera(App),
    readBounds: readCanvasDoorSplitBounds,
    readPosList: readCanvasDoorSplitPosList,
    normalizeDoorBaseKey: (app, _hitDoorGroup, hitDoorPid) => resolveCanvasDoorSplitBaseKey(app, hitDoorPid),
  });
  if (!candidate) return false;

  const prevList = sanitizeCanvasDoorSplitCuts(
    candidate.bounds,
    readCanvasDoorSplitPosList(App, candidate.doorBaseKey)
  );
  const nextListRaw = prevList.filter((_n, idx) => idx !== candidate.target.index);
  commitCanvasDoorCustomSplitList({
    App,
    doorBaseKey: candidate.doorBaseKey,
    nextListRaw,
    bounds: candidate.bounds,
  });
  return true;
}

export function handleCanvasDoorCustomSplitClick(args: {
  click: CanvasDoorSplitClickArgs;
  doorBaseKey: string;
  bounds: CanvasDoorSplitBounds | null;
}): boolean {
  const { click, doorBaseKey, bounds } = args;
  const { App, doorHitY, ndcX, ndcY } = click;
  const hitY = resolveCanvasDoorSplitPointerWorldY({
    App,
    raycaster: click.raycaster,
    mouse: click.mouse,
    camera: click.camera,
    ndcX,
    ndcY,
    hitDoorGroup: click.doorHitGroup,
    referenceY: doorHitY,
  });
  if (!bounds || typeof hitY !== 'number') return true;

  const minY = Number(bounds.minY);
  const maxY = Number(bounds.maxY);
  const H = maxY - minY;
  if (!Number.isFinite(H) || !(H > 0.05)) return true;

  const prevList0 = sanitizeCanvasDoorSplitCuts(bounds, readCanvasDoorSplitPosList(App, doorBaseKey));
  const removeTarget = resolveCanvasDoorCustomSplitRemoveTarget({
    App,
    bounds,
    prevList: prevList0,
    pointerY: hitY,
    ndcX,
    ndcY,
    camera: click.camera,
    hitDoorGroup: click.doorHitGroup,
    toleranceAbs: resolveCanvasDoorCustomSplitRemoveTolerance(bounds),
  });

  let nextListRaw: number[];
  if (removeTarget) {
    nextListRaw = prevList0.filter((_n, idx) => idx !== removeTarget.index);
  } else {
    const addValidation = validateCanvasDoorCustomSplitAdd({ bounds, prevList: prevList0, pointerY: hitY });
    if (!addValidation.canAdd) {
      __wp_toast(App, CANVAS_DOOR_CUSTOM_SPLIT_BLOCK_MESSAGE, 'error');
      return true;
    }
    nextListRaw = prevList0.concat([addValidation.yNorm]);
  }
  commitCanvasDoorCustomSplitList({ App, doorBaseKey, nextListRaw, bounds });
  return true;
}
