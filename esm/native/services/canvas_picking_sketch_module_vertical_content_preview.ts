import { INTERIOR_SHELF_GEOMETRY_POLICY } from '../../shared/dimensions/interior_fittings_policy.js';
import { MATERIAL_THICKNESS_POLICY } from '../../shared/dimensions/material_thickness_policy.js';

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
  const GLASS_THICK_M = MATERIAL_THICKNESS_POLICY.glassShelf.thicknessM;
  const shelfDims = INTERIOR_SHELF_GEOMETRY_POLICY;
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
