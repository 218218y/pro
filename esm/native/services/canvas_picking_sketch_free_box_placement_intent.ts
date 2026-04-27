export function resolveSketchFreeAttachIntent(args: {
  dx: number;
  dy: number;
  targetHalfW: number;
  targetHalfH: number;
  previewW: number;
  previewH: number;
}): 'x' | 'y' | null {
  const dx = Math.abs(Number(args.dx));
  const dy = Math.abs(Number(args.dy));
  const targetHalfW = Number(args.targetHalfW);
  const targetHalfH = Number(args.targetHalfH);
  const previewW = Number(args.previewW);
  const previewH = Number(args.previewH);
  if (
    !Number.isFinite(dx) ||
    !Number.isFinite(dy) ||
    !Number.isFinite(targetHalfW) ||
    !(targetHalfW > 0) ||
    !Number.isFinite(targetHalfH) ||
    !(targetHalfH > 0) ||
    !Number.isFinite(previewW) ||
    !(previewW > 0) ||
    !Number.isFinite(previewH) ||
    !(previewH > 0)
  ) {
    return null;
  }

  const previewHalfW = previewW / 2;
  const previewHalfH = previewH / 2;
  const minOverlap = Math.max(
    0.012,
    Math.min(0.04, Math.min(Math.min(targetHalfW * 2, targetHalfH * 2), Math.min(previewW, previewH)) * 0.18)
  );
  const allowedDxForVertical = Math.max(0, targetHalfW + previewHalfW - minOverlap);
  const allowedDyForHorizontal = Math.max(0, targetHalfH + previewHalfH - minOverlap);
  const edgeDistX = Math.abs(dx - targetHalfW);
  const edgeDistY = Math.abs(dy - targetHalfH);
  const edgeBand = Math.max(
    0.018,
    Math.min(0.07, Math.min(targetHalfW, targetHalfH, previewHalfW, previewHalfH) * 0.55)
  );
  const edgeDominance = Math.max(0.01, Math.min(0.045, Math.min(previewW, previewH) * 0.18));
  const withinVerticalCorridor = dx <= allowedDxForVertical + edgeBand;
  const withinHorizontalCorridor = dy <= allowedDyForHorizontal + edgeBand;

  if (withinVerticalCorridor && edgeDistY <= edgeBand && edgeDistY + edgeDominance < edgeDistX) return 'y';
  if (withinHorizontalCorridor && edgeDistX <= edgeBand && edgeDistX + edgeDominance < edgeDistY) return 'x';

  const outsideX = Math.max(0, dx - targetHalfW);
  const outsideY = Math.max(0, dy - targetHalfH);
  const outsideBias = Math.max(0.008, Math.min(0.03, Math.min(previewW, previewH) * 0.12));
  if (outsideX > 0 && !(outsideY > 0)) return 'x';
  if (outsideY > 0 && !(outsideX > 0)) return 'y';
  if (outsideX > 0 && outsideY > 0) {
    if (Math.abs(outsideX - outsideY) > outsideBias) return outsideX < outsideY ? 'x' : 'y';
    return null;
  }

  const edgeBias = Math.max(0.008, Math.min(0.03, Math.min(targetHalfW, targetHalfH) * 0.18));
  if (Math.abs(edgeDistX - edgeDistY) > edgeBias) return edgeDistX < edgeDistY ? 'x' : 'y';
  return null;
}

export function addSketchFreeAttachIntentBias(args: {
  score: number;
  fixedAxis: 'x' | 'y';
  preferredFixedAxis: 'x' | 'y' | null;
  previewW: number;
  previewH: number;
}): number {
  const score = Number(args.score);
  const preferredFixedAxis = args.preferredFixedAxis;
  if (!Number.isFinite(score) || !preferredFixedAxis || args.fixedAxis === preferredFixedAxis) return score;
  const previewW = Number(args.previewW);
  const previewH = Number(args.previewH);
  const bias = Math.max(0.06, Math.min(0.24, Math.max(previewW, previewH) * 0.5));
  return score + bias;
}
