import { asFiniteNumberOrNaN } from './canvas_picking_sketch_free_box_contracts.js';

export function doAxisIntervalsOverlap(minA: number, maxA: number, minB: number, maxB: number): boolean {
  return maxA > minB && minA < maxB;
}

export function doesSketchFreeBoxPartiallyOverlapWardrobe(args: {
  centerX: number;
  boxW: number;
  wardrobeCenterX: number;
  wardrobeWidth: number;
  centerY?: number;
  boxH?: number;
  wardrobeCenterY?: number;
  wardrobeHeight?: number;
}): boolean {
  const centerX = asFiniteNumberOrNaN(args.centerX);
  const boxW = asFiniteNumberOrNaN(args.boxW);
  const wardrobeCenterX = asFiniteNumberOrNaN(args.wardrobeCenterX);
  const wardrobeWidth = asFiniteNumberOrNaN(args.wardrobeWidth);
  if (
    !Number.isFinite(centerX) ||
    !Number.isFinite(boxW) ||
    !(boxW > 0) ||
    !Number.isFinite(wardrobeCenterX) ||
    !Number.isFinite(wardrobeWidth) ||
    !(wardrobeWidth > 0)
  ) {
    return false;
  }

  const boxMinX = centerX - boxW / 2;
  const boxMaxX = centerX + boxW / 2;
  const wardrobeMinX = wardrobeCenterX - wardrobeWidth / 2;
  const wardrobeMaxX = wardrobeCenterX + wardrobeWidth / 2;
  const overlapsWardrobeX = doAxisIntervalsOverlap(boxMinX, boxMaxX, wardrobeMinX, wardrobeMaxX);
  if (!overlapsWardrobeX) return false;

  const boxH = asFiniteNumberOrNaN(args.boxH);
  const centerY = asFiniteNumberOrNaN(args.centerY);
  const wardrobeCenterY = asFiniteNumberOrNaN(args.wardrobeCenterY);
  const wardrobeHeight = asFiniteNumberOrNaN(args.wardrobeHeight);
  if (
    !Number.isFinite(boxH) ||
    !(boxH > 0) ||
    !Number.isFinite(centerY) ||
    !Number.isFinite(wardrobeCenterY) ||
    !Number.isFinite(wardrobeHeight) ||
    !(wardrobeHeight > 0)
  ) {
    const fullyInsideWardrobeX = boxMinX >= wardrobeMinX && boxMaxX <= wardrobeMaxX;
    return !fullyInsideWardrobeX;
  }

  const boxMinY = centerY - boxH / 2;
  const boxMaxY = centerY + boxH / 2;
  const wardrobeMinY = wardrobeCenterY - wardrobeHeight / 2;
  const wardrobeMaxY = wardrobeCenterY + wardrobeHeight / 2;
  const overlapsWardrobeY = doAxisIntervalsOverlap(boxMinY, boxMaxY, wardrobeMinY, wardrobeMaxY);
  if (!overlapsWardrobeY) return false;

  const fullyInsideWardrobeX = boxMinX >= wardrobeMinX && boxMaxX <= wardrobeMaxX;
  const fullyInsideWardrobeY = boxMinY >= wardrobeMinY && boxMaxY <= wardrobeMaxY;
  if (fullyInsideWardrobeX && fullyInsideWardrobeY) return false;

  return true;
}
