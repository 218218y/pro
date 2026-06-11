import type {
  SketchBoxDoorPlacement,
  SketchBoxSegmentState,
  SketchBoxVerticalSegmentState,
} from './canvas_picking_sketch_box_dividers_shared.js';
import { pickSketchBoxSegment, pickSketchBoxVerticalSegment } from './canvas_picking_sketch_box_segments.js';
import {
  readSketchBoxDoors,
  resolveSketchBoxDoubleDoorPair,
} from './canvas_picking_sketch_box_doors_shared.js';

export function resolveSketchBoxDoorPlacements(args: {
  box: unknown;
  segments: SketchBoxSegmentState[];
  verticalSegments?: SketchBoxVerticalSegmentState[];
  boxCenterX: number;
  innerW: number;
  boxCenterY?: number | null;
  innerH?: number | null;
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
      verticalSegment:
        args.verticalSegments?.length && door.yNorm != null
          ? pickSketchBoxVerticalSegment({
              segments: args.verticalSegments,
              boxCenterY: Number(args.boxCenterY),
              innerH: Number(args.innerH),
              yNorm: door.yNorm,
            })
          : null,
    });
  }
  return out;
}

export function findSketchBoxDoorForSegment(args: {
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
}): SketchBoxDoorPlacement | null {
  const targetSegment = pickSketchBoxSegment({
    segments: args.segments,
    boxCenterX: args.boxCenterX,
    innerW: args.innerW,
    cursorX: args.cursorX,
    xNorm: args.xNorm,
  });
  if (!targetSegment) return null;
  const verticalSegments = Array.isArray(args.verticalSegments) ? args.verticalSegments : [];
  const targetVerticalSegment = verticalSegments.length
    ? pickSketchBoxVerticalSegment({
        segments: verticalSegments,
        boxCenterY: Number(args.boxCenterY),
        innerH: Number(args.innerH),
        cursorY: args.cursorY,
        yNorm: args.yNorm,
      })
    : null;
  const placements = resolveSketchBoxDoorPlacements(args);
  for (let i = 0; i < placements.length; i++) {
    const placement = placements[i];
    const segment = placement?.segment;
    const verticalSegment = placement?.verticalSegment;
    const sameColumn = !!(placement && segment && segment.index === targetSegment.index);
    const sameRow =
      !targetVerticalSegment ||
      (verticalSegment && verticalSegment.index === targetVerticalSegment.index) ||
      (!verticalSegment && placement?.door?.yNorm == null);
    if (sameColumn && sameRow) return placement;
  }
  return null;
}

export function findSketchBoxDoorsForSegment(args: {
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
}): SketchBoxDoorPlacement[] {
  const targetSegment = pickSketchBoxSegment({
    segments: args.segments,
    boxCenterX: args.boxCenterX,
    innerW: args.innerW,
    cursorX: args.cursorX,
    xNorm: args.xNorm,
  });
  if (!targetSegment) return [];
  const verticalSegments = Array.isArray(args.verticalSegments) ? args.verticalSegments : [];
  const targetVerticalSegment = verticalSegments.length
    ? pickSketchBoxVerticalSegment({
        segments: verticalSegments,
        boxCenterY: Number(args.boxCenterY),
        innerH: Number(args.innerH),
        cursorY: args.cursorY,
        yNorm: args.yNorm,
      })
    : null;
  return resolveSketchBoxDoorPlacements(args).filter(
    placement =>
      placement?.segment?.index === targetSegment.index &&
      (!targetVerticalSegment ||
        placement?.verticalSegment?.index === targetVerticalSegment.index ||
        placement?.door?.yNorm == null)
  );
}

export function hasSketchBoxDoubleDoorPairForSegment(args: {
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
  if (placements.length < 2) return false;
  const pair = resolveSketchBoxDoubleDoorPair(placements);
  return !!(pair.left && pair.right);
}
