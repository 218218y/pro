import { SKETCH_BOX_DIVIDER_GEOMETRY_POLICY } from '../../shared/dimensions/sketch_box_divider_policy.js';
import type {
  SketchBoxDividerState,
  SketchBoxHorizontalDividerState,
  SketchBoxSegmentState,
  SketchBoxVerticalSegmentState,
} from './canvas_picking_sketch_box_dividers_shared.js';
import {
  normalizeSketchBoxDividerOrder,
  normalizeSketchBoxDividerXNorm,
  normalizeSketchBoxDividerYNorm,
  readFiniteNumber,
} from './canvas_picking_sketch_box_dividers_shared.js';
import {
  resolveSketchBoxDividerPlacements,
  resolveSketchBoxHorizontalDividerPlacements,
} from './canvas_picking_sketch_box_divider_state_placement.js';

function readSafeSpan(value: unknown): number {
  const numberValue = readFiniteNumber(value);
  return numberValue != null
    ? Math.max(SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.minInnerWidthM, numberValue)
    : SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.minInnerWidthM;
}
function readSafeCenter(value: unknown): number {
  return readFiniteNumber(value) ?? 0;
}
function readSafeWoodThick(value: unknown): number {
  const numberValue = readFiniteNumber(value);
  return numberValue != null && numberValue > 0
    ? numberValue
    : SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.fallbackWoodThicknessM;
}
function dividerHalfFor(span: number, woodThick: number): number {
  return Math.min(span / 2, Math.max(woodThick / 2, SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.dividerHalfMinM));
}

function dividerPrecedesOrder(divider: { order?: number }, order: number): boolean {
  const dividerOrder = normalizeSketchBoxDividerOrder(divider.order);
  return dividerOrder == null || dividerOrder < order;
}

function resolveTargetX(args: {
  boxCenterX: number;
  innerW: number;
  cursorX?: number | null | undefined;
  xNorm?: number | null | undefined;
}): number | null {
  const cursorX = readFiniteNumber(args.cursorX);
  if (cursorX != null) return cursorX;
  const xNorm = normalizeSketchBoxDividerXNorm(args.xNorm);
  if (xNorm == null) return null;
  return args.boxCenterX - args.innerW / 2 + xNorm * args.innerW;
}

function segmentContainsX(segment: SketchBoxSegmentState | null, x: number | null): boolean {
  if (!segment || x == null) return false;
  const eps = SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.pickEdgeEpsilonM;
  return x >= segment.leftX - eps && x <= segment.rightX + eps;
}

function segmentContainsY(segment: SketchBoxVerticalSegmentState | null, y: number): boolean {
  if (!segment) return false;
  const eps = SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.pickEdgeEpsilonM;
  return y >= segment.bottomY - eps && y <= segment.topY + eps;
}

export function resolveSketchBoxVerticalSegments(args: {
  dividers: SketchBoxHorizontalDividerState[];
  boxCenterY: number;
  innerH: number;
  woodThick: number;
  verticalDividers?: SketchBoxDividerState[] | undefined;
  boxCenterX?: number | null | undefined;
  innerW?: number | null | undefined;
  cursorX?: number | null | undefined;
  xNorm?: number | null | undefined;
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
    boxCenterY: safeCenterY,
    innerH: safeInnerH,
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
    if (!(segTop > segBottom + SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.segmentEdgeEpsilonM)) return;
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
  boxCenterY: number;
  innerH: number;
  boxCenterX?: number | null | undefined;
  innerW?: number | null | undefined;
  cursorX?: number | null | undefined;
  xNorm?: number | null | undefined;
  woodThick: number;
}): SketchBoxHorizontalDividerState[] {
  const dividers = Array.isArray(args.dividers) ? args.dividers : [];
  const scopedDividers = dividers.filter(divider => normalizeSketchBoxDividerXNorm(divider.xNorm) != null);
  if (!scopedDividers.length) return dividers;
  if (
    !Array.isArray(args.verticalDividers) ||
    !args.verticalDividers.length ||
    readFiniteNumber(args.boxCenterX) == null ||
    readFiniteNumber(args.innerW) == null
  ) {
    return dividers.filter(divider => normalizeSketchBoxDividerXNorm(divider.xNorm) == null);
  }
  const boxCenterX = readFiniteNumber(args.boxCenterX);
  const innerW = readFiniteNumber(args.innerW);
  if (boxCenterX == null || innerW == null) {
    return dividers.filter(divider => normalizeSketchBoxDividerXNorm(divider.xNorm) == null);
  }
  const targetX = resolveTargetX({
    boxCenterX,
    innerW,
    cursorX: args.cursorX,
    xNorm: args.xNorm,
  });
  const segments = resolveSketchBoxSegments({
    dividers: args.verticalDividers,
    boxCenterX,
    innerW,
    woodThick: args.woodThick,
  });
  const activeSegment = pickSketchBoxSegment({
    segments,
    boxCenterX,
    innerW,
    cursorX: args.cursorX,
    xNorm: args.xNorm,
  });
  if (!activeSegment)
    return dividers.filter(divider => normalizeSketchBoxDividerXNorm(divider.xNorm) == null);
  return dividers.filter(divider => {
    const dividerXNorm = normalizeSketchBoxDividerXNorm(divider.xNorm);
    if (dividerXNorm == null) return true;
    const order = normalizeSketchBoxDividerOrder(divider.order);
    if (order != null) {
      const scope = resolveSketchBoxHorizontalDividerScopeSegment({
        divider,
        horizontalDividers: dividers,
        verticalDividers: args.verticalDividers,
        boxCenterX,
        innerW,
        boxCenterY: args.boxCenterY,
        innerH: args.innerH,
        woodThick: args.woodThick,
      });
      return segmentContainsX(scope, targetX);
    }
    const owner = pickSketchBoxSegment({
      segments,
      boxCenterX,
      innerW,
      xNorm: dividerXNorm,
    });
    return owner?.index === activeSegment.index;
  });
}

export function pickSketchBoxVerticalSegment(args: {
  segments: SketchBoxVerticalSegmentState[];
  boxCenterY: number;
  innerH: number;
  cursorY?: number | null | undefined;
  yNorm?: number | null | undefined;
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
  const eps = SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.pickEdgeEpsilonM;
  for (const segment of segments)
    if (targetY >= segment.bottomY - eps && targetY <= segment.topY + eps) return segment;
  return (
    segments.toSorted((a, b) => Math.abs(a.centerY - targetY) - Math.abs(b.centerY - targetY))[0] || null
  );
}

function verticalDividerBelongsToSegment(args: {
  divider: SketchBoxDividerState;
  segment: SketchBoxVerticalSegmentState | null;
  verticalSegments: SketchBoxVerticalSegmentState[];
  verticalDividers: SketchBoxDividerState[];
  horizontalDividers: SketchBoxHorizontalDividerState[];
  boxCenterX: number;
  innerW: number;
  woodThick: number;
  boxCenterY?: number | null | undefined;
  innerH?: number | null | undefined;
}): boolean {
  if (!args.verticalSegments.length || !args.segment) return true;
  const yNorm = normalizeSketchBoxDividerYNorm(args.divider.yNorm);
  if (yNorm == null) return true;
  const order = normalizeSketchBoxDividerOrder(args.divider.order);
  if (order != null) {
    const boxCenterY = readSafeCenter(args.boxCenterY);
    const innerH = readSafeSpan(args.innerH);
    const scope = resolveSketchBoxVerticalDividerScopeSegment({
      divider: args.divider,
      verticalDividers: args.verticalDividers,
      horizontalDividers: args.horizontalDividers,
      boxCenterX: args.boxCenterX,
      innerW: args.innerW,
      boxCenterY,
      innerH,
      woodThick: args.woodThick,
    });
    return segmentContainsY(scope, args.segment.centerY);
  }
  const owner = pickSketchBoxVerticalSegment({
    segments: args.verticalSegments,
    boxCenterY: readSafeCenter(args.boxCenterY),
    innerH: readSafeSpan(args.innerH),
    yNorm,
  });
  return owner?.index === args.segment.index;
}

export function resolveSketchBoxSegments(args: {
  dividers: SketchBoxDividerState[];
  boxCenterX: number;
  innerW: number;
  woodThick: number;
  horizontalDividers?: SketchBoxHorizontalDividerState[] | undefined;
  boxCenterY?: number | null | undefined;
  innerH?: number | null | undefined;
  cursorY?: number | null | undefined;
  cursorX?: number | null | undefined;
  yNorm?: number | null | undefined;
  xNorm?: number | null | undefined;
}): SketchBoxSegmentState[] {
  const safeInnerW = readSafeSpan(args.innerW);
  const safeCenterX = readSafeCenter(args.boxCenterX);
  const safeWoodThick = readSafeWoodThick(args.woodThick);
  const leftX = safeCenterX - safeInnerW / 2;
  const rightX = safeCenterX + safeInnerW / 2;
  const dividerHalf = dividerHalfFor(safeInnerW, safeWoodThick);
  const horizontalDividers = Array.isArray(args.horizontalDividers) ? args.horizontalDividers : [];
  const boxCenterY = readFiniteNumber(args.boxCenterY);
  const innerH = readFiniteNumber(args.innerH);
  const verticalSegments =
    horizontalDividers.length && boxCenterY != null && innerH != null
      ? resolveSketchBoxVerticalSegments({
          dividers: horizontalDividers,
          boxCenterY,
          innerH,
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
        boxCenterY: boxCenterY ?? 0,
        innerH: innerH ?? SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.minInnerWidthM,
        cursorY: args.cursorY,
        yNorm: args.yNorm,
      })
    : null;
  const rowDividers = (Array.isArray(args.dividers) ? args.dividers : []).filter(divider =>
    verticalDividerBelongsToSegment({
      divider,
      segment: activeVerticalSegment,
      verticalSegments,
      verticalDividers: Array.isArray(args.dividers) ? args.dividers : [],
      horizontalDividers,
      boxCenterX: safeCenterX,
      innerW: safeInnerW,
      woodThick: safeWoodThick,
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
    if (!(segRight > segLeft + SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.segmentEdgeEpsilonM)) return;
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
  cursorX?: number | null | undefined;
  xNorm?: number | null | undefined;
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
  const eps = SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.pickEdgeEpsilonM;
  for (const segment of segments)
    if (targetX >= segment.leftX - eps && targetX <= segment.rightX + eps) return segment;
  return (
    segments.toSorted((a, b) => Math.abs(a.centerX - targetX) - Math.abs(b.centerX - targetX))[0] || null
  );
}

export function resolveSketchBoxHorizontalDividerScopeSegment(args: {
  divider: SketchBoxHorizontalDividerState;
  horizontalDividers: SketchBoxHorizontalDividerState[];
  verticalDividers: SketchBoxDividerState[];
  boxCenterX: number;
  innerW: number;
  boxCenterY: number;
  innerH: number;
  woodThick: number;
}): SketchBoxSegmentState | null {
  const dividerXNorm = normalizeSketchBoxDividerXNorm(args.divider.xNorm);
  if (dividerXNorm == null) return null;
  const order = normalizeSketchBoxDividerOrder(args.divider.order);
  const verticalDividers = Array.isArray(args.verticalDividers) ? args.verticalDividers : [];
  const horizontalDividers = Array.isArray(args.horizontalDividers) ? args.horizontalDividers : [];
  const priorVerticalDividers =
    order == null
      ? verticalDividers
      : verticalDividers.filter(divider => dividerPrecedesOrder(divider, order));
  const priorHorizontalDividers =
    order == null
      ? []
      : horizontalDividers.filter(
          divider => divider.id !== args.divider.id && dividerPrecedesOrder(divider, order)
        );
  const segments = resolveSketchBoxSegments({
    dividers: priorVerticalDividers,
    horizontalDividers: priorHorizontalDividers,
    boxCenterX: args.boxCenterX,
    innerW: args.innerW,
    boxCenterY: args.boxCenterY,
    innerH: args.innerH,
    woodThick: args.woodThick,
    yNorm: args.divider.yNorm,
    xNorm: dividerXNorm,
  });
  return pickSketchBoxSegment({
    segments,
    boxCenterX: args.boxCenterX,
    innerW: args.innerW,
    xNorm: dividerXNorm,
  });
}

export function resolveSketchBoxVerticalDividerScopeSegment(args: {
  divider: SketchBoxDividerState;
  verticalDividers: SketchBoxDividerState[];
  horizontalDividers: SketchBoxHorizontalDividerState[];
  boxCenterX: number;
  innerW: number;
  boxCenterY: number;
  innerH: number;
  woodThick: number;
}): SketchBoxVerticalSegmentState | null {
  const dividerYNorm = normalizeSketchBoxDividerYNorm(args.divider.yNorm);
  if (dividerYNorm == null) return null;
  const order = normalizeSketchBoxDividerOrder(args.divider.order);
  const verticalDividers = Array.isArray(args.verticalDividers) ? args.verticalDividers : [];
  const horizontalDividers = Array.isArray(args.horizontalDividers) ? args.horizontalDividers : [];
  const priorVerticalDividers =
    order == null
      ? verticalDividers
      : verticalDividers.filter(divider => dividerPrecedesOrder(divider, order));
  const priorHorizontalDividers =
    order == null
      ? horizontalDividers
      : horizontalDividers.filter(divider => dividerPrecedesOrder(divider, order));
  const segments = resolveSketchBoxVerticalSegments({
    dividers: priorHorizontalDividers,
    boxCenterY: args.boxCenterY,
    innerH: args.innerH,
    woodThick: args.woodThick,
    verticalDividers: priorVerticalDividers,
    boxCenterX: args.boxCenterX,
    innerW: args.innerW,
    xNorm: args.divider.xNorm,
  });
  return pickSketchBoxVerticalSegment({
    segments,
    boxCenterY: args.boxCenterY,
    innerH: args.innerH,
    yNorm: dividerYNorm,
  });
}
