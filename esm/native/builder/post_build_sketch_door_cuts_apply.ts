// Post-build sketch external-drawer door-cut application (Pure ESM)
//
// Owns door-loop selection and interval application for segmented sketch-door rebuild flows.

import { getDoorsArray } from '../runtime/render_access.js';
import {
  isSplitEnabledInMap,
  readSplitPosListFromMap,
  readSplitStandardPosListFromMap,
} from '../runtime/maps_access.js';
import { HINGED_DOOR_SPLIT_GEOMETRY_POLICY } from '../../shared/dimensions/door_system_policy.js';
import { DRAWER_SKETCH_DOOR_CUT_POLICY } from '../../shared/dimensions/drawer_sketch_policy.js';
import { resolveDoorSplitAuthoringBaseKey } from '../../shared/door_visual_key_contracts_shared.js';

import { asRecord, getDoorEntryGroup, readKey, type ValueRecord } from './post_build_extras_shared.js';
import type {
  ApplySketchDrawerDoorCutsArgs,
  SketchDrawerCutSegment,
} from './post_build_sketch_door_cuts_contracts.js';
import {
  normalizeSketchDrawerCutIntervals,
  subtractSketchDrawerIntervals,
} from './post_build_sketch_door_cuts_intervals.js';
import { rebuildSketchSegmentedDoor } from './post_build_sketch_door_cuts_rebuild.js';
import { notifyHandleFitSuppressions } from './construction_correction_feedback.js';
import {
  readGeometryUserDataNumber,
  readGeometryUserDataNumberKey,
  readGeometryUserDataPositiveNumberKey,
} from './geometry_user_data_contracts.js';
import { readGeometryRuntimeNumber } from './geometry_runtime_contracts.js';

function clampSketchDoorCutValue(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function appendAuthoredSplitLineCutIntervals(args: {
  cuts: SketchDrawerCutSegment[];
  doorMin: number;
  doorMax: number;
  splitPosList: readonly number[];
}): void {
  const { cuts, doorMin, doorMax, splitPosList } = args;
  if (!Array.isArray(splitPosList) || !splitPosList.length) return;
  const doorHeight = doorMax - doorMin;
  if (!Number.isFinite(doorHeight) || !(doorHeight > HINGED_DOOR_SPLIT_GEOMETRY_POLICY.minHeightForSplitM)) {
    return;
  }

  const splitGap = Math.max(0, HINGED_DOOR_SPLIT_GEOMETRY_POLICY.splitGapM);
  const halfGap = splitGap / 2;
  const padAbs = Math.max(
    HINGED_DOOR_SPLIT_GEOMETRY_POLICY.bottomClampOffsetM,
    HINGED_DOOR_SPLIT_GEOMETRY_POLICY.topClampOffsetM
  );
  const minSegmentHeight = HINGED_DOOR_SPLIT_GEOMETRY_POLICY.minSegmentHeightM;
  const duplicateTolerance = Math.max(
    HINGED_DOOR_SPLIT_GEOMETRY_POLICY.duplicateCutToleranceMinM,
    Math.min(
      HINGED_DOOR_SPLIT_GEOMETRY_POLICY.duplicateCutToleranceMaxM,
      doorHeight * HINGED_DOOR_SPLIT_GEOMETRY_POLICY.duplicateCutToleranceHeightRatio
    )
  );
  const rawCutsAbs: number[] = [];
  for (const splitPos of splitPosList) {
    const n = readGeometryRuntimeNumber(splitPos);
    if (n == null) continue;
    const clampedNorm = clampSketchDoorCutValue(n, 0, 1);
    const y = clampSketchDoorCutValue(doorMin + clampedNorm * doorHeight, doorMin + padAbs, doorMax - padAbs);
    if (Number.isFinite(y)) rawCutsAbs.push(y);
  }
  if (!rawCutsAbs.length) return;
  rawCutsAbs.sort((a, b) => a - b);

  let previousSegmentTop = doorMin;
  let previousCut = NaN;
  for (const cutY of rawCutsAbs) {
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

function resolveSketchDoorAuthoredSplitBounds(args: {
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
  for (const seg of visibleSegments) {
    if (!Number.isFinite(seg.yMin) || !Number.isFinite(seg.yMax) || !(seg.yMax > seg.yMin)) continue;
    if (seg.yMin < yMin) yMin = seg.yMin;
    if (seg.yMax > yMax) yMax = seg.yMax;
  }

  if (!Number.isFinite(yMin) || !Number.isFinite(yMax) || !(yMax > yMin)) {
    return { yMin: doorMin, yMax: doorMax };
  }
  return { yMin, yMax };
}

export type SketchDoorSplitSelection = {
  basePartId: string;
  splitPosList: number[];
};

export function readSketchDoorSplitSelection(cfg: ValueRecord, partId: unknown): SketchDoorSplitSelection {
  const basePartId = resolveDoorSplitAuthoringBaseKey(partId);
  if (!basePartId) return { basePartId: '', splitPosList: [] };

  const splitMap = asRecord(readKey(cfg, 'splitDoorsMap'));
  if (!splitMap || !isSplitEnabledInMap(splitMap, basePartId, false)) {
    return { basePartId, splitPosList: [] };
  }

  const manualSplitPosList = readSplitPosListFromMap(splitMap, basePartId);
  const standardSplitPosList = readSplitStandardPosListFromMap(splitMap, basePartId);
  return {
    basePartId,
    // The two authoring modes are persisted separately. Manual positions win only
    // as a defensive fallback for malformed snapshots where both domains exist.
    splitPosList: manualSplitPosList.length ? manualSplitPosList : standardSplitPosList,
  };
}

export function applySketchDrawerDoorCuts(args: ApplySketchDrawerDoorCutsArgs): void {
  const { App, runtime, selectDoorCuts } = args;
  const doorsArr = getDoorsArray(App);
  const suppressedHandlePartIds: string[] = [];
  const collectSuppressedHandlePartIds = (partIds: string[]) => {
    for (const partId of partIds) suppressedHandlePartIds.push(partId);
  };
  if (!doorsArr.length) return;

  for (const entryRaw of doorsArr) {
    const entry = asRecord(entryRaw);
    const g = getDoorEntryGroup(entryRaw);
    const ud = asRecord(g && g.userData);
    if (!entry || !g || !ud) continue;
    const type = readKey(entry, 'type');
    if (type != null && type !== 'hinged') continue;
    const selection = selectDoorCuts(entry, g, ud);
    if (!selection) continue;
    const selectedStacks = Array.isArray(selection.stacks) ? selection.stacks : [];
    const splitPosList = Array.isArray(selection.splitPosList) ? selection.splitPosList : [];
    if (!selectedStacks.length && !splitPosList.length) continue;

    const width = readGeometryUserDataPositiveNumberKey(ud, '__doorWidth') ?? NaN;
    const height = readGeometryUserDataPositiveNumberKey(ud, '__doorHeight') ?? NaN;
    const centerY = readGeometryUserDataNumber(g.position?.y) ?? NaN;
    const centerXBase = readGeometryUserDataNumber(g.position?.x) ?? 0;
    const meshOffsetX = readGeometryUserDataNumberKey(ud, '__doorMeshOffsetX') ?? 0;
    const centerX = centerXBase + meshOffsetX;
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
    for (const stack of selectedStacks) {
      const overlap = Math.min(doorXMax, stack.xMax) - Math.max(doorXMin, stack.xMin);
      if (!(overlap > DRAWER_SKETCH_DOOR_CUT_POLICY.doorCutHorizontalOverlapMinM)) continue;
      drawerCutsRaw.push({ yMin: stack.yMin, yMax: stack.yMax });
    }
    const drawerCuts = normalizeSketchDrawerCutIntervals(drawerCutsRaw);
    const cuts: SketchDrawerCutSegment[] = drawerCuts.map(seg => ({ yMin: seg.yMin, yMax: seg.yMax }));
    const splitBounds = resolveSketchDoorAuthoredSplitBounds({ doorMin, doorMax, drawerCuts });
    appendAuthoredSplitLineCutIntervals({
      cuts,
      doorMin: splitBounds.yMin,
      doorMax: splitBounds.yMax,
      splitPosList,
    });
    const normalizedCuts = normalizeSketchDrawerCutIntervals(
      cuts,
      splitPosList.length ? { minHeight: HINGED_DOOR_SPLIT_GEOMETRY_POLICY.splitGapM / 2 } : {}
    );
    if (!normalizedCuts.length) continue;
    const visibleSegments = subtractSketchDrawerIntervals(doorMin, doorMax, normalizedCuts);
    const onlyVisibleSegment = visibleSegments.length === 1 ? visibleSegments[0] : undefined;
    if (
      onlyVisibleSegment &&
      Math.abs(onlyVisibleSegment.yMin - doorMin) <= DRAWER_SKETCH_DOOR_CUT_POLICY.doorCutNoOpToleranceM &&
      Math.abs(onlyVisibleSegment.yMax - doorMax) <= DRAWER_SKETCH_DOOR_CUT_POLICY.doorCutNoOpToleranceM
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
