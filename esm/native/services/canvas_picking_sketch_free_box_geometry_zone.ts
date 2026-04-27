export function resolveSketchFreeBoxOutsideWardrobeSnapX(args: {
  planeX: number;
  previewW: number;
  wardrobeCenterX: number;
  wardrobeWidth: number;
}): number | null {
  const planeX = Number(args.planeX);
  const previewW = Number(args.previewW);
  const wardrobeCenterX = Number(args.wardrobeCenterX);
  const wardrobeWidth = Number(args.wardrobeWidth);
  if (
    !Number.isFinite(planeX) ||
    !Number.isFinite(previewW) ||
    !(previewW > 0) ||
    !Number.isFinite(wardrobeCenterX) ||
    !Number.isFinite(wardrobeWidth) ||
    !(wardrobeWidth > 0)
  ) {
    return null;
  }

  const wardrobeMinX = wardrobeCenterX - wardrobeWidth / 2;
  const wardrobeMaxX = wardrobeCenterX + wardrobeWidth / 2;
  const halfW = previewW / 2;
  const wallBand = Math.max(0.008, Math.min(0.03, previewW * 0.08));

  if (planeX <= wardrobeMinX + wallBand) return wardrobeMinX - halfW;
  if (planeX >= wardrobeMaxX - wallBand) return wardrobeMaxX + halfW;
  return null;
}

export function isWithinSketchFreeBoxRemoveZone(args: {
  pointX: number;
  pointY: number;
  boxCenterX: number;
  boxCenterY: number;
  boxW: number;
  boxH: number;
}): boolean {
  const pointX = Number(args.pointX);
  const pointY = Number(args.pointY);
  const boxCenterX = Number(args.boxCenterX);
  const boxCenterY = Number(args.boxCenterY);
  const boxW = Number(args.boxW);
  const boxH = Number(args.boxH);
  if (
    !Number.isFinite(pointX) ||
    !Number.isFinite(pointY) ||
    !Number.isFinite(boxCenterX) ||
    !Number.isFinite(boxCenterY) ||
    !Number.isFinite(boxW) ||
    !(boxW > 0) ||
    !Number.isFinite(boxH) ||
    !(boxH > 0)
  ) {
    return false;
  }

  const halfW = boxW / 2;
  const halfH = boxH / 2;
  const dx = Math.abs(pointX - boxCenterX);
  const dy = Math.abs(pointY - boxCenterY);
  if (dx > halfW || dy > halfH) return false;

  const insetX = Math.min(halfW * 0.45, Math.max(0.008, Math.min(0.025, boxW * 0.08)));
  const insetY = Math.min(halfH * 0.45, Math.max(0.008, Math.min(0.025, boxH * 0.08)));
  const removeHalfW = Math.max(0.012, halfW - insetX);
  const removeHalfH = Math.max(0.012, halfH - insetY);
  return dx <= removeHalfW && dy <= removeHalfH;
}
