import { SKETCH_BOX_FREE_PLACEMENT_GAP_POLICY } from '../../shared/dimensions/sketch_box_free_placement_policy.js';
import { asFiniteNumberOrNaN } from './canvas_picking_sketch_free_box_contracts.js';

// Keep free boxes visually tight so grouped width labels stay truthful (e.g. 60 + 60 => 120),
// but still leave a tiny non-zero seam to avoid edge shimmer while dragging/snapping.
export function resolveSketchFreeBoxPlacementGap(args: { boxW: number; boxH: number }): number {
  const boxW = asFiniteNumberOrNaN(args.boxW);
  const boxH = asFiniteNumberOrNaN(args.boxH);
  const minSpan = Math.min(boxW, boxH);
  if (!Number.isFinite(minSpan) || !(minSpan > 0)) {
    return SKETCH_BOX_FREE_PLACEMENT_GAP_POLICY.placementGapDefaultM;
  }
  return Math.max(
    SKETCH_BOX_FREE_PLACEMENT_GAP_POLICY.placementGapMinM,
    Math.min(
      SKETCH_BOX_FREE_PLACEMENT_GAP_POLICY.placementGapMaxM,
      minSpan * SKETCH_BOX_FREE_PLACEMENT_GAP_POLICY.placementGapRatio
    )
  );
}
