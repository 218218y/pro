// Keep free boxes visually tight so grouped width labels stay truthful (e.g. 60 + 60 => 120),
// but still leave a tiny non-zero seam to avoid edge shimmer while dragging/snapping.
export function resolveSketchFreeBoxPlacementGap(args: { boxW: number; boxH: number }): number {
  const boxW = Number(args.boxW);
  const boxH = Number(args.boxH);
  const minSpan = Math.min(boxW, boxH);
  if (!Number.isFinite(minSpan) || !(minSpan > 0)) return 0.002;
  return Math.max(0.0015, Math.min(0.004, minSpan * 0.006));
}
