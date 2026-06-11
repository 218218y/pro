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

  const t = Number.isFinite(woodThick) && woodThick > 0 ? woodThick : 0.018;
  const minW = Math.max(0.05, t * 2 + 0.02);
  const minD = Math.max(0.05, t + 0.02);
  const fallbackW = Math.max(minW, Math.min(0.6, wardrobeWidth > 0 ? wardrobeWidth : 0.6));
  const fallbackD = Math.max(minD, Math.min(0.45, wardrobeDepth > 0 ? wardrobeDepth : 0.45));
  const widthValue = asNumberOrNull(widthM);
  const depthValue = asNumberOrNull(depthM);
  const outerW = widthValue != null && widthValue > 0 ? Math.max(minW, widthValue) : fallbackW;
  const outerD = depthValue != null && depthValue > 0 ? Math.max(minD, depthValue) : fallbackD;
  const innerW = Math.max(0.02, outerW - 2 * t);
  const innerBackZ = backZ + Math.min(t, outerD);
  const innerD = Math.max(0.02, outerD - Math.min(t, outerD));

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
