import { SKETCH_BOX_SHELL_GEOMETRY_POLICY } from '../../shared/dimensions/sketch_box_geometry_policy.js';
import { asFiniteNumberOrNaN, asNumberOrNull } from './canvas_picking_sketch_free_box_contracts.js';

export function resolveSketchFreeBoxGeometry(args: {
  wardrobeWidth: number;
  wardrobeDepth: number;
  backZ: number;
  centerX: number;
  woodThick: number;
  widthM?: number | null;
  depthM?: number | null;
}): {
  outerW: number;
  innerW: number;
  centerX: number;
  outerD: number;
  innerD: number;
  centerZ: number;
  innerBackZ: number;
} {
  const wardrobeWidth = asFiniteNumberOrNaN(args.wardrobeWidth);
  const wardrobeDepth = asFiniteNumberOrNaN(args.wardrobeDepth);
  const backZ = asFiniteNumberOrNaN(args.backZ);
  const centerX = asFiniteNumberOrNaN(args.centerX);
  const woodThick = asFiniteNumberOrNaN(args.woodThick);
  const widthM = args.widthM;
  const depthM = args.depthM;
  const shellPolicy = SKETCH_BOX_SHELL_GEOMETRY_POLICY;

  const t = Number.isFinite(woodThick) && woodThick > 0 ? woodThick : shellPolicy.defaultWoodThicknessM;
  const minW = Math.max(shellPolicy.minOuterWidthM, t * 2 + shellPolicy.minInnerAdditiveClearanceM);
  const minD = Math.max(shellPolicy.minOuterDepthM, t + shellPolicy.minInnerAdditiveClearanceM);
  const fallbackW = Math.max(
    minW,
    Math.min(
      shellPolicy.defaultOuterWidthM,
      wardrobeWidth > 0 ? wardrobeWidth : shellPolicy.defaultOuterWidthM
    )
  );
  const fallbackD = Math.max(
    minD,
    Math.min(
      shellPolicy.defaultOuterDepthM,
      wardrobeDepth > 0 ? wardrobeDepth : shellPolicy.defaultOuterDepthM
    )
  );
  const widthValue = asNumberOrNull(widthM);
  const depthValue = asNumberOrNull(depthM);
  const outerW = widthValue != null && widthValue > 0 ? Math.max(minW, widthValue) : fallbackW;
  const outerD = depthValue != null && depthValue > 0 ? Math.max(minD, depthValue) : fallbackD;
  const innerW = Math.max(shellPolicy.minInnerDimensionM, outerW - 2 * t);
  const innerBackZ = backZ + Math.min(t, outerD);
  const innerD = Math.max(shellPolicy.minInnerDimensionM, outerD - Math.min(t, outerD));

  return {
    outerW,
    innerW,
    centerX: Number.isFinite(centerX) ? centerX : 0,
    outerD,
    innerD,
    centerZ: backZ + outerD / 2,
    innerBackZ,
  };
}
