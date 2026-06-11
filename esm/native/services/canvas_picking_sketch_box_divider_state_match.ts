import type {
  SketchBoxDividerState,
  SketchBoxHorizontalDividerState,
} from './canvas_picking_sketch_box_dividers_shared.js';
import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  resolveSketchBoxDividerPlacement,
  resolveSketchBoxHorizontalDividerPlacement,
} from './canvas_picking_sketch_box_divider_state_placement.js';
import {
  pickSketchBoxSegment,
  pickSketchBoxVerticalSegment,
  resolveSketchBoxSegments,
  resolveSketchBoxVerticalSegments,
} from './canvas_picking_sketch_box_segments.js';

export function findNearestSketchBoxDivider(args: {
  dividers: SketchBoxDividerState[];
  boxCenterX: number;
  innerW: number;
  woodThick: number;
  cursorX: number;
  horizontalDividers?: SketchBoxHorizontalDividerState[];
  boxCenterY?: number | null;
  innerH?: number | null;
  cursorY?: number | null;
}): { dividerId: string; xNorm: number; centerX: number; centered: boolean; yNorm?: number } | null {
  const dividers = Array.isArray(args.dividers) ? args.dividers : [];
  if (!dividers.length) return null;
  const safeInnerW = Number.isFinite(Number(args.innerW))
    ? Math.max(SKETCH_BOX_DIMENSIONS.dividers.minInnerWidthM, Number(args.innerW))
    : SKETCH_BOX_DIMENSIONS.dividers.minInnerWidthM;
  const removeEps = Math.max(
    SKETCH_BOX_DIMENSIONS.dividers.removeHitMinM,
    Math.min(
      SKETCH_BOX_DIMENSIONS.dividers.removeHitMaxM,
      safeInnerW * SKETCH_BOX_DIMENSIONS.dividers.removeHitWidthRatio
    )
  );
  const horizontalDividers = Array.isArray(args.horizontalDividers) ? args.horizontalDividers : [];
  const verticalSegments =
    horizontalDividers.length &&
    Number.isFinite(Number(args.boxCenterY)) &&
    Number.isFinite(Number(args.innerH))
      ? resolveSketchBoxVerticalSegments({
          dividers: horizontalDividers,
          boxCenterY: Number(args.boxCenterY),
          innerH: Number(args.innerH),
          woodThick: args.woodThick,
        })
      : [];
  const activeVerticalSegment = verticalSegments.length
    ? pickSketchBoxVerticalSegment({
        segments: verticalSegments,
        boxCenterY: Number(args.boxCenterY),
        innerH: Number(args.innerH),
        cursorY: args.cursorY,
      })
    : null;
  let best: { dividerId: string; xNorm: number; centerX: number; centered: boolean; yNorm?: number } | null =
    null;
  let bestDist = Infinity;
  for (const divider of dividers) {
    if (verticalSegments.length && activeVerticalSegment && divider.yNorm != null) {
      const owner = pickSketchBoxVerticalSegment({
        segments: verticalSegments,
        boxCenterY: Number(args.boxCenterY),
        innerH: Number(args.innerH),
        yNorm: divider.yNorm,
      });
      if (owner?.index !== activeVerticalSegment.index) continue;
    }
    const placement = resolveSketchBoxDividerPlacement({
      boxCenterX: args.boxCenterX,
      innerW: args.innerW,
      woodThick: args.woodThick,
      dividerXNorm: divider.xNorm,
    });
    const dx = Math.abs(Number(args.cursorX) - placement.centerX);
    if (dx > removeEps || dx >= bestDist) continue;
    bestDist = dx;
    best = {
      dividerId: divider.id,
      xNorm: placement.xNorm,
      centerX: placement.centerX,
      centered: placement.centered,
      ...(Number.isFinite(Number(divider.yNorm)) ? { yNorm: Number(divider.yNorm) } : {}),
    };
  }
  return best;
}

export function findNearestSketchBoxHorizontalDivider(args: {
  dividers: SketchBoxHorizontalDividerState[];
  boxCenterY: number;
  innerH: number;
  woodThick: number;
  cursorY: number;
  verticalDividers?: SketchBoxDividerState[];
  boxCenterX?: number | null;
  innerW?: number | null;
  cursorX?: number | null;
}): { dividerId: string; yNorm: number; centerY: number; centered: boolean; xNorm?: number } | null {
  const dividers = Array.isArray(args.dividers) ? args.dividers : [];
  if (!dividers.length) return null;
  const safeInnerH = Number.isFinite(Number(args.innerH))
    ? Math.max(SKETCH_BOX_DIMENSIONS.dividers.minInnerWidthM, Number(args.innerH))
    : SKETCH_BOX_DIMENSIONS.dividers.minInnerWidthM;
  const removeEps = Math.max(
    SKETCH_BOX_DIMENSIONS.dividers.removeHitMinM,
    Math.min(
      SKETCH_BOX_DIMENSIONS.dividers.removeHitMaxM,
      safeInnerH * SKETCH_BOX_DIMENSIONS.dividers.removeHitWidthRatio
    )
  );
  const verticalDividers = Array.isArray(args.verticalDividers) ? args.verticalDividers : [];
  const scopedDividers = dividers.filter(divider => Number.isFinite(Number(divider.xNorm)));
  const segments =
    scopedDividers.length &&
    verticalDividers.length &&
    Number.isFinite(Number(args.boxCenterX)) &&
    Number.isFinite(Number(args.innerW))
      ? resolveSketchBoxSegments({
          dividers: verticalDividers,
          boxCenterX: Number(args.boxCenterX),
          innerW: Number(args.innerW),
          woodThick: args.woodThick,
        })
      : [];
  const activeSegment = segments.length
    ? pickSketchBoxSegment({
        segments,
        boxCenterX: Number(args.boxCenterX),
        innerW: Number(args.innerW),
        cursorX: args.cursorX,
      })
    : null;
  let best: { dividerId: string; yNorm: number; centerY: number; centered: boolean; xNorm?: number } | null =
    null;
  let bestDist = Infinity;
  for (const divider of dividers) {
    if (segments.length && activeSegment && Number.isFinite(Number(divider.xNorm))) {
      const owner = pickSketchBoxSegment({
        segments,
        boxCenterX: Number(args.boxCenterX),
        innerW: Number(args.innerW),
        xNorm: Number(divider.xNorm),
      });
      if (owner?.index !== activeSegment.index) continue;
    }
    const placement = resolveSketchBoxHorizontalDividerPlacement({
      boxCenterY: args.boxCenterY,
      innerH: args.innerH,
      woodThick: args.woodThick,
      dividerYNorm: divider.yNorm,
    });
    const dy = Math.abs(Number(args.cursorY) - placement.centerY);
    if (dy > removeEps || dy >= bestDist) continue;
    bestDist = dy;
    best = {
      dividerId: divider.id,
      yNorm: placement.yNorm,
      centerY: placement.centerY,
      centered: placement.centered,
      ...(Number.isFinite(Number(divider.xNorm)) ? { xNorm: Number(divider.xNorm) } : {}),
    };
  }
  return best;
}
