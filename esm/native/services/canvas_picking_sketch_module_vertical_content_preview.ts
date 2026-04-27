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
  const GLASS_THICK_M = 0.018;
  const h = variant === 'glass' ? GLASS_THICK_M : isDouble ? Math.max(woodThick, woodThick * 2) : woodThick;
  let d = isBrace ? internalDepth : regularDepth;
  if (shelfDepthOverrideM != null && Number.isFinite(shelfDepthOverrideM) && shelfDepthOverrideM > 0) {
    let depth = shelfDepthOverrideM;
    if (depth < woodThick) depth = woodThick;
    if (Number.isFinite(internalDepth) && internalDepth > 0) depth = Math.min(depth, internalDepth);
    d = depth;
  }
  return {
    variant,
    w: innerW > 0 ? Math.max(0, innerW - (isBrace ? 0.002 : 0.014)) : innerW,
    h,
    d,
    z: backZ + d / 2,
  };
}
