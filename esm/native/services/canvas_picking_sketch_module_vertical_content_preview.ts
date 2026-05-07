import {
  INTERIOR_FITTINGS_DIMENSIONS,
  MATERIAL_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';

export function createSketchModuleShelfPreviewGeometry(args: {
  innerW: number;
  internalDepth: number;
  backZ: number;
  woodThick: number;
  regularDepth: number;
  variant: string | null;
  shelfDepthOverrideM?: number | null;
}): {
  variant: string;
  w: number;
  h: number;
  d: number;
  z: number;
} {
  const { innerW, internalDepth, backZ, woodThick, regularDepth, shelfDepthOverrideM } = args;
  const variant = args.variant || 'double';
  const isBrace = variant === 'brace';
  const isDouble = variant === 'double' || !variant;
  const GLASS_THICK_M = MATERIAL_DIMENSIONS.glassShelf.thicknessM;
  const shelfDims = INTERIOR_FITTINGS_DIMENSIONS.shelves;
  const h =
    variant === 'glass'
      ? GLASS_THICK_M
      : isDouble
        ? Math.max(woodThick, woodThick * shelfDims.doubleThicknessMultiplier)
        : woodThick;
  let d = isBrace ? internalDepth : regularDepth;
  if (shelfDepthOverrideM != null && Number.isFinite(shelfDepthOverrideM) && shelfDepthOverrideM > 0) {
    let depth = shelfDepthOverrideM;
    if (depth < woodThick) depth = woodThick;
    if (Number.isFinite(internalDepth) && internalDepth > 0) depth = Math.min(depth, internalDepth);
    d = depth;
  }
  return {
    variant,
    w:
      innerW > 0
        ? Math.max(0, innerW - (isBrace ? shelfDims.braceWidthClearanceM : shelfDims.regularWidthClearanceM))
        : innerW,
    h,
    d,
    z: backZ + d / 2,
  };
}
