import { toFiniteNumber, toPositiveNumber, toNormalizedUnit } from './render_interior_sketch_shared.js';

export const normalizeSketchShelfVariant = (variant: unknown): 'regular' | 'double' | 'glass' | 'brace' => {
  const raw = variant == null ? '' : String(variant || '');
  const v = raw.trim().toLowerCase();
  return v === 'double' || v === 'glass' || v === 'brace' || v === 'regular' ? v : 'regular';
};

export const resolveSketchBoxGeometry = (args: {
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  woodThick: number;
  widthM?: number | null;
  depthM?: number | null;
  xNorm?: number | null;
}) => {
  const innerW = Number(args.innerW);
  const internalDepth = Number(args.internalDepth);
  const internalCenterX = Number(args.internalCenterX);
  const internalZ = Number(args.internalZ);
  const woodThick = Number(args.woodThick);
  const widthM = args.widthM;
  const depthM = args.depthM;
  const xNormArg = args.xNorm;

  const t = Number.isFinite(woodThick) && woodThick > 0 ? woodThick : 0.018;
  const maxW = Number.isFinite(innerW) && innerW > 0 ? innerW : 0.05;
  const baseDepth = Number.isFinite(internalDepth) && internalDepth > 0 ? internalDepth : 0.05;
  const minW = Math.min(maxW, Math.max(0.05, t * 2 + 0.02));
  const minD = Math.max(0.05, t + 0.02);
  const clampTo = (value: number, min: number, max: number) =>
    Math.max(Math.min(min, max), Math.min(max, value));

  const widthValue = toPositiveNumber(widthM);
  const depthValue = toPositiveNumber(depthM);
  const outerW = widthValue != null ? clampTo(widthValue, minW, maxW) : maxW;
  const outerD = depthValue != null ? Math.max(minD, depthValue) : baseDepth;

  const leftX = internalCenterX - maxW / 2;
  const xNormBase = clampTo(toNormalizedUnit(xNormArg), 0, 1);
  const rawCenterX = leftX + xNormBase * maxW;
  const centerMinX = internalCenterX - maxW / 2 + outerW / 2;
  const centerMaxX = internalCenterX + maxW / 2 - outerW / 2;
  const centerX =
    centerMaxX > centerMinX ? Math.max(centerMinX, Math.min(centerMaxX, rawCenterX)) : internalCenterX;
  const backZ = internalZ - baseDepth / 2;
  const centerZ = backZ + outerD / 2;
  const innerWidth = Math.max(0.02, outerW - 2 * t);
  const innerBackZ = backZ + Math.min(t, outerD);
  const innerDepth = Math.max(0.02, outerD - Math.min(t, outerD));

  return {
    outerW,
    innerW: innerWidth,
    centerX: Number.isFinite(centerX) ? centerX : Number.isFinite(internalCenterX) ? internalCenterX : 0,
    outerD,
    centerZ,
    innerBackZ,
    innerD: innerDepth,
  };
};

export const resolveSketchFreeBoxGeometry = (args: {
  wardrobeWidth: number;
  wardrobeDepth: number;
  backZ: number;
  centerX: number;
  woodThick: number;
  widthM?: number | null;
  depthM?: number | null;
}) => {
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
  const widthValue = toPositiveNumber(widthM);
  const depthValue = toPositiveNumber(depthM);
  const outerW = widthValue != null ? Math.max(minW, widthValue) : fallbackW;
  const outerD = depthValue != null ? Math.max(minD, depthValue) : fallbackD;
  const innerWidth = Math.max(0.02, outerW - 2 * t);
  const innerBackZ = backZ + Math.min(t, outerD);
  const innerDepth = Math.max(0.02, outerD - Math.min(t, outerD));

  return {
    outerW,
    innerW: innerWidth,
    centerX: Number.isFinite(centerX) ? centerX : 0,
    outerD,
    centerZ: backZ + outerD / 2,
    innerBackZ,
    innerD: innerDepth,
  };
};

export const getSketchFreePlacementVerticalSlack = (wardrobeHeight: number) => {
  const height = Number(wardrobeHeight);
  if (!Number.isFinite(height) || !(height > 0)) return 0.45;
  return Math.max(0.45, Math.min(1.35, height * 0.75));
};

export const clampSketchFreeBoxCenterY = (args: {
  centerY: number;
  boxH: number;
  wardrobeCenterY: number;
  wardrobeHeight: number;
  pad?: number;
}) => {
  const centerY = Number(args.centerY);
  const boxH = Number(args.boxH);
  const wardrobeCenterY = Number(args.wardrobeCenterY);
  const wardrobeHeight = Number(args.wardrobeHeight);
  const pad = toFiniteNumber(args.pad) ?? 0;
  if (!Number.isFinite(centerY) || !Number.isFinite(boxH) || !(boxH > 0)) return centerY;
  if (!Number.isFinite(wardrobeCenterY) || !Number.isFinite(wardrobeHeight) || !(wardrobeHeight > 0))
    return centerY;

  const halfH = boxH / 2;
  const roomFloorY = 0;
  const wardrobeFloorY = wardrobeCenterY - wardrobeHeight / 2;
  const ceilingY = wardrobeCenterY + wardrobeHeight / 2;
  const slack = getSketchFreePlacementVerticalSlack(wardrobeHeight);
  const lo = Math.max(roomFloorY + pad + halfH, wardrobeFloorY - slack + pad + halfH);
  const hi = ceilingY + slack - pad - halfH;
  if (!(hi > lo)) return Math.max(lo, centerY);
  return Math.max(lo, Math.min(hi, centerY));
};
