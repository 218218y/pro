import type { SketchBoxDividerState } from './canvas_picking_sketch_box_dividers_shared.js';
import {
  normalizeSketchBoxDividerXNorm,
  readFiniteNumber,
} from './canvas_picking_sketch_box_dividers_shared.js';

export function resolveSketchBoxDividerPlacement(args: {
  boxCenterX: number;
  innerW: number;
  woodThick: number;
  cursorX?: number | null;
  dividerXNorm?: number | null;
  enableCenterSnap?: boolean;
}): { xNorm: number; centerX: number; centered: boolean } {
  const boxCenterX = Number(args.boxCenterX);
  const innerW = Number(args.innerW);
  const woodThick = Number(args.woodThick);
  const cursorX = args.cursorX;
  const dividerXNorm = args.dividerXNorm;
  const enableCenterSnap = args.enableCenterSnap === true;

  const t = Number.isFinite(woodThick) && woodThick > 0 ? woodThick : 0.018;
  const spanW = Number.isFinite(innerW) && innerW > 0 ? innerW : Math.max(0.02, t * 2 + 0.02);
  const leftX = boxCenterX - spanW / 2;
  const clampTo = (value: number, min: number, max: number) =>
    Math.max(Math.min(min, max), Math.min(max, value));
  const dividerHalf = Math.min(spanW / 2, Math.max(t / 2, 0.006));
  const minX = boxCenterX - spanW / 2 + dividerHalf;
  const maxX = boxCenterX + spanW / 2 - dividerHalf;
  const normalizedDividerXNorm = normalizeSketchBoxDividerXNorm(dividerXNorm);
  const xNormBase = normalizedDividerXNorm != null ? normalizedDividerXNorm : 0.5;
  const finiteCursorX = readFiniteNumber(cursorX);
  const rawCenterX = finiteCursorX != null ? finiteCursorX : leftX + xNormBase * spanW;
  const centerSnapEps = Math.min(0.035, Math.max(0.012, spanW * 0.07));
  const snapToCenter = enableCenterSnap && Math.abs(rawCenterX - boxCenterX) <= centerSnapEps;
  const centerX =
    maxX > minX ? (snapToCenter ? boxCenterX : Math.max(minX, Math.min(maxX, rawCenterX))) : boxCenterX;
  const xNorm = spanW > 0 ? clampTo((centerX - leftX) / spanW, 0, 1) : 0.5;

  return {
    xNorm,
    centerX: Number.isFinite(centerX) ? centerX : Number.isFinite(boxCenterX) ? boxCenterX : 0,
    centered: Math.abs(centerX - boxCenterX) <= 0.001,
  };
}

export function resolveSketchBoxDividerPlacements(args: {
  dividers: SketchBoxDividerState[];
  boxCenterX: number;
  innerW: number;
  woodThick: number;
}): Array<{ dividerId: string; xNorm: number; centerX: number; centered: boolean }> {
  const dividers = Array.isArray(args.dividers) ? args.dividers : [];
  const placements: Array<{ dividerId: string; xNorm: number; centerX: number; centered: boolean }> = [];
  for (let i = 0; i < dividers.length; i++) {
    const divider = dividers[i];
    const placement = resolveSketchBoxDividerPlacement({
      boxCenterX: args.boxCenterX,
      innerW: args.innerW,
      woodThick: args.woodThick,
      dividerXNorm: divider.xNorm,
    });
    placements.push({
      dividerId: divider.id,
      xNorm: placement.xNorm,
      centerX: placement.centerX,
      centered: placement.centered,
    });
  }
  return placements.sort((a, b) => a.centerX - b.centerX);
}
