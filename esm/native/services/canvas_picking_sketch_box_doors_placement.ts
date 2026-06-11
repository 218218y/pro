import type {
  SketchBoxDoorPlacement,
  SketchBoxSegmentState,
} from './canvas_picking_sketch_box_dividers_shared.js';
import { pickSketchBoxSegment } from './canvas_picking_sketch_box_segments.js';
import {
  readSketchBoxDoors,
  resolveSketchBoxDoubleDoorPair,
} from './canvas_picking_sketch_box_doors_shared.js';

export function resolveSketchBoxDoorPlacements(args: {
  box: unknown;
  segments: SketchBoxSegmentState[];
  boxCenterX: number;
  innerW: number;
}): SketchBoxDoorPlacement[] {
  const doors = readSketchBoxDoors(args.box);
  const out: SketchBoxDoorPlacement[] = [];
  for (let i = 0; i < doors.length; i++) {
    const door = doors[i];
    out.push({
      door,
      index: i,
      segment: pickSketchBoxSegment({
        segments: args.segments,
        boxCenterX: args.boxCenterX,
        innerW: args.innerW,
        xNorm: door.xNorm,
      }),
    });
  }
  return out;
}

export function findSketchBoxDoorForSegment(args: {
  box: unknown;
  segments: SketchBoxSegmentState[];
  boxCenterX: number;
  innerW: number;
  cursorX?: number | null;
  xNorm?: number | null;
}): SketchBoxDoorPlacement | null {
  const targetSegment = pickSketchBoxSegment({
    segments: args.segments,
    boxCenterX: args.boxCenterX,
    innerW: args.innerW,
    cursorX: args.cursorX,
    xNorm: args.xNorm,
  });
  if (!targetSegment) return null;
  const placements = resolveSketchBoxDoorPlacements(args);
  for (let i = 0; i < placements.length; i++) {
    const placement = placements[i];
    const segment = placement?.segment;
    if (placement && segment && segment.index === targetSegment.index) return placement;
  }
  return null;
}

export function findSketchBoxDoorsForSegment(args: {
  box: unknown;
  segments: SketchBoxSegmentState[];
  boxCenterX: number;
  innerW: number;
  cursorX?: number | null;
  xNorm?: number | null;
}): SketchBoxDoorPlacement[] {
  const targetSegment = pickSketchBoxSegment({
    segments: args.segments,
    boxCenterX: args.boxCenterX,
    innerW: args.innerW,
    cursorX: args.cursorX,
    xNorm: args.xNorm,
  });
  if (!targetSegment) return [];
  return resolveSketchBoxDoorPlacements(args).filter(
    placement => placement?.segment?.index === targetSegment.index
  );
}

export function hasSketchBoxDoubleDoorPairForSegment(args: {
  box: unknown;
  segments: SketchBoxSegmentState[];
  boxCenterX: number;
  innerW: number;
  cursorX?: number | null;
  xNorm?: number | null;
}): boolean {
  const placements = findSketchBoxDoorsForSegment(args);
  if (placements.length < 2) return false;
  const pair = resolveSketchBoxDoubleDoorPair(placements);
  return !!(pair.left && pair.right);
}
