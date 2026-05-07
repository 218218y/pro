import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type {
  SketchBoxDividerState,
  SketchBoxSegmentState,
} from './canvas_picking_sketch_box_dividers_shared.js';
import {
  normalizeSketchBoxDividerXNorm,
  readFiniteNumber,
} from './canvas_picking_sketch_box_dividers_shared.js';
import { resolveSketchBoxDividerPlacements } from './canvas_picking_sketch_box_divider_state.js';

export function resolveSketchBoxSegments(args: {
  dividers: SketchBoxDividerState[];
  boxCenterX: number;
  innerW: number;
  woodThick: number;
}): SketchBoxSegmentState[] {
  const safeInnerW = Number.isFinite(Number(args.innerW))
    ? Math.max(SKETCH_BOX_DIMENSIONS.dividers.minInnerWidthM, Number(args.innerW))
    : SKETCH_BOX_DIMENSIONS.dividers.minInnerWidthM;
  const safeCenterX = Number.isFinite(Number(args.boxCenterX)) ? Number(args.boxCenterX) : 0;
  const safeWoodThick =
    Number.isFinite(Number(args.woodThick)) && Number(args.woodThick) > 0
      ? Number(args.woodThick)
      : SKETCH_BOX_DIMENSIONS.dividers.fallbackWoodThicknessM;
  const leftX = safeCenterX - safeInnerW / 2;
  const rightX = safeCenterX + safeInnerW / 2;
  const dividerHalf = Math.min(
    safeInnerW / 2,
    Math.max(safeWoodThick / 2, SKETCH_BOX_DIMENSIONS.dividers.dividerHalfMinM)
  );
  const placements = resolveSketchBoxDividerPlacements(args);
  const segments: SketchBoxSegmentState[] = [];
  const pushSegment = (segLeft: number, segRight: number) => {
    if (!(segRight > segLeft + SKETCH_BOX_DIMENSIONS.dividers.segmentEdgeEpsilonM)) return;
    const centerX = (segLeft + segRight) / 2;
    const xNorm =
      safeInnerW > 0
        ? Math.max(0, Math.min(1, (centerX - leftX) / safeInnerW))
        : SKETCH_BOX_DIMENSIONS.dividers.defaultCenterNorm;
    segments.push({
      index: segments.length,
      leftX: segLeft,
      rightX: segRight,
      centerX,
      width: segRight - segLeft,
      xNorm,
    });
  };

  let cursor = leftX;
  for (let i = 0; i < placements.length; i++) {
    const placement = placements[i];
    const segRight = Math.max(cursor, Math.min(rightX, placement.centerX - dividerHalf));
    pushSegment(cursor, segRight);
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
  if (finiteCursorX != null) {
    targetX = finiteCursorX;
  } else {
    const norm = normalizeSketchBoxDividerXNorm(args.xNorm);
    if (norm != null) {
      const safeInnerW = Number.isFinite(Number(args.innerW))
        ? Math.max(SKETCH_BOX_DIMENSIONS.dividers.minInnerWidthM, Number(args.innerW))
        : SKETCH_BOX_DIMENSIONS.dividers.minInnerWidthM;
      const safeCenterX = Number.isFinite(Number(args.boxCenterX)) ? Number(args.boxCenterX) : 0;
      targetX = safeCenterX - safeInnerW / 2 + norm * safeInnerW;
    }
  }

  if (!Number.isFinite(targetX)) return segments[0] || null;

  const edgeEps = SKETCH_BOX_DIMENSIONS.dividers.pickEdgeEpsilonM;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (targetX >= segment.leftX - edgeEps && targetX <= segment.rightX + edgeEps) return segment;
  }

  let best = segments[0] || null;
  let bestDist = Infinity;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const dx = Math.abs(targetX - segment.centerX);
    if (dx < bestDist) {
      bestDist = dx;
      best = segment;
    }
  }
  return best;
}
