import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

// Keep free boxes visually tight so grouped width labels stay truthful (e.g. 60 + 60 => 120),
// but still leave a tiny non-zero seam to avoid edge shimmer while dragging/snapping.
export function resolveSketchFreeBoxPlacementGap(args: { boxW: number; boxH: number }): number {
  const boxW = Number(args.boxW);
  const boxH = Number(args.boxH);
  const minSpan = Math.min(boxW, boxH);
  const dims = SKETCH_BOX_DIMENSIONS.freePlacement;
  if (!Number.isFinite(minSpan) || !(minSpan > 0)) return dims.placementGapFallbackM;
  return Math.max(dims.placementGapMinM, Math.min(dims.placementGapMaxM, minSpan * dims.placementGapRatio));
}
