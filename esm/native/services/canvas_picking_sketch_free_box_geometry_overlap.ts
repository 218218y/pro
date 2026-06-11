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
  const centerX = Number(args.centerX);
  const boxW = Number(args.boxW);
  const wardrobeCenterX = Number(args.wardrobeCenterX);
  const wardrobeWidth = Number(args.wardrobeWidth);
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

  const boxH = Number(args.boxH);
  const centerY = Number(args.centerY);
  const wardrobeCenterY = Number(args.wardrobeCenterY);
  const wardrobeHeight = Number(args.wardrobeHeight);
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
