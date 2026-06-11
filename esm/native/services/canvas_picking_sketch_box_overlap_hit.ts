import type {
  PlacementBoxLike,
  RecordMap,
  ResolveSketchBoxGeometryFn,
} from './canvas_picking_sketch_box_overlap_shared.js';
import { readNumber } from './canvas_picking_sketch_box_overlap_records.js';
import { resolveModuleBoxes } from './canvas_picking_sketch_box_overlap_resolved_boxes.js';

export function findSketchModuleBoxHit(args: {
  boxes: unknown[];
  cursorX?: number | null;
  cursorY: number;
  bottomY: number;
  spanH: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  woodThick: number;
  resolveSketchBoxGeometry: ResolveSketchBoxGeometryFn;
}): {
  box: PlacementBoxLike & RecordMap;
  boxId: string;
  centerX: number;
  centerY: number;
  boxW: number;
  boxH: number;
  widthM: number | null;
  depthM: number | null;
  xNorm: number | null;
} | null {
  const cursorY = Number(args.cursorY);
  const cursorX = readNumber(args.cursorX);
  if (!Number.isFinite(cursorY)) return null;

  const resolved = resolveModuleBoxes(args);
  if (!resolved.length) return null;

  let best: (typeof resolved)[number] | null = null;
  let bestScore = Infinity;
  for (let i = 0; i < resolved.length; i++) {
    const candidate = resolved[i];
    const dx = cursorX != null ? Math.abs(cursorX - candidate.centerX) : 0;
    const dy = Math.abs(cursorY - candidate.centerY);
    const tolX = Math.max(0.02, Math.min(0.06, candidate.boxW * 0.18));
    const tolY = Math.max(0.02, Math.min(0.06, candidate.boxH * 0.18));
    if (dx > candidate.boxW / 2 + tolX) continue;
    if (dy > candidate.boxH / 2 + tolY) continue;
    const score =
      dy / Math.max(0.0001, candidate.boxH / 2 + tolY) +
      (dx / Math.max(0.0001, candidate.boxW / 2 + tolX)) * 0.35;
    if (score >= bestScore) continue;
    bestScore = score;
    best = candidate;
  }

  if (!best) return null;
  return {
    box: best.box,
    boxId: best.id,
    centerX: best.centerX,
    centerY: best.centerY,
    boxW: best.boxW,
    boxH: best.boxH,
    widthM: best.widthM,
    depthM: best.depthM,
    xNorm: best.xNorm,
  };
}
