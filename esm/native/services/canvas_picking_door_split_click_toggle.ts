import type {
  CanvasDoorSplitBounds,
  CanvasDoorSplitClickArgs,
} from './canvas_picking_door_split_click_contracts.js';
import { HINGED_DOOR_SPLIT_GEOMETRY_POLICY } from '../../shared/dimensions/door_system_policy.js';
import { __wp_getRegularSplitPreviewLineY } from './canvas_picking_core_helpers.js';
import { resolveCanvasDoorStandardSplitTarget } from './canvas_picking_door_split_standard_target.js';
import { __wp_reportPickingIssue } from './canvas_picking_core_support_errors.js';
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
  readCanvasDoorSplitStandardPosList,
  runCanvasDoorSplitHistoryBatch,
  writeCanvasDoorSplitPosList,
  writeCanvasDoorSplitStandardPosList,
} from './canvas_picking_door_split_click_shared.js';

function isCanvasDoorSplitBottomClick(bounds: CanvasDoorSplitBounds | null, hitY: number | null): boolean {
  return !!(bounds && typeof hitY === 'number' && hitY <= bounds.minY + (bounds.maxY - bounds.minY) / 3);
}

function clampCanvasDoorSplitNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resolveSketchManagedStandardSplitLineNorm(args: {
  click: CanvasDoorSplitClickArgs;
  overallBounds: CanvasDoorSplitBounds;
  lineBounds: CanvasDoorSplitBounds;
  isBottomRegion: boolean;
}): number | null {
  const { click, overallBounds, lineBounds, isBottomRegion } = args;
  const lineMinY = Number(lineBounds.minY);
  const lineMaxY = Number(lineBounds.maxY);
  const lineHeight = lineMaxY - lineMinY;
  const overallMinY = Number(overallBounds.minY);
  const overallMaxY = Number(overallBounds.maxY);
  const overallHeight = overallMaxY - overallMinY;
  if (
    !Number.isFinite(lineMinY) ||
    !Number.isFinite(lineMaxY) ||
    !(lineHeight > 0.05) ||
    !Number.isFinite(overallMinY) ||
    !Number.isFinite(overallMaxY) ||
    !(overallHeight > 0.05)
  )
    return null;

  let lineY: number | null = null;
  try {
    if (click.doorHitGroup) {
      lineY = __wp_getRegularSplitPreviewLineY({
        App: click.App,
        hitDoorGroup: click.doorHitGroup as never,
        bounds: lineBounds,
        isBottomRegion,
      });
    }
  } catch {
    lineY = null;
  }

  if (!Number.isFinite(Number(lineY))) {
    if (isBottomRegion) {
      lineY = lineMinY + Math.min(lineHeight / 3, HINGED_DOOR_SPLIT_GEOMETRY_POLICY.storageLiftM);
    } else {
      lineY = lineMinY + (4 * lineHeight) / 6;
    }
  }

  const padBottom = HINGED_DOOR_SPLIT_GEOMETRY_POLICY.bottomClampOffsetM;
  const padTop = HINGED_DOOR_SPLIT_GEOMETRY_POLICY.topClampOffsetM;
  const clampedY = clampCanvasDoorSplitNumber(Number(lineY), lineMinY + padBottom, lineMaxY - padTop);
  if (!Number.isFinite(clampedY)) return null;
  return clampCanvasDoorSplitNumber((clampedY - overallMinY) / overallHeight, 0, 1);
}

function readSketchManagedStandardSplitToleranceNorm(bounds: CanvasDoorSplitBounds): number {
  const minY = Number(bounds.minY);
  const maxY = Number(bounds.maxY);
  const height = maxY - minY;
  if (!Number.isFinite(height) || height <= 0) return 0.02;
  return Math.max(
    HINGED_DOOR_SPLIT_GEOMETRY_POLICY.duplicateCutToleranceMinM / height,
    Math.min(
      HINGED_DOOR_SPLIT_GEOMETRY_POLICY.duplicateCutToleranceMaxM / height,
      HINGED_DOOR_SPLIT_GEOMETRY_POLICY.duplicateCutToleranceHeightRatio
    )
  );
}

function hasSketchManagedStandardSplitSlot(args: {
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

function pushUniqueSketchManagedStandardSplitNorm(args: {
  list: number[];
  norm: number | null;
  tolNorm: number;
}): void {
  const { list, norm, tolNorm } = args;
  if (!Number.isFinite(Number(norm))) return;
  const value = clampCanvasDoorSplitNumber(Number(norm), 0, 1);
  for (const existing of list) {
    if (Math.abs(existing - value) <= tolNorm) return;
  }
  list.push(value);
}

function resolveSketchManagedStandardSplitToggle(args: {
  App: CanvasDoorSplitClickArgs['App'];
  doorBaseKey: string;
  bounds: CanvasDoorSplitBounds;
  topNorm: number | null;
  bottomNorm: number | null;
  isBottomRegion: boolean;
}): { nextList: number[]; changedToSplit: boolean; nextBottomSplit: boolean } {
  const { App, doorBaseKey, bounds, topNorm, bottomNorm, isBottomRegion } = args;
  const prev = readCanvasDoorSplitStandardPosList(App, doorBaseKey);
  const tolNorm = readSketchManagedStandardSplitToleranceNorm(bounds);

  let topActive = hasSketchManagedStandardSplitSlot({ prev, norm: topNorm, tolNorm });
  let bottomActive =
    isCanvasDoorSplitBottomEnabled(App, doorBaseKey) ||
    hasSketchManagedStandardSplitSlot({ prev, norm: bottomNorm, tolNorm });

  if (isBottomRegion) bottomActive = !bottomActive;
  else topActive = !topActive;

  const nextList: number[] = [];
  if (bottomActive) pushUniqueSketchManagedStandardSplitNorm({ list: nextList, norm: bottomNorm, tolNorm });
  if (topActive) pushUniqueSketchManagedStandardSplitNorm({ list: nextList, norm: topNorm, tolNorm });
  nextList.sort((a, b) => a - b);

  return {
    nextList,
    changedToSplit: nextList.length > 0,
    nextBottomSplit:
      bottomActive && hasSketchManagedStandardSplitSlot({ prev: nextList, norm: bottomNorm, tolNorm }),
  };
}

function handleSketchManagedStandardSplitClick(args: {
  click: CanvasDoorSplitClickArgs;
  doorBaseKey: string;
  bounds: CanvasDoorSplitBounds | null;
  hitY: number | null;
}): boolean {
  const { click, doorBaseKey, bounds, hitY } = args;
  if (!bounds) return false;

  const target = resolveCanvasDoorStandardSplitTarget({
    App: click.App,
    doorBaseKey,
    bounds,
    hitY,
  });
  if (!target.isSketchManaged) return false;

  const isBottomRegion = target.isBottomRegion;
  const topNorm = resolveSketchManagedStandardSplitLineNorm({
    click,
    overallBounds: bounds,
    lineBounds: target.topBounds,
    isBottomRegion: false,
  });
  const bottomNorm = resolveSketchManagedStandardSplitLineNorm({
    click,
    overallBounds: bounds,
    lineBounds: target.bottomBounds,
    isBottomRegion: true,
  });
  const clickedNorm = isBottomRegion ? bottomNorm : topNorm;
  if (!Number.isFinite(Number(clickedNorm))) return true;
  const { splitKey, splitBottomKey } = createCanvasDoorSplitKeyState(doorBaseKey);
  const { nextList, changedToSplit, nextBottomSplit } = resolveSketchManagedStandardSplitToggle({
    App: click.App,
    doorBaseKey,
    bounds,
    topNorm,
    bottomNorm,
    isBottomRegion,
  });

  runCanvasDoorSplitHistoryBatch(
    click.App,
    isBottomRegion ? 'splitDoorsBottom:click:sketchManaged' : 'splitDoors:click:sketchManaged',
    () => {
      callCanvasDoorSplitBottomAction({
        App: click.App,
        key: splitBottomKey,
        next: nextBottomSplit,
        source: 'splitDoors:click:sketchManaged',
        op: 'splitBottom.sketchManagedStandard.missingDomainApi',
      });
      callCanvasDoorSplitAction({
        App: click.App,
        key: splitKey,
        next: changedToSplit,
        source: 'splitDoors:click:sketchManaged',
        op: 'split.sketchManagedStandard.missingDomainApi',
      });
      // Standard and manual authoring are separate modes. Entering the fixed
      // sketch-managed mode discards manual authoring positions for this door.
      writeCanvasDoorSplitPosList({
        App: click.App,
        doorBaseKey,
        nextList: [],
        source: 'splitDoors:click:sketchManaged',
      });
      writeCanvasDoorSplitStandardPosList({
        App: click.App,
        doorBaseKey,
        nextList,
        source: 'splitDoors:click:sketchManaged',
      });
      return undefined;
    }
  );
  try {
    requestDoorAuthoringBurstRefresh(click.App, 'splitDoors:click:sketchManaged');
  } catch (error) {
    __wp_reportPickingIssue(click.App, error, {
      where: 'canvasPicking',
      op: 'splitDoors.toggle.refresh',
      throttleMs: 1000,
    });
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

  if (handleSketchManagedStandardSplitClick({ click, doorBaseKey, bounds, hitY: splitHitY })) return true;

  const hasManualSplitPositions = readCanvasDoorSplitPosList(App, doorBaseKey).length > 0;

  if (isCanvasDoorSplitBottomClick(bounds, splitHitY)) {
    const next = hasManualSplitPositions ? true : !isCanvasDoorSplitBottomEnabled(App, doorBaseKey);
    runCanvasDoorSplitHistoryBatch(App, 'splitDoorsBottom:click', () => {
      if (hasManualSplitPositions) {
        // split_* is also the manual-mode enable bit. Once manual positions are
        // discarded it must not accidentally become a fixed top split.
        callCanvasDoorSplitAction({
          App,
          key: splitKey,
          next: false,
          source: 'splitDoorsBottom:click',
          op: 'splitBottom.clearManualTopState.missingDomainApi',
        });
      }
      writeCanvasDoorSplitPosList({
        App,
        doorBaseKey,
        nextList: [],
        source: 'splitDoorsBottom:click',
      });
      writeCanvasDoorSplitStandardPosList({
        App,
        doorBaseKey,
        nextList: [],
        source: 'splitDoorsBottom:click',
      });
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
  const nextSplit = hasManualSplitPositions ? true : !isCurrentlySplit;

  runCanvasDoorSplitHistoryBatch(App, 'splitDoors:click', () => {
    writeCanvasDoorSplitPosList({
      App,
      doorBaseKey,
      nextList: [],
      source: 'splitDoors:click',
    });
    writeCanvasDoorSplitStandardPosList({
      App,
      doorBaseKey,
      nextList: [],
      source: 'splitDoors:click',
    });
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
