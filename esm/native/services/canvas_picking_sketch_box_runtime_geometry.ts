import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { readSketchBoxFiniteNumber } from './canvas_picking_sketch_box_runtime_shared.js';

export function resolveSketchBoxGeometry(args: {
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  woodThick: number;
  widthM?: number | null;
  depthM?: number | null;
  xNorm?: number | null;
  centerXHint?: number | null;
  enableCenterSnap?: boolean;
}): {
  outerW: number;
  innerW: number;
  centerX: number;
  xNorm: number;
  centered: boolean;
  outerD: number;
  innerD: number;
  centerZ: number;
  innerCenterZ: number;
  innerBackZ: number;
} {
  const innerW = Number(args.innerW);
  const internalDepth = Number(args.internalDepth);
  const internalCenterX = Number(args.internalCenterX);
  const internalZ = Number(args.internalZ);
  const woodThick = Number(args.woodThick);
  const widthM = args.widthM;
  const depthM = args.depthM;
  const xNormArg = args.xNorm;
  const centerXHint = args.centerXHint;
  const enableCenterSnap = args.enableCenterSnap === true;

  const dims = SKETCH_BOX_DIMENSIONS.geometry;
  const t = Number.isFinite(woodThick) && woodThick > 0 ? woodThick : dims.defaultWoodThicknessM;
  const maxW = Number.isFinite(innerW) && innerW > 0 ? innerW : dims.minOuterWidthM;
  const baseDepth = Number.isFinite(internalDepth) && internalDepth > 0 ? internalDepth : dims.minOuterDepthM;
  const minW = Math.min(maxW, Math.max(dims.minOuterWidthM, t * 2 + dims.minInnerAdditiveClearanceM));
  const minD = Math.max(dims.minOuterDepthM, t + dims.minInnerAdditiveClearanceM);
  const clampTo = (value: number, min: number, max: number) =>
    Math.max(Math.min(min, max), Math.min(max, value));

  const resolvedWidthM = readSketchBoxFiniteNumber(widthM);
  const resolvedDepthM = readSketchBoxFiniteNumber(depthM);
  const resolvedXNorm = readSketchBoxFiniteNumber(xNormArg);
  const resolvedCenterXHint = readSketchBoxFiniteNumber(centerXHint);

  const outerW = resolvedWidthM != null && resolvedWidthM > 0 ? clampTo(resolvedWidthM, minW, maxW) : maxW;
  const outerD = resolvedDepthM != null && resolvedDepthM > 0 ? Math.max(minD, resolvedDepthM) : baseDepth;

  const innerWidth = Math.max(dims.minInnerDimensionM, outerW - 2 * t);
  const leftX = internalCenterX - maxW / 2;
  const xNormBase = resolvedXNorm != null ? clampTo(resolvedXNorm, 0, 1) : 0.5;
  const rawCenterX = resolvedCenterXHint != null ? resolvedCenterXHint : leftX + xNormBase * maxW;
  const centerMinX = internalCenterX - maxW / 2 + outerW / 2;
  const centerMaxX = internalCenterX + maxW / 2 - outerW / 2;
  const centerSnapEps = Math.min(
    dims.centerSnapMaxM,
    Math.max(dims.centerSnapMinM, maxW * dims.centerSnapWidthRatio)
  );
  const snapToCenter = enableCenterSnap && Math.abs(rawCenterX - internalCenterX) <= centerSnapEps;
  const centerX =
    centerMaxX > centerMinX
      ? snapToCenter
        ? internalCenterX
        : Math.max(centerMinX, Math.min(centerMaxX, rawCenterX))
      : internalCenterX;
  const xNorm = maxW > 0 ? clampTo((centerX - leftX) / maxW, 0, 1) : 0.5;
  const backZ = internalZ - baseDepth / 2;
  const centerZ = backZ + outerD / 2;
  const innerBackZ = backZ + Math.min(t, outerD);
  const innerDepth = Math.max(dims.minInnerDimensionM, outerD - Math.min(t, outerD));
  const innerCenterZ = innerBackZ + innerDepth / 2;

  return {
    outerW,
    innerW: innerWidth,
    centerX: Number.isFinite(centerX) ? centerX : Number.isFinite(internalCenterX) ? internalCenterX : 0,
    xNorm,
    centered: Math.abs(centerX - internalCenterX) <= dims.centeredEpsilonM,
    outerD,
    innerD: innerDepth,
    centerZ,
    innerCenterZ,
    innerBackZ,
  };
}
