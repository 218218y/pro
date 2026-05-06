import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
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
  const dims = SKETCH_BOX_DIMENSIONS.freePlacement;
  const wallBand = Math.max(
    dims.wallSnapBandMinM,
    Math.min(dims.wallSnapBandMaxM, previewW * dims.wallSnapBandWidthRatio)
  );

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

  const dims = SKETCH_BOX_DIMENSIONS.freePlacement;
  const insetX = Math.min(
    halfW * dims.removeInsetHalfRatioMax,
    Math.max(dims.removeInsetMinM, Math.min(dims.removeInsetMaxM, boxW * dims.removeInsetRatio))
  );
  const insetY = Math.min(
    halfH * dims.removeInsetHalfRatioMax,
    Math.max(dims.removeInsetMinM, Math.min(dims.removeInsetMaxM, boxH * dims.removeInsetRatio))
  );
  const removeHalfW = Math.max(dims.removeHalfMinM, halfW - insetX);
  const removeHalfH = Math.max(dims.removeHalfMinM, halfH - insetY);
  return dx <= removeHalfW && dy <= removeHalfH;
}
