import type {
  SketchBoxDoorState,
  SketchBoxSegmentState,
  SketchBoxVerticalSegmentState,
} from './canvas_picking_sketch_box_dividers_shared.js';
import { pickSketchBoxSegment, pickSketchBoxVerticalSegment } from './canvas_picking_sketch_box_segments.js';
import {
  findSketchBoxDoorForSegment,
  findSketchBoxDoorsForSegment,
  hasSketchBoxDoubleDoorPairForSegment,
} from './canvas_picking_sketch_box_doors_placement.js';
import {
  createSketchBoxDoorId,
  readSketchBoxDoors,
  resolveSketchBoxDoubleDoorPair,
  writeSketchBoxDoors,
} from './canvas_picking_sketch_box_doors_shared.js';

type SketchBoxDoorSegmentMutationArgs = {
  box: unknown;
  segments: SketchBoxSegmentState[];
  verticalSegments?: SketchBoxVerticalSegmentState[];
  boxCenterX: number;
  innerW: number;
  boxCenterY?: number | null;
  innerH?: number | null;
  cursorX?: number | null;
  cursorY?: number | null;
  xNorm?: number | null;
  yNorm?: number | null;
};

function pickTargetVerticalSegment(
  args: SketchBoxDoorSegmentMutationArgs
): SketchBoxVerticalSegmentState | null {
  const verticalSegments = Array.isArray(args.verticalSegments) ? args.verticalSegments : [];
  if (!verticalSegments.length) return null;
  return pickSketchBoxVerticalSegment({
    segments: verticalSegments,
    boxCenterY: Number(args.boxCenterY),
    innerH: Number(args.innerH),
    cursorY: args.cursorY,
    yNorm: args.yNorm,
  });
}

export function upsertSketchBoxDoubleDoorPairForSegment(args: {
  box: unknown;
  segments: SketchBoxSegmentState[];
  verticalSegments?: SketchBoxVerticalSegmentState[];
  boxCenterX: number;
  innerW: number;
  boxCenterY?: number | null;
  innerH?: number | null;
  cursorX?: number | null;
  cursorY?: number | null;
  xNorm?: number | null;
  yNorm?: number | null;
}): SketchBoxDoorState[] {
  const targetSegment = pickSketchBoxSegment({
    segments: args.segments,
    boxCenterX: args.boxCenterX,
    innerW: args.innerW,
    cursorX: args.cursorX,
    xNorm: args.xNorm,
  });
  if (!targetSegment) return [];
  const targetVerticalSegment = pickTargetVerticalSegment(args);
  const doors = readSketchBoxDoors(args.box);
  const placements = findSketchBoxDoorsForSegment(args);
  const pair = resolveSketchBoxDoubleDoorPair(placements);
  const keepIds = new Set(placements.map(placement => placement.door.id));
  const leftDoor: SketchBoxDoorState = {
    id: pair.left?.door.id || createSketchBoxDoorId('dl_'),
    xNorm: targetSegment.xNorm,
    ...(targetVerticalSegment ? { yNorm: targetVerticalSegment.yNorm } : {}),
    hinge: 'left',
    enabled: true,
    open: pair.left?.door.open === true,
    groove: pair.left?.door.groove === true,
    grooveLinesCount: pair.left?.door.grooveLinesCount ?? null,
  };
  const rightDoor: SketchBoxDoorState = {
    id: pair.right?.door.id || createSketchBoxDoorId('dr_'),
    xNorm: targetSegment.xNorm,
    ...(targetVerticalSegment ? { yNorm: targetVerticalSegment.yNorm } : {}),
    hinge: 'right',
    enabled: true,
    open: pair.right?.door.open === true,
    groove: pair.right?.door.groove === true,
    grooveLinesCount: pair.right?.door.grooveLinesCount ?? null,
  };
  const nextDoors = doors.filter(door => !keepIds.has(door.id));
  nextDoors.push(leftDoor, rightDoor);
  writeSketchBoxDoors(args.box, nextDoors);
  return [leftDoor, rightDoor];
}

export function removeSketchBoxDoubleDoorPairForSegment(args: {
  box: unknown;
  segments: SketchBoxSegmentState[];
  verticalSegments?: SketchBoxVerticalSegmentState[];
  boxCenterX: number;
  innerW: number;
  boxCenterY?: number | null;
  innerH?: number | null;
  cursorX?: number | null;
  cursorY?: number | null;
  xNorm?: number | null;
  yNorm?: number | null;
}): boolean {
  const placements = findSketchBoxDoorsForSegment(args);
  if (!placements.length) return false;
  const removeIds = new Set(placements.map(placement => placement.door.id));
  if (!removeIds.size) return false;
  const nextDoors = readSketchBoxDoors(args.box).filter(door => !removeIds.has(door.id));
  writeSketchBoxDoors(args.box, nextDoors);
  return true;
}

export function upsertSketchBoxDoorForSegment(args: {
  box: unknown;
  segments: SketchBoxSegmentState[];
  verticalSegments?: SketchBoxVerticalSegmentState[];
  boxCenterX: number;
  innerW: number;
  boxCenterY?: number | null;
  innerH?: number | null;
  cursorX?: number | null;
  cursorY?: number | null;
  xNorm?: number | null;
  yNorm?: number | null;
  hinge?: unknown;
  doorId?: unknown;
}): SketchBoxDoorState | null {
  const targetSegment = pickSketchBoxSegment({
    segments: args.segments,
    boxCenterX: args.boxCenterX,
    innerW: args.innerW,
    cursorX: args.cursorX,
    xNorm: args.xNorm,
  });
  if (!targetSegment) return null;
  const targetVerticalSegment = pickTargetVerticalSegment(args);
  const doors = readSketchBoxDoors(args.box);
  const existing = findSketchBoxDoorForSegment(args);
  const hingeRaw = typeof args.hinge === 'string' ? String(args.hinge).trim().toLowerCase() : '';
  const hinge = hingeRaw === 'right' ? 'right' : 'left';
  const next: SketchBoxDoorState = {
    id:
      args.doorId != null && String(args.doorId)
        ? String(args.doorId)
        : existing?.door.id || createSketchBoxDoorId('d_'),
    xNorm: targetSegment.xNorm,
    ...(targetVerticalSegment ? { yNorm: targetVerticalSegment.yNorm } : {}),
    hinge,
    enabled: true,
    open: existing?.door.open === true,
    groove: existing?.door.groove === true,
    grooveLinesCount: existing?.door.grooveLinesCount ?? null,
  };
  const nextDoors = doors.filter((_, i) => i !== (existing ? existing.index : -1));
  nextDoors.push(next);
  writeSketchBoxDoors(args.box, nextDoors);
  return next;
}

export function removeSketchBoxDoorForSegment(args: {
  box: unknown;
  segments: SketchBoxSegmentState[];
  verticalSegments?: SketchBoxVerticalSegmentState[];
  boxCenterX: number;
  innerW: number;
  boxCenterY?: number | null;
  innerH?: number | null;
  cursorX?: number | null;
  cursorY?: number | null;
  xNorm?: number | null;
  yNorm?: number | null;
  doorId?: unknown;
}): boolean {
  const doors = readSketchBoxDoors(args.box);
  if (!doors.length) return false;
  const doorId = args.doorId != null && String(args.doorId) ? String(args.doorId) : '';
  let removeIndex = -1;
  if (doorId) {
    removeIndex = doors.findIndex(door => door.id === doorId);
  }
  if (removeIndex < 0) {
    const placement = findSketchBoxDoorForSegment(args);
    removeIndex = placement ? placement.index : -1;
  }
  if (removeIndex < 0) return false;
  const nextDoors = doors.slice();
  nextDoors.splice(removeIndex, 1);
  writeSketchBoxDoors(args.box, nextDoors);
  return true;
}

export function toggleSketchBoxDoorHingeForSegment(args: {
  box: unknown;
  segments: SketchBoxSegmentState[];
  verticalSegments?: SketchBoxVerticalSegmentState[];
  boxCenterX: number;
  innerW: number;
  boxCenterY?: number | null;
  innerH?: number | null;
  cursorX?: number | null;
  cursorY?: number | null;
  xNorm?: number | null;
  yNorm?: number | null;
  doorId?: unknown;
}): SketchBoxDoorState | null {
  const doors = readSketchBoxDoors(args.box);
  if (!doors.length) return null;
  if (hasSketchBoxDoubleDoorPairForSegment(args)) return null;
  const doorId = args.doorId != null && String(args.doorId) ? String(args.doorId) : '';
  let target = -1;
  if (doorId) target = doors.findIndex(door => door.id === doorId);
  if (target < 0) {
    const placement = findSketchBoxDoorForSegment(args);
    target = placement ? placement.index : -1;
  }
  if (target < 0) return null;
  const nextDoors = doors.slice();
  const current = nextDoors[target];
  nextDoors[target] = {
    ...current,
    hinge: current.hinge === 'right' ? 'left' : 'right',
  };
  writeSketchBoxDoors(args.box, nextDoors);
  return nextDoors[target];
}
