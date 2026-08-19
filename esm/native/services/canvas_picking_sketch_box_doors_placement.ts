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
  verticalSegments?: SketchBoxVerticalSegmentState[] | undefined;
  boxCenterX: number;
  innerW: number;
  boxCenterY?: number | null | undefined;
  innerH?: number | null | undefined;
}): SketchBoxDoorPlacement[] {
  const doors = readSketchBoxDoors(args.box);
  const out: SketchBoxDoorPlacement[] = [];
  for (const [i, door] of doors.entries()) {
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
  verticalSegments?: SketchBoxVerticalSegmentState[] | undefined;
  boxCenterX: number;
  innerW: number;
  boxCenterY?: number | null | undefined;
  innerH?: number | null | undefined;
  cursorX?: number | null | undefined;
  cursorY?: number | null | undefined;
  xNorm?: number | null | undefined;
  yNorm?: number | null | undefined;
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
  for (const placement of placements) {
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
  verticalSegments?: SketchBoxVerticalSegmentState[] | undefined;
  boxCenterX: number;
  innerW: number;
  boxCenterY?: number | null | undefined;
  innerH?: number | null | undefined;
  cursorX?: number | null | undefined;
  cursorY?: number | null | undefined;
  xNorm?: number | null | undefined;
  yNorm?: number | null | undefined;
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
  verticalSegments?: SketchBoxVerticalSegmentState[] | undefined;
  boxCenterX: number;
  innerW: number;
  boxCenterY?: number | null | undefined;
  innerH?: number | null | undefined;
  cursorX?: number | null | undefined;
  cursorY?: number | null | undefined;
  xNorm?: number | null | undefined;
  yNorm?: number | null | undefined;
}): boolean {
  const placements = findSketchBoxDoorsForSegment(args);
  if (placements.length < 2) return false;
  const pair = resolveSketchBoxDoubleDoorPair(placements);
  return !!(pair.left && pair.right);
}
