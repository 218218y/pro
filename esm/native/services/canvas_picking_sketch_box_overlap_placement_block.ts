import type { ResolveSketchBoxGeometryFn } from './canvas_picking_sketch_box_overlap_contracts.js';
import { collectOverlaps } from './canvas_picking_sketch_box_overlap_geometry.js';
import { resolveModuleBoxes } from './canvas_picking_sketch_box_overlap_resolved_boxes.js';

export function isSketchModuleBoxPlacementBlocked(args: {
  boxes: unknown[];
  centerX: number;
  centerY: number;
  boxW: number;
  boxH: number;
  bottomY: number;
  spanH: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  woodThick: number;
  resolveSketchBoxGeometry: ResolveSketchBoxGeometryFn;
  ignoreBoxId?: unknown;
}): boolean {
  const resolved = resolveModuleBoxes(args);
  if (!resolved.length) return false;
  return (
    collectOverlaps({
      centerX: Number(args.centerX),
      centerY: Number(args.centerY),
      boxW: Number(args.boxW),
      boxH: Number(args.boxH),
      boxes: resolved,
      gap: 0,
    }).length > 0
  );
}
