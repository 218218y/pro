import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { asNumberOrNull } from './canvas_picking_sketch_free_box_contracts.js';

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
  const wardrobeWidth = Number(args.wardrobeWidth);
  const wardrobeDepth = Number(args.wardrobeDepth);
  const backZ = Number(args.backZ);
  const centerX = Number(args.centerX);
  const woodThick = Number(args.woodThick);
  const widthM = args.widthM;
  const depthM = args.depthM;
  const dims = SKETCH_BOX_DIMENSIONS.geometry;

  const t = Number.isFinite(woodThick) && woodThick > 0 ? woodThick : dims.defaultWoodThicknessM;
  const minW = Math.max(dims.minOuterWidthM, t * 2 + dims.minInnerAdditiveClearanceM);
  const minD = Math.max(dims.minOuterDepthM, t + dims.minInnerAdditiveClearanceM);
  const fallbackW = Math.max(
    minW,
    Math.min(dims.defaultOuterWidthM, wardrobeWidth > 0 ? wardrobeWidth : dims.defaultOuterWidthM)
  );
  const fallbackD = Math.max(
    minD,
    Math.min(dims.defaultOuterDepthM, wardrobeDepth > 0 ? wardrobeDepth : dims.defaultOuterDepthM)
  );
  const widthValue = asNumberOrNull(widthM);
  const depthValue = asNumberOrNull(depthM);
  const outerW = widthValue != null && widthValue > 0 ? Math.max(minW, widthValue) : fallbackW;
  const outerD = depthValue != null && depthValue > 0 ? Math.max(minD, depthValue) : fallbackD;
  const innerW = Math.max(dims.minInnerDimensionM, outerW - 2 * t);
  const innerBackZ = backZ + Math.min(t, outerD);
  const innerD = Math.max(dims.minInnerDimensionM, outerD - Math.min(t, outerD));

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
