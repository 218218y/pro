function clampToRange(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return value;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return value;
  if (!(max >= min)) return Math.max(min, Math.min(max, value));
  return Math.max(min, Math.min(max, value));
}

export function resolveSketchFreeSoftAttachAxisCenter(args: {
  rawCenter: number;
  targetCenter: number;
  targetSpan: number;
  previewSpan: number;
}): { center: number; snapped: boolean } {
  const rawCenter = Number(args.rawCenter);
  const targetCenter = Number(args.targetCenter);
  const targetSpan = Number(args.targetSpan);
  const previewSpan = Number(args.previewSpan);
  if (
    !Number.isFinite(rawCenter) ||
    !Number.isFinite(targetCenter) ||
    !Number.isFinite(targetSpan) ||
    !(targetSpan > 0) ||
    !Number.isFinite(previewSpan) ||
    !(previewSpan > 0)
  ) {
    return { center: rawCenter, snapped: false };
  }

  const hardMaxOffset = Math.max(0, targetSpan / 2 + previewSpan / 2);
  const snapEps = Math.max(0.012, Math.min(0.04, Math.min(targetSpan, previewSpan) * 0.15));
  const snapped = Math.abs(rawCenter - targetCenter) <= snapEps;
  if (!(hardMaxOffset > 0)) {
    return { center: targetCenter, snapped: true };
  }
  return {
    center: snapped
      ? targetCenter
      : clampToRange(rawCenter, targetCenter - hardMaxOffset, targetCenter + hardMaxOffset),
    snapped,
  };
}
