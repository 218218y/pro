// Post-build sketch external-drawer door-cut application (Pure ESM)
//
// Owns door-loop selection and interval application for segmented sketch-door rebuild flows.

import { getDoorsArray } from '../runtime/render_access.js';

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

export function applySketchDrawerDoorCuts(args: ApplySketchDrawerDoorCutsArgs): void {
  const { App, runtime, selectDoorCuts } = args;
  const doorsArr = getDoorsArray(App);
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
    if (!selection || !selection.stacks.length) continue;

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
    const cuts: SketchDrawerCutSegment[] = [];
    for (let j = 0; j < selection.stacks.length; j++) {
      const stack = selection.stacks[j];
      const overlap = Math.min(doorXMax, stack.xMax) - Math.max(doorXMin, stack.xMin);
      if (!(overlap > 0.005)) continue;
      cuts.push({ yMin: stack.yMin, yMax: stack.yMax });
    }
    const normalizedCuts = normalizeSketchDrawerCutIntervals(cuts);
    if (!normalizedCuts.length) continue;
    const visibleSegments = subtractSketchDrawerIntervals(doorMin, doorMax, normalizedCuts);
    if (
      visibleSegments.length === 1 &&
      Math.abs(visibleSegments[0].yMin - doorMin) <= 0.002 &&
      Math.abs(visibleSegments[0].yMax - doorMax) <= 0.002
    )
      continue;
    rebuildSketchSegmentedDoor({ runtime, g, ud, visibleSegments, fallbackPartId: selection.fallbackPartId });
  }
}
