import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

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

  const dims = SKETCH_BOX_DIMENSIONS.freePlacement;
  const previewHalfW = previewW / 2;
  const previewHalfH = previewH / 2;
  const minOverlap = Math.max(
    dims.attachIntentMinOverlapMinM,
    Math.min(
      dims.attachIntentMinOverlapMaxM,
      Math.min(Math.min(targetHalfW * 2, targetHalfH * 2), Math.min(previewW, previewH)) *
        dims.attachIntentMinOverlapRatio
    )
  );
  const allowedDxForVertical = Math.max(0, targetHalfW + previewHalfW - minOverlap);
  const allowedDyForHorizontal = Math.max(0, targetHalfH + previewHalfH - minOverlap);
  const edgeDistX = Math.abs(dx - targetHalfW);
  const edgeDistY = Math.abs(dy - targetHalfH);
  const edgeBand = Math.max(
    dims.attachIntentEdgeBandMinM,
    Math.min(
      dims.attachIntentEdgeBandMaxM,
      Math.min(targetHalfW, targetHalfH, previewHalfW, previewHalfH) * dims.attachIntentEdgeBandRatio
    )
  );
  const edgeDominance = Math.max(
    dims.attachIntentEdgeDominanceMinM,
    Math.min(
      dims.attachIntentEdgeDominanceMaxM,
      Math.min(previewW, previewH) * dims.attachIntentEdgeDominanceRatio
    )
  );
  const withinVerticalCorridor = dx <= allowedDxForVertical + edgeBand;
  const withinHorizontalCorridor = dy <= allowedDyForHorizontal + edgeBand;

  if (withinVerticalCorridor && edgeDistY <= edgeBand && edgeDistY + edgeDominance < edgeDistX) return 'y';
  if (withinHorizontalCorridor && edgeDistX <= edgeBand && edgeDistX + edgeDominance < edgeDistY) return 'x';

  const outsideX = Math.max(0, dx - targetHalfW);
  const outsideY = Math.max(0, dy - targetHalfH);
  const outsideBias = Math.max(
    dims.attachIntentOutsideBiasMinM,
    Math.min(
      dims.attachIntentOutsideBiasMaxM,
      Math.min(previewW, previewH) * dims.attachIntentOutsideBiasRatio
    )
  );
  if (outsideX > 0 && !(outsideY > 0)) return 'x';
  if (outsideY > 0 && !(outsideX > 0)) return 'y';
  if (outsideX > 0 && outsideY > 0) {
    if (Math.abs(outsideX - outsideY) > outsideBias) return outsideX < outsideY ? 'x' : 'y';
    return null;
  }

  const edgeBias = Math.max(
    dims.attachIntentEdgeBiasMinM,
    Math.min(
      dims.attachIntentEdgeBiasMaxM,
      Math.min(targetHalfW, targetHalfH) * dims.attachIntentEdgeBiasRatio
    )
  );
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
  const dims = SKETCH_BOX_DIMENSIONS.freePlacement;
  const bias = Math.max(
    dims.attachIntentScoreBiasMinM,
    Math.min(dims.attachIntentScoreBiasMaxM, Math.max(previewW, previewH) * dims.attachIntentScoreBiasRatio)
  );
  return score + bias;
}
