import type { SketchBoxDividerState } from './canvas_picking_sketch_box_dividers_shared.js';
import { resolveSketchBoxDividerPlacement } from './canvas_picking_sketch_box_divider_state_placement.js';

export function findNearestSketchBoxDivider(args: {
  dividers: SketchBoxDividerState[];
  boxCenterX: number;
  innerW: number;
  woodThick: number;
  cursorX: number;
}): { dividerId: string; xNorm: number; centerX: number; centered: boolean } | null {
  const dividers = Array.isArray(args.dividers) ? args.dividers : [];
  if (!dividers.length) return null;
  const safeInnerW = Number.isFinite(Number(args.innerW)) ? Math.max(0.02, Number(args.innerW)) : 0.02;
  const removeEps = Math.max(0.018, Math.min(0.05, safeInnerW * 0.08));
  let best: { dividerId: string; xNorm: number; centerX: number; centered: boolean } | null = null;
  let bestDist = Infinity;
  for (let i = 0; i < dividers.length; i++) {
    const divider = dividers[i];
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
    };
  }
  return best;
}
