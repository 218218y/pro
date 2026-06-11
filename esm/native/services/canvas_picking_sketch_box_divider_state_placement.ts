import type {
  SketchBoxDividerState,
  SketchBoxHorizontalDividerState,
} from './canvas_picking_sketch_box_dividers_shared.js';
import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  normalizeSketchBoxDividerXNorm,
  normalizeSketchBoxDividerYNorm,
  readFiniteNumber,
} from './canvas_picking_sketch_box_dividers_shared.js';

type AxisPlacementArgs = {
  boxCenter: number;
  innerSpan: number;
  woodThick: number;
  cursor?: number | null;
  dividerNorm?: number | null;
  enableCenterSnap?: boolean;
};

function resolveAxisDividerPlacement(args: AxisPlacementArgs): {
  norm: number;
  center: number;
  centered: boolean;
} {
  const dividerDims = SKETCH_BOX_DIMENSIONS.dividers;
  const boxCenter = Number(args.boxCenter);
  const t =
    Number.isFinite(Number(args.woodThick)) && Number(args.woodThick) > 0
      ? Number(args.woodThick)
      : dividerDims.fallbackWoodThicknessM;
  const span =
    Number.isFinite(Number(args.innerSpan)) && Number(args.innerSpan) > 0
      ? Number(args.innerSpan)
      : Math.max(dividerDims.minInnerWidthM, t * 2 + dividerDims.minInnerWithWoodClearanceM);
  const minEdge = boxCenter - span / 2;
  const dividerHalf = Math.min(span / 2, Math.max(t / 2, dividerDims.dividerHalfMinM));
  const minCenter = boxCenter - span / 2 + dividerHalf;
  const maxCenter = boxCenter + span / 2 - dividerHalf;
  const finiteCursor = readFiniteNumber(args.cursor);
  const rawCenter =
    finiteCursor != null
      ? finiteCursor
      : minEdge + (args.dividerNorm ?? dividerDims.defaultCenterNorm) * span;
  const centerSnapEps = Math.min(
    dividerDims.centerSnapMaxM,
    Math.max(dividerDims.centerSnapMinM, span * dividerDims.centerSnapWidthRatio)
  );
  const snapToCenter = args.enableCenterSnap === true && Math.abs(rawCenter - boxCenter) <= centerSnapEps;
  const center =
    maxCenter > minCenter
      ? snapToCenter
        ? boxCenter
        : Math.max(minCenter, Math.min(maxCenter, rawCenter))
      : boxCenter;
  const norm = span > 0 ? Math.max(0, Math.min(1, (center - minEdge) / span)) : dividerDims.defaultCenterNorm;
  return {
    norm,
    center: Number.isFinite(center) ? center : 0,
    centered: Math.abs(center - boxCenter) <= dividerDims.centeredEpsilonM,
  };
}

export function resolveSketchBoxDividerPlacement(args: {
  boxCenterX: number;
  innerW: number;
  woodThick: number;
  cursorX?: number | null;
  dividerXNorm?: number | null;
  enableCenterSnap?: boolean;
}): { xNorm: number; centerX: number; centered: boolean } {
  const p = resolveAxisDividerPlacement({
    boxCenter: args.boxCenterX,
    innerSpan: args.innerW,
    woodThick: args.woodThick,
    cursor: args.cursorX,
    dividerNorm: normalizeSketchBoxDividerXNorm(args.dividerXNorm),
    enableCenterSnap: args.enableCenterSnap,
  });
  return { xNorm: p.norm, centerX: p.center, centered: p.centered };
}

export function resolveSketchBoxHorizontalDividerPlacement(args: {
  boxCenterY: number;
  innerH: number;
  woodThick: number;
  cursorY?: number | null;
  dividerYNorm?: number | null;
  enableCenterSnap?: boolean;
}): { yNorm: number; centerY: number; centered: boolean } {
  const p = resolveAxisDividerPlacement({
    boxCenter: args.boxCenterY,
    innerSpan: args.innerH,
    woodThick: args.woodThick,
    cursor: args.cursorY,
    dividerNorm: normalizeSketchBoxDividerYNorm(args.dividerYNorm),
    enableCenterSnap: args.enableCenterSnap,
  });
  return { yNorm: p.norm, centerY: p.center, centered: p.centered };
}

export function resolveSketchBoxDividerPlacements(args: {
  dividers: SketchBoxDividerState[];
  boxCenterX: number;
  innerW: number;
  woodThick: number;
}): Array<{ dividerId: string; xNorm: number; centerX: number; centered: boolean; yNorm?: number }> {
  return (Array.isArray(args.dividers) ? args.dividers : [])
    .map(divider => {
      const p = resolveSketchBoxDividerPlacement({
        boxCenterX: args.boxCenterX,
        innerW: args.innerW,
        woodThick: args.woodThick,
        dividerXNorm: divider.xNorm,
      });
      return {
        dividerId: divider.id,
        xNorm: p.xNorm,
        centerX: p.centerX,
        centered: p.centered,
        ...(Number.isFinite(Number(divider.yNorm)) ? { yNorm: Number(divider.yNorm) } : {}),
      };
    })
    .sort((a, b) => a.centerX - b.centerX);
}

export function resolveSketchBoxHorizontalDividerPlacements(args: {
  dividers: SketchBoxHorizontalDividerState[];
  boxCenterY: number;
  innerH: number;
  woodThick: number;
}): Array<{ dividerId: string; yNorm: number; centerY: number; centered: boolean; xNorm?: number }> {
  return (Array.isArray(args.dividers) ? args.dividers : [])
    .map(divider => {
      const p = resolveSketchBoxHorizontalDividerPlacement({
        boxCenterY: args.boxCenterY,
        innerH: args.innerH,
        woodThick: args.woodThick,
        dividerYNorm: divider.yNorm,
      });
      return {
        dividerId: divider.id,
        yNorm: p.yNorm,
        centerY: p.centerY,
        centered: p.centered,
        ...(Number.isFinite(Number(divider.xNorm)) ? { xNorm: Number(divider.xNorm) } : {}),
      };
    })
    .sort((a, b) => a.centerY - b.centerY);
}
