import type {
  SketchBoxDividerState,
  SketchBoxHorizontalDividerState,
} from './canvas_picking_sketch_box_dividers_shared.js';
import {
  SKETCH_BOX_DIVIDER_GEOMETRY_POLICY,
  SKETCH_BOX_DIVIDER_SNAP_POLICY,
} from '../../shared/dimensions/sketch_box_divider_policy.js';
import {
  normalizeSketchBoxDividerXNorm,
  normalizeSketchBoxDividerYNorm,
  readFiniteNumber,
} from './canvas_picking_sketch_box_dividers_shared.js';

type AxisPlacementArgs = {
  boxCenter: number;
  innerSpan: number;
  woodThick: number;
  cursor?: number | null | undefined;
  dividerNorm?: number | null | undefined;
  enableCenterSnap?: boolean | undefined;
};

function resolveAxisDividerPlacement(args: AxisPlacementArgs): {
  norm: number;
  center: number;
  centered: boolean;
} {
  const boxCenter = Number(args.boxCenter);
  const t =
    Number.isFinite(Number(args.woodThick)) && Number(args.woodThick) > 0
      ? Number(args.woodThick)
      : SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.fallbackWoodThicknessM;
  const span =
    Number.isFinite(Number(args.innerSpan)) && Number(args.innerSpan) > 0
      ? Number(args.innerSpan)
      : Math.max(
          SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.minInnerWidthM,
          t * 2 + SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.minInnerWithWoodClearanceM
        );
  const minEdge = boxCenter - span / 2;
  const dividerHalf = Math.min(span / 2, Math.max(t / 2, SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.dividerHalfMinM));
  const minCenter = boxCenter - span / 2 + dividerHalf;
  const maxCenter = boxCenter + span / 2 - dividerHalf;
  const finiteCursor = readFiniteNumber(args.cursor);
  const rawCenter =
    finiteCursor != null
      ? finiteCursor
      : minEdge + (args.dividerNorm ?? SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.defaultCenterNorm) * span;
  const centerSnapEps = Math.min(
    SKETCH_BOX_DIVIDER_SNAP_POLICY.centerSnapMaxM,
    Math.max(
      SKETCH_BOX_DIVIDER_SNAP_POLICY.centerSnapMinM,
      span * SKETCH_BOX_DIVIDER_SNAP_POLICY.centerSnapWidthRatio
    )
  );
  const snapToCenter = args.enableCenterSnap === true && Math.abs(rawCenter - boxCenter) <= centerSnapEps;
  const center =
    maxCenter > minCenter
      ? snapToCenter
        ? boxCenter
        : Math.max(minCenter, Math.min(maxCenter, rawCenter))
      : boxCenter;
  const norm =
    span > 0
      ? Math.max(0, Math.min(1, (center - minEdge) / span))
      : SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.defaultCenterNorm;
  return {
    norm,
    center: Number.isFinite(center) ? center : 0,
    centered: Math.abs(center - boxCenter) <= SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.centeredEpsilonM,
  };
}

export function resolveSketchBoxDividerPlacement(args: {
  boxCenterX: number;
  innerW: number;
  woodThick: number;
  cursorX?: number | null | undefined;
  dividerXNorm?: number | null | undefined;
  enableCenterSnap?: boolean | undefined;
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
  cursorY?: number | null | undefined;
  dividerYNorm?: number | null | undefined;
  enableCenterSnap?: boolean | undefined;
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
