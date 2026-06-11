// Post-build sketch external-drawer door-cut application (Pure ESM)
//
// Owns door-loop selection and interval application for segmented sketch-door rebuild flows.

import { getDoorsArray } from '../runtime/render_access.js';
import { DOOR_SYSTEM_DIMENSIONS, DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

import { asRecord, getDoorEntryGroup, parseNum, readKey } from './post_build_extras_shared.js';
import type {
  ApplySketchDrawerDoorCutsArgs,
  SketchDrawerCutSegment,
} from './post_build_sketch_door_cuts_contracts.js';
import {
  normalizeSketchDrawerCutIntervals,
  subtractSketchDrawerIntervals,
} from './post_build_sketch_door_cuts_intervals.js';
import { rebuildSketchSegmentedDoor } from './post_build_sketch_door_cuts_rebuild.js';
import { notifyHandleFitSuppressions } from './handles_fit_suppression_feedback.js';

function clampSketchDoorCutValue(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function appendManualSplitLineCutIntervals(args: {
  cuts: SketchDrawerCutSegment[];
  doorMin: number;
  doorMax: number;
  splitPosList: readonly number[];
}): void {
  const { cuts, doorMin, doorMax, splitPosList } = args;
  if (!Array.isArray(splitPosList) || !splitPosList.length) return;
  const doorHeight = doorMax - doorMin;
  if (
    !Number.isFinite(doorHeight) ||
    !(doorHeight > DOOR_SYSTEM_DIMENSIONS.hinged.split.minHeightForSplitM)
  ) {
    return;
  }

  const splitDims = DOOR_SYSTEM_DIMENSIONS.hinged.split;
  const splitGap = Math.max(0, splitDims.splitGapM);
  const halfGap = splitGap / 2;
  const padAbs = Math.max(splitDims.bottomClampOffsetM, splitDims.topClampOffsetM);
  const minSegmentHeight = splitDims.minSegmentHeightM;
  const duplicateTolerance = Math.max(
    splitDims.duplicateCutToleranceMinM,
    Math.min(splitDims.duplicateCutToleranceMaxM, doorHeight * splitDims.duplicateCutToleranceHeightRatio)
  );
  const rawCutsAbs: number[] = [];
  for (let i = 0; i < splitPosList.length; i += 1) {
    const n = Number(splitPosList[i]);
    if (!Number.isFinite(n)) continue;
    const clampedNorm = clampSketchDoorCutValue(n, 0, 1);
    const y = clampSketchDoorCutValue(doorMin + clampedNorm * doorHeight, doorMin + padAbs, doorMax - padAbs);
    if (Number.isFinite(y)) rawCutsAbs.push(y);
  }
  if (!rawCutsAbs.length) return;
  rawCutsAbs.sort((a, b) => a - b);

  let previousSegmentTop = doorMin;
  let previousCut = NaN;
  for (let i = 0; i < rawCutsAbs.length; i += 1) {
    const cutY = rawCutsAbs[i];
    if (Number.isFinite(previousCut) && Math.abs(previousCut - cutY) <= duplicateTolerance) continue;
    const cutMin = cutY - halfGap;
    const cutMax = cutY + halfGap;
    if (cutMin - previousSegmentTop < minSegmentHeight) continue;
    if (doorMax - cutMax < minSegmentHeight) continue;
    cuts.push({ yMin: cutMin, yMax: cutMax });
    previousSegmentTop = cutMax;
    previousCut = cutY;
  }
}

function resolveSketchDoorManualSplitBounds(args: {
  doorMin: number;
  doorMax: number;
  drawerCuts: SketchDrawerCutSegment[];
}): SketchDrawerCutSegment {
  const { doorMin, doorMax, drawerCuts } = args;
  if (!Array.isArray(drawerCuts) || !drawerCuts.length) return { yMin: doorMin, yMax: doorMax };

  const visibleSegments = subtractSketchDrawerIntervals(doorMin, doorMax, drawerCuts);
  if (!visibleSegments.length) return { yMin: doorMin, yMax: doorMax };

  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 0; i < visibleSegments.length; i += 1) {
    const seg = visibleSegments[i];
    if (!Number.isFinite(seg.yMin) || !Number.isFinite(seg.yMax) || !(seg.yMax > seg.yMin)) continue;
    if (seg.yMin < yMin) yMin = seg.yMin;
    if (seg.yMax > yMax) yMax = seg.yMax;
  }

  if (!Number.isFinite(yMin) || !Number.isFinite(yMax) || !(yMax > yMin)) {
    return { yMin: doorMin, yMax: doorMax };
  }
  return { yMin, yMax };
}

export function applySketchDrawerDoorCuts(args: ApplySketchDrawerDoorCutsArgs): void {
  const { App, runtime, selectDoorCuts } = args;
  const doorsArr = getDoorsArray(App);
  const suppressedHandlePartIds: string[] = [];
  const collectSuppressedHandlePartIds = (partIds: string[]) => {
    for (let i = 0; i < partIds.length; i += 1) suppressedHandlePartIds.push(partIds[i]);
  };
  if (!doorsArr.length) return;

  for (let i = 0; i < doorsArr.length; i++) {
    const entryRaw = doorsArr[i];
    const entry = asRecord(entryRaw);
    const g = getDoorEntryGroup(entryRaw);
    const ud = asRecord(g && g.userData);
    if (!entry || !g || !ud) continue;
    const type = readKey(entry, 'type');
    if (type != null && String(type) !== 'hinged') continue;
    const selection = selectDoorCuts(entry, g, ud);
    if (!selection) continue;
    const selectedStacks = Array.isArray(selection.stacks) ? selection.stacks : [];
    const splitPosList = Array.isArray(selection.splitPosList) ? selection.splitPosList : [];
    if (!selectedStacks.length && !splitPosList.length) continue;

    const width = parseNum(readKey(ud, '__doorWidth'));
    const height = parseNum(readKey(ud, '__doorHeight'));
    const centerY = parseNum(g.position?.y);
    const centerXBase = parseNum(g.position?.x);
    const meshOffsetX = parseNum(readKey(ud, '__doorMeshOffsetX'));
    const centerX =
      (Number.isFinite(centerXBase) ? centerXBase : 0) + (Number.isFinite(meshOffsetX) ? meshOffsetX : 0);
    if (
      !Number.isFinite(width) ||
      width <= 0 ||
      !Number.isFinite(height) ||
      height <= 0 ||
      !Number.isFinite(centerY) ||
      !Number.isFinite(centerX)
    )
      continue;

    const doorMin = centerY - height / 2;
    const doorMax = centerY + height / 2;
    const doorXMin = centerX - width / 2;
    const doorXMax = centerX + width / 2;
    const drawerCutsRaw: SketchDrawerCutSegment[] = [];
    for (let j = 0; j < selectedStacks.length; j++) {
      const stack = selectedStacks[j];
      const overlap = Math.min(doorXMax, stack.xMax) - Math.max(doorXMin, stack.xMin);
      if (!(overlap > DRAWER_DIMENSIONS.sketch.doorCutHorizontalOverlapMinM)) continue;
      drawerCutsRaw.push({ yMin: stack.yMin, yMax: stack.yMax });
    }
    const drawerCuts = normalizeSketchDrawerCutIntervals(drawerCutsRaw);
    const cuts: SketchDrawerCutSegment[] = drawerCuts.map(seg => ({ yMin: seg.yMin, yMax: seg.yMax }));
    const splitBounds = resolveSketchDoorManualSplitBounds({ doorMin, doorMax, drawerCuts });
    appendManualSplitLineCutIntervals({
      cuts,
      doorMin: splitBounds.yMin,
      doorMax: splitBounds.yMax,
      splitPosList,
    });
    const normalizedCuts = normalizeSketchDrawerCutIntervals(cuts, {
      minHeight: splitPosList.length ? DOOR_SYSTEM_DIMENSIONS.hinged.split.splitGapM / 2 : undefined,
    });
    if (!normalizedCuts.length) continue;
    const visibleSegments = subtractSketchDrawerIntervals(doorMin, doorMax, normalizedCuts);
    if (
      visibleSegments.length === 1 &&
      Math.abs(visibleSegments[0].yMin - doorMin) <= DRAWER_DIMENSIONS.sketch.doorCutNoOpToleranceM &&
      Math.abs(visibleSegments[0].yMax - doorMax) <= DRAWER_DIMENSIONS.sketch.doorCutNoOpToleranceM
    )
      continue;
    rebuildSketchSegmentedDoor({
      runtime,
      g,
      ud,
      visibleSegments,
      basePartId: selection.basePartId,
      collectSuppressedHandlePartIds,
    });
  }

  if (args.collectSuppressedHandlePartIds) {
    args.collectSuppressedHandlePartIds(suppressedHandlePartIds);
  } else {
    notifyHandleFitSuppressions(App, suppressedHandlePartIds, {
      scope: 'sketch-segment-door-handles',
      completePass: true,
    });
  }
}
