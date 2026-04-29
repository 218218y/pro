import { getDoorsArray } from '../runtime/render_access.js';
import {
  writeMapKey,
  readSplitPosListFromMap,
  splitBottomKey as __splitBottomKey,
  splitKey as __splitKey,
  splitPosKey as __splitPosKey,
} from '../runtime/maps_access.js';
import { callDoorsAction, hasDoorsAction } from '../runtime/actions_access_domains.js';
import type { AppContainer, ActionMetaLike } from '../../../types';
import type { CanvasDoorSplitBounds } from './canvas_picking_door_split_click_contracts.js';
import {
  __wp_reportPickingIssue,
  __wp_historyBatch,
  __wp_str,
  __wp_map,
  __wp_isSplitBottom,
  __wp_isSplit,
  __wp_isSplitExplicit,
  __wp_getSplitHoverDoorBaseKey,
} from './canvas_picking_core_helpers.js';

export function resolveCanvasDoorSplitBaseKey(App: AppContainer, effectiveDoorId: string): string {
  const doorIdStr = __wp_str(App, effectiveDoorId);
  try {
    const splitMapKey = __splitKey(doorIdStr);
    const splitBase = splitMapKey.startsWith('split_') ? splitMapKey.slice('split_'.length) : doorIdStr;
    return __wp_getSplitHoverDoorBaseKey(splitBase) || splitBase || doorIdStr;
  } catch (err) {
    __wp_reportPickingIssue(App, err, {
      where: 'canvasPicking',
      op: 'splitDoors.normalizeDoorBaseKey',
      throttleMs: 1000,
    });
  }
  return doorIdStr;
}

export function readCanvasDoorSplitBounds(
  App: AppContainer,
  doorBaseKey: string
): CanvasDoorSplitBounds | null {
  try {
    const base = String(doorBaseKey || '');
    if (!base) return null;
    let minY = Infinity;
    let maxY = -Infinity;
    const doorsArray = getDoorsArray(App);
    for (let i = 0; i < doorsArray.length; i++) {
      const g = doorsArray[i] && doorsArray[i].group;
      if (!g) continue;
      const pid = g.userData ? String(g.userData.partId || '') : '';
      if (!pid) continue;
      if (pid === base || pid === `${base}_full` || pid.startsWith(base + '_')) {
        const h = g.userData && typeof g.userData.__doorHeight === 'number' ? g.userData.__doorHeight : null;
        if (typeof h !== 'number' || !isFinite(h)) continue;
        const y0 = typeof g.position.y === 'number' ? g.position.y : 0;
        const lo = y0 - h / 2;
        const hi = y0 + h / 2;
        if (lo < minY) minY = lo;
        if (hi > maxY) maxY = hi;
      }
    }
    if (!isFinite(minY) || !isFinite(maxY) || maxY - minY < 0.05) return null;
    return { minY, maxY };
  } catch (err) {
    __wp_reportPickingIssue(App, err, {
      where: 'canvasPicking',
      op: 'splitDoors.bounds',
      throttleMs: 1000,
    });
    return null;
  }
}

export function createCanvasDoorSplitKeyState(doorBaseKey: string): {
  splitKey: string;
  splitBottomKey: string;
  splitPosKey: string;
} {
  return {
    splitKey: __splitKey(doorBaseKey),
    splitBottomKey: __splitBottomKey(doorBaseKey),
    splitPosKey: __splitPosKey(doorBaseKey),
  };
}

export function readCanvasDoorSplitPosList(App: AppContainer, doorBaseKey: string): number[] {
  return readSplitPosListFromMap(__wp_map(App, 'splitDoorsMap'), doorBaseKey);
}

export function callCanvasDoorSplitAction(args: {
  App: AppContainer;
  key: string;
  next: boolean;
  source: string;
  op: string;
}): void {
  const { App, key, next, source, op } = args;
  if (hasDoorsAction(App, 'setSplit')) {
    callDoorsAction(App, 'setSplit', key, next, { immediate: true, source });
    return;
  }
  const err = new Error('[WardrobePro] Missing doors.setSplit action (domain API not loaded)');
  __wp_reportPickingIssue(App, err, { where: 'canvasPicking', op }, { failFast: true });
}

export function callCanvasDoorSplitBottomAction(args: {
  App: AppContainer;
  key: string;
  next: boolean;
  source: string;
  op: string;
}): void {
  const { App, key, next, source, op } = args;
  if (hasDoorsAction(App, 'setSplitBottom')) {
    callDoorsAction(App, 'setSplitBottom', key, next, { immediate: true, source });
    return;
  }
  const err = new Error('[WardrobePro] Missing doors.setSplitBottom action (domain API not loaded)');
  __wp_reportPickingIssue(App, err, { where: 'canvasPicking', op }, { failFast: true });
}

export function writeCanvasDoorSplitPosList(args: {
  App: AppContainer;
  splitPosKey: string;
  nextList: number[];
  source: string;
}): void {
  const { App, splitPosKey, nextList, source } = args;
  try {
    const stored: number[] | null = nextList.length > 0 ? nextList : null;
    writeMapKey(App, 'splitDoorsMap', splitPosKey, stored, {
      immediate: true,
      source,
    });
  } catch (error) {
    __wp_reportPickingIssue(App, error, { where: 'canvasPicking', op: 'split.custom.writeSplitPos' });
  }
}

export function runCanvasDoorSplitHistoryBatch(
  App: AppContainer,
  meta: ActionMetaLike,
  fn: () => unknown
): unknown {
  return __wp_historyBatch(App, meta, fn);
}

export function isCanvasDoorSplitBottomEnabled(App: AppContainer, doorBaseKey: string): boolean {
  return __wp_isSplitBottom(App, doorBaseKey);
}

export function isCanvasDoorSplitEnabled(App: AppContainer, doorBaseKey: string): boolean {
  return __wp_isSplit(App, doorBaseKey);
}

export function isCanvasDoorSplitExplicit(App: AppContainer, doorBaseKey: string): boolean {
  return __wp_isSplitExplicit(App, doorBaseKey);
}
