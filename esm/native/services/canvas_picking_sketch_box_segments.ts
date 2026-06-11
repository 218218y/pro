import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type {
  SketchBoxDividerState,
  SketchBoxHorizontalDividerState,
  SketchBoxSegmentState,
  SketchBoxVerticalSegmentState,
} from './canvas_picking_sketch_box_dividers_shared.js';
import {
  normalizeSketchBoxDividerXNorm,
  normalizeSketchBoxDividerYNorm,
  readFiniteNumber,
} from './canvas_picking_sketch_box_dividers_shared.js';
import {
  resolveSketchBoxDividerPlacements,
  resolveSketchBoxHorizontalDividerPlacements,
} from './canvas_picking_sketch_box_divider_state_placement.js';

function readSafeSpan(value: unknown): number {
  return Number.isFinite(Number(value))
    ? Math.max(SKETCH_BOX_DIMENSIONS.dividers.minInnerWidthM, Number(value))
    : SKETCH_BOX_DIMENSIONS.dividers.minInnerWidthM;
}
function readSafeCenter(value: unknown): number {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}
function readSafeWoodThick(value: unknown): number {
  return Number.isFinite(Number(value)) && Number(value) > 0
    ? Number(value)
    : SKETCH_BOX_DIMENSIONS.dividers.fallbackWoodThicknessM;
}
function dividerHalfFor(span: number, woodThick: number): number {
  return Math.min(span / 2, Math.max(woodThick / 2, SKETCH_BOX_DIMENSIONS.dividers.dividerHalfMinM));
}

export function resolveSketchBoxVerticalSegments(args: {
  dividers: SketchBoxHorizontalDividerState[];
  boxCenterY: number;
  innerH: number;
  woodThick: number;
  verticalDividers?: SketchBoxDividerState[];
  boxCenterX?: number | null;
  innerW?: number | null;
  cursorX?: number | null;
  xNorm?: number | null;
}): SketchBoxVerticalSegmentState[] {
  const safeInnerH = readSafeSpan(args.innerH);
  const safeCenterY = readSafeCenter(args.boxCenterY);
  const safeWoodThick = readSafeWoodThick(args.woodThick);
  const bottomY = safeCenterY - safeInnerH / 2;
  const topY = safeCenterY + safeInnerH / 2;
  const dividerHalf = dividerHalfFor(safeInnerH, safeWoodThick);
  const horizontalDividers = filterHorizontalDividersForColumn({
    dividers: Array.isArray(args.dividers) ? args.dividers : [],
    verticalDividers: Array.isArray(args.verticalDividers) ? args.verticalDividers : [],
    boxCenterX: args.boxCenterX,
    innerW: args.innerW,
    cursorX: args.cursorX,
    xNorm: args.xNorm,
    woodThick: safeWoodThick,
  });
  const placements = resolveSketchBoxHorizontalDividerPlacements({
    dividers: horizontalDividers,
    boxCenterY: safeCenterY,
    innerH: safeInnerH,
    woodThick: safeWoodThick,
  });
  const segments: SketchBoxVerticalSegmentState[] = [];
  const pushSegment = (segBottom: number, segTop: number) => {
    if (!(segTop > segBottom + SKETCH_BOX_DIMENSIONS.dividers.segmentEdgeEpsilonM)) return;
    const centerY = (segBottom + segTop) / 2;
    segments.push({
      index: segments.length,
      bottomY: segBottom,
      topY: segTop,
      centerY,
      height: segTop - segBottom,
      yNorm: Math.max(0, Math.min(1, (centerY - bottomY) / safeInnerH)),
    });
  };
  let cursor = bottomY;
  for (const placement of placements) {
    pushSegment(cursor, Math.max(cursor, Math.min(topY, placement.centerY - dividerHalf)));
    cursor = Math.max(cursor, Math.min(topY, placement.centerY + dividerHalf));
  }
  pushSegment(cursor, topY);
  if (!segments.length) pushSegment(bottomY, topY);
  return segments;
}

function filterHorizontalDividersForColumn(args: {
  dividers: SketchBoxHorizontalDividerState[];
  verticalDividers: SketchBoxDividerState[];
  boxCenterX?: number | null;
  innerW?: number | null;
  cursorX?: number | null;
  xNorm?: number | null;
  woodThick: number;
}): SketchBoxHorizontalDividerState[] {
  const dividers = Array.isArray(args.dividers) ? args.dividers : [];
  const scopedDividers = dividers.filter(divider => normalizeSketchBoxDividerXNorm(divider.xNorm) != null);
  if (!scopedDividers.length) return dividers;
  if (
    !Array.isArray(args.verticalDividers) ||
    !args.verticalDividers.length ||
    !Number.isFinite(Number(args.boxCenterX)) ||
    !Number.isFinite(Number(args.innerW))
  ) {
    return dividers.filter(divider => normalizeSketchBoxDividerXNorm(divider.xNorm) == null);
  }
  const segments = resolveSketchBoxSegments({
    dividers: args.verticalDividers,
    boxCenterX: Number(args.boxCenterX),
    innerW: Number(args.innerW),
    woodThick: args.woodThick,
  });
  const activeSegment = pickSketchBoxSegment({
    segments,
    boxCenterX: Number(args.boxCenterX),
    innerW: Number(args.innerW),
    cursorX: args.cursorX,
    xNorm: args.xNorm,
  });
  if (!activeSegment)
    return dividers.filter(divider => normalizeSketchBoxDividerXNorm(divider.xNorm) == null);
  return dividers.filter(divider => {
    const dividerXNorm = normalizeSketchBoxDividerXNorm(divider.xNorm);
    if (dividerXNorm == null) return true;
    const owner = pickSketchBoxSegment({
      segments,
      boxCenterX: Number(args.boxCenterX),
      innerW: Number(args.innerW),
      xNorm: dividerXNorm,
    });
    return owner?.index === activeSegment.index;
  });
}

export function pickSketchBoxVerticalSegment(args: {
  segments: SketchBoxVerticalSegmentState[];
  boxCenterY: number;
  innerH: number;
  cursorY?: number | null;
  yNorm?: number | null;
}): SketchBoxVerticalSegmentState | null {
  const segments = Array.isArray(args.segments) ? args.segments : [];
  if (!segments.length) return null;
  let targetY = NaN;
  const finiteCursorY = readFiniteNumber(args.cursorY);
  if (finiteCursorY != null) targetY = finiteCursorY;
  else {
    const norm = normalizeSketchBoxDividerYNorm(args.yNorm);
    if (norm != null)
      targetY =
        readSafeCenter(args.boxCenterY) - readSafeSpan(args.innerH) / 2 + norm * readSafeSpan(args.innerH);
  }
  if (!Number.isFinite(targetY)) return segments[0] || null;
  const eps = SKETCH_BOX_DIMENSIONS.dividers.pickEdgeEpsilonM;
  for (const segment of segments)
    if (targetY >= segment.bottomY - eps && targetY <= segment.topY + eps) return segment;
  return (
    segments.slice().sort((a, b) => Math.abs(a.centerY - targetY) - Math.abs(b.centerY - targetY))[0] || null
  );
}

function verticalDividerBelongsToSegment(args: {
  divider: SketchBoxDividerState;
  segment: SketchBoxVerticalSegmentState | null;
  verticalSegments: SketchBoxVerticalSegmentState[];
  boxCenterY?: number | null;
  innerH?: number | null;
}): boolean {
  if (!args.verticalSegments.length || !args.segment) return true;
  const yNorm = normalizeSketchBoxDividerYNorm(args.divider.yNorm);
  if (yNorm == null) return true;
  const owner = pickSketchBoxVerticalSegment({
    segments: args.verticalSegments,
    boxCenterY: Number(args.boxCenterY),
    innerH: Number(args.innerH),
    yNorm,
  });
  return owner?.index === args.segment.index;
}

export function resolveSketchBoxSegments(args: {
  dividers: SketchBoxDividerState[];
  boxCenterX: number;
  innerW: number;
  woodThick: number;
  horizontalDividers?: SketchBoxHorizontalDividerState[];
  boxCenterY?: number | null;
  innerH?: number | null;
  cursorY?: number | null;
  cursorX?: number | null;
  yNorm?: number | null;
  xNorm?: number | null;
}): SketchBoxSegmentState[] {
  const safeInnerW = readSafeSpan(args.innerW);
  const safeCenterX = readSafeCenter(args.boxCenterX);
  const safeWoodThick = readSafeWoodThick(args.woodThick);
  const leftX = safeCenterX - safeInnerW / 2;
  const rightX = safeCenterX + safeInnerW / 2;
  const dividerHalf = dividerHalfFor(safeInnerW, safeWoodThick);
  const horizontalDividers = Array.isArray(args.horizontalDividers) ? args.horizontalDividers : [];
  const verticalSegments =
    horizontalDividers.length &&
    Number.isFinite(Number(args.boxCenterY)) &&
    Number.isFinite(Number(args.innerH))
      ? resolveSketchBoxVerticalSegments({
          dividers: horizontalDividers,
          boxCenterY: Number(args.boxCenterY),
          innerH: Number(args.innerH),
          woodThick: safeWoodThick,
          verticalDividers: Array.isArray(args.dividers) ? args.dividers : [],
          boxCenterX: safeCenterX,
          innerW: safeInnerW,
          cursorX: args.cursorX,
          xNorm: args.xNorm,
        })
      : [];
  const activeVerticalSegment = verticalSegments.length
    ? pickSketchBoxVerticalSegment({
        segments: verticalSegments,
        boxCenterY: Number(args.boxCenterY),
        innerH: Number(args.innerH),
        cursorY: args.cursorY,
        yNorm: args.yNorm,
      })
    : null;
  const rowDividers = (Array.isArray(args.dividers) ? args.dividers : []).filter(divider =>
    verticalDividerBelongsToSegment({
      divider,
      segment: activeVerticalSegment,
      verticalSegments,
      boxCenterY: args.boxCenterY,
      innerH: args.innerH,
    })
  );
  const placements = resolveSketchBoxDividerPlacements({
    dividers: rowDividers,
    boxCenterX: safeCenterX,
    innerW: safeInnerW,
    woodThick: safeWoodThick,
  });
  const segments: SketchBoxSegmentState[] = [];
  const pushSegment = (segLeft: number, segRight: number) => {
    if (!(segRight > segLeft + SKETCH_BOX_DIMENSIONS.dividers.segmentEdgeEpsilonM)) return;
    const centerX = (segLeft + segRight) / 2;
    segments.push({
      index: segments.length,
      leftX: segLeft,
      rightX: segRight,
      centerX,
      width: segRight - segLeft,
      xNorm: Math.max(0, Math.min(1, (centerX - leftX) / safeInnerW)),
    });
  };
  let cursor = leftX;
  for (const placement of placements) {
    pushSegment(cursor, Math.max(cursor, Math.min(rightX, placement.centerX - dividerHalf)));
    cursor = Math.max(cursor, Math.min(rightX, placement.centerX + dividerHalf));
  }
  pushSegment(cursor, rightX);
  if (!segments.length) pushSegment(leftX, rightX);
  return segments;
}

export function pickSketchBoxSegment(args: {
  segments: SketchBoxSegmentState[];
  boxCenterX: number;
  innerW: number;
  cursorX?: number | null;
  xNorm?: number | null;
}): SketchBoxSegmentState | null {
  const segments = Array.isArray(args.segments) ? args.segments : [];
  if (!segments.length) return null;
  let targetX = NaN;
  const finiteCursorX = readFiniteNumber(args.cursorX);
  if (finiteCursorX != null) targetX = finiteCursorX;
  else {
    const norm = normalizeSketchBoxDividerXNorm(args.xNorm);
    if (norm != null)
      targetX =
        readSafeCenter(args.boxCenterX) - readSafeSpan(args.innerW) / 2 + norm * readSafeSpan(args.innerW);
  }
  if (!Number.isFinite(targetX)) return segments[0] || null;
  const eps = SKETCH_BOX_DIMENSIONS.dividers.pickEdgeEpsilonM;
  for (const segment of segments)
    if (targetX >= segment.leftX - eps && targetX <= segment.rightX + eps) return segment;
  return (
    segments.slice().sort((a, b) => Math.abs(a.centerX - targetX) - Math.abs(b.centerX - targetX))[0] || null
  );
}
