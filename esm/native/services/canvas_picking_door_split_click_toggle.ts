import type {
  CanvasDoorSplitBounds,
  CanvasDoorSplitClickArgs,
} from './canvas_picking_door_split_click_contracts.js';
import { DOOR_SYSTEM_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { __wp_getRegularSplitPreviewLineY } from './canvas_picking_core_helpers.js';
import { requestDoorAuthoringBurstRefresh } from './canvas_picking_door_authoring_burst.js';
import { resolveCanvasDoorSplitPointerWorldY } from './canvas_picking_door_split_pointer_y.js';
import {
  callCanvasDoorSplitAction,
  callCanvasDoorSplitBottomAction,
  createCanvasDoorSplitKeyState,
  isCanvasDoorSplitBottomEnabled,
  isCanvasDoorSplitEnabled,
  isCanvasDoorSplitExplicit,
  readCanvasDoorSplitPosList,
  runCanvasDoorSplitHistoryBatch,
  writeCanvasDoorSplitPosList,
} from './canvas_picking_door_split_click_shared.js';

function isCanvasDoorSplitBottomClick(bounds: CanvasDoorSplitBounds | null, hitY: number | null): boolean {
  return !!(bounds && typeof hitY === 'number' && hitY <= bounds.minY + (bounds.maxY - bounds.minY) / 3);
}

function isSketchBoxDoorSplitBaseKey(doorBaseKey: string): boolean {
  return /^sketch_box(?:_free)?_.+_door(?:_|$)/i.test(String(doorBaseKey || ''));
}

function clampCanvasDoorSplitNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resolveSketchBoxStandardSplitLineNorm(args: {
  click: CanvasDoorSplitClickArgs;
  bounds: CanvasDoorSplitBounds;
  isBottomRegion: boolean;
}): number | null {
  const { click, bounds, isBottomRegion } = args;
  const minY = Number(bounds.minY);
  const maxY = Number(bounds.maxY);
  const height = maxY - minY;
  if (!Number.isFinite(minY) || !Number.isFinite(maxY) || !(height > 0.05)) return null;

  let lineY: number | null = null;
  try {
    if (click.doorHitGroup) {
      lineY = __wp_getRegularSplitPreviewLineY({
        App: click.App,
        hitDoorGroup: click.doorHitGroup as never,
        bounds,
        isBottomRegion,
      });
    }
  } catch {
    lineY = null;
  }

  if (!Number.isFinite(Number(lineY))) {
    if (isBottomRegion) {
      lineY = minY + Math.min(height / 3, DOOR_SYSTEM_DIMENSIONS.hinged.split.storageLiftM);
    } else {
      lineY = minY + (4 * height) / 6;
    }
  }

  const padBottom = DOOR_SYSTEM_DIMENSIONS.hinged.split.bottomClampOffsetM;
  const padTop = DOOR_SYSTEM_DIMENSIONS.hinged.split.topClampOffsetM;
  const clampedY = clampCanvasDoorSplitNumber(Number(lineY), minY + padBottom, maxY - padTop);
  if (!Number.isFinite(clampedY)) return null;
  return clampCanvasDoorSplitNumber((clampedY - minY) / height, 0, 1);
}

function readSketchBoxStandardSplitToleranceNorm(bounds: CanvasDoorSplitBounds): number {
  const minY = Number(bounds.minY);
  const maxY = Number(bounds.maxY);
  const height = maxY - minY;
  if (!Number.isFinite(height) || height <= 0) return 0.02;
  return Math.max(
    DOOR_SYSTEM_DIMENSIONS.hinged.split.duplicateCutToleranceMinM / height,
    Math.min(
      DOOR_SYSTEM_DIMENSIONS.hinged.split.duplicateCutToleranceMaxM / height,
      DOOR_SYSTEM_DIMENSIONS.hinged.split.duplicateCutToleranceHeightRatio
    )
  );
}

function hasSketchBoxStandardSplitSlot(args: {
  prev: readonly number[];
  norm: number | null;
  tolNorm: number;
}): boolean {
  const { prev, norm, tolNorm } = args;
  if (!Number.isFinite(Number(norm))) return false;
  const target = clampCanvasDoorSplitNumber(Number(norm), 0, 1);
  for (let i = 0; i < prev.length; i += 1) {
    const n = Number(prev[i]);
    if (!Number.isFinite(n)) continue;
    if (Math.abs(clampCanvasDoorSplitNumber(n, 0, 1) - target) <= tolNorm) return true;
  }
  return false;
}

function pushUniqueSketchBoxStandardSplitNorm(args: {
  list: number[];
  norm: number | null;
  tolNorm: number;
}): void {
  const { list, norm, tolNorm } = args;
  if (!Number.isFinite(Number(norm))) return;
  const value = clampCanvasDoorSplitNumber(Number(norm), 0, 1);
  for (let i = 0; i < list.length; i += 1) {
    if (Math.abs(list[i] - value) <= tolNorm) return;
  }
  list.push(value);
}

function resolveSketchBoxStandardSplitToggle(args: {
  App: CanvasDoorSplitClickArgs['App'];
  doorBaseKey: string;
  bounds: CanvasDoorSplitBounds;
  topNorm: number | null;
  bottomNorm: number | null;
  isBottomRegion: boolean;
}): { nextList: number[]; changedToSplit: boolean; nextBottomSplit: boolean } {
  const { App, doorBaseKey, bounds, topNorm, bottomNorm, isBottomRegion } = args;
  const prev = readCanvasDoorSplitPosList(App, doorBaseKey);
  const tolNorm = readSketchBoxStandardSplitToleranceNorm(bounds);

  let topActive = hasSketchBoxStandardSplitSlot({ prev, norm: topNorm, tolNorm });
  let bottomActive =
    isCanvasDoorSplitBottomEnabled(App, doorBaseKey) ||
    hasSketchBoxStandardSplitSlot({ prev, norm: bottomNorm, tolNorm });

  if (isBottomRegion) bottomActive = !bottomActive;
  else topActive = !topActive;

  const nextList: number[] = [];
  if (bottomActive) pushUniqueSketchBoxStandardSplitNorm({ list: nextList, norm: bottomNorm, tolNorm });
  if (topActive) pushUniqueSketchBoxStandardSplitNorm({ list: nextList, norm: topNorm, tolNorm });
  nextList.sort((a, b) => a - b);

  return {
    nextList,
    changedToSplit: nextList.length > 0,
    nextBottomSplit:
      bottomActive && hasSketchBoxStandardSplitSlot({ prev: nextList, norm: bottomNorm, tolNorm }),
  };
}

function handleSketchBoxStandardSplitClick(args: {
  click: CanvasDoorSplitClickArgs;
  doorBaseKey: string;
  bounds: CanvasDoorSplitBounds | null;
  hitY: number | null;
}): boolean {
  const { click, doorBaseKey, bounds, hitY } = args;
  if (!isSketchBoxDoorSplitBaseKey(doorBaseKey)) return false;
  if (!bounds) return true;

  const isBottomRegion = isCanvasDoorSplitBottomClick(bounds, hitY);
  const topNorm = resolveSketchBoxStandardSplitLineNorm({ click, bounds, isBottomRegion: false });
  const bottomNorm = resolveSketchBoxStandardSplitLineNorm({ click, bounds, isBottomRegion: true });
  const clickedNorm = isBottomRegion ? bottomNorm : topNorm;
  if (!Number.isFinite(Number(clickedNorm))) return true;
  const { splitKey, splitBottomKey, splitPosKey } = createCanvasDoorSplitKeyState(doorBaseKey);
  const { nextList, changedToSplit, nextBottomSplit } = resolveSketchBoxStandardSplitToggle({
    App: click.App,
    doorBaseKey,
    bounds,
    topNorm,
    bottomNorm,
    isBottomRegion,
  });

  runCanvasDoorSplitHistoryBatch(
    click.App,
    {
      source: isBottomRegion ? 'splitDoorsBottom:click:sketchBox' : 'splitDoors:click:sketchBox',
      immediate: true,
    },
    () => {
      callCanvasDoorSplitBottomAction({
        App: click.App,
        key: splitBottomKey,
        next: nextBottomSplit,
        source: 'splitDoors:click:sketchBox',
        op: 'splitBottom.sketchBoxStandard.missingDomainApi',
      });
      callCanvasDoorSplitAction({
        App: click.App,
        key: splitKey,
        next: changedToSplit,
        source: 'splitDoors:click:sketchBox',
        op: 'split.sketchBoxStandard.missingDomainApi',
      });
      writeCanvasDoorSplitPosList({
        App: click.App,
        splitPosKey,
        nextList,
        source: 'splitDoors:click:sketchBox',
      });
      return undefined;
    }
  );
  try {
    requestDoorAuthoringBurstRefresh(click.App, 'splitDoors:click:sketchBox');
  } catch {
    // ignore
  }
  return true;
}

export function handleCanvasDoorToggleSplitClick(args: {
  click: CanvasDoorSplitClickArgs;
  doorBaseKey: string;
  bounds: CanvasDoorSplitBounds | null;
}): boolean {
  const { click, doorBaseKey, bounds } = args;
  const { App, foundModuleStack, doorHitY } = click;
  const { splitKey, splitBottomKey } = createCanvasDoorSplitKeyState(doorBaseKey);

  const splitHitY = resolveCanvasDoorSplitPointerWorldY({
    App,
    raycaster: click.raycaster,
    mouse: click.mouse,
    camera: click.camera,
    ndcX: click.ndcX,
    ndcY: click.ndcY,
    hitDoorGroup: click.doorHitGroup,
    referenceY: doorHitY,
  });

  if (handleSketchBoxStandardSplitClick({ click, doorBaseKey, bounds, hitY: splitHitY })) return true;

  if (isCanvasDoorSplitBottomClick(bounds, splitHitY)) {
    const next = !isCanvasDoorSplitBottomEnabled(App, doorBaseKey);
    runCanvasDoorSplitHistoryBatch(App, { source: 'splitDoorsBottom:click', immediate: true }, () => {
      callCanvasDoorSplitBottomAction({
        App,
        key: splitBottomKey,
        next,
        source: 'splitDoorsBottom:click',
        op: 'splitBottom.missingDomainApi',
      });
      return undefined;
    });
    return true;
  }

  const isCurrentlySplit =
    foundModuleStack === 'bottom'
      ? isCanvasDoorSplitExplicit(App, doorBaseKey)
      : isCanvasDoorSplitEnabled(App, doorBaseKey);
  const nextSplit = !isCurrentlySplit;

  runCanvasDoorSplitHistoryBatch(App, { source: 'splitDoors:click', immediate: true }, () => {
    callCanvasDoorSplitAction({
      App,
      key: splitKey,
      next: nextSplit,
      source: 'splitDoors:click',
      op: 'split.missingDomainApi',
    });
    return undefined;
  });
  return true;
}
