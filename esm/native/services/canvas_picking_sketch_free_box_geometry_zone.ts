import {
  SKETCH_BOX_FREE_REMOVE_POLICY,
  SKETCH_BOX_FREE_WALL_SNAP_POLICY,
} from '../../shared/dimensions/sketch_box_free_placement_policy.js';
import { asFiniteNumberOrNaN } from './canvas_picking_sketch_free_box_contracts.js';

export function resolveSketchFreeBoxOutsideWardrobeSnapX(args: {
  planeX: number;
  previewW: number;
  wardrobeCenterX: number;
  wardrobeWidth: number;
}): number | null {
  const planeX = asFiniteNumberOrNaN(args.planeX);
  const previewW = asFiniteNumberOrNaN(args.previewW);
  const wardrobeCenterX = asFiniteNumberOrNaN(args.wardrobeCenterX);
  const wardrobeWidth = asFiniteNumberOrNaN(args.wardrobeWidth);
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
  const wallBand = Math.max(
    SKETCH_BOX_FREE_WALL_SNAP_POLICY.wallSnapBandMinM,
    Math.min(
      SKETCH_BOX_FREE_WALL_SNAP_POLICY.wallSnapBandMaxM,
      previewW * SKETCH_BOX_FREE_WALL_SNAP_POLICY.wallSnapBandWidthRatio
    )
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
  const pointX = asFiniteNumberOrNaN(args.pointX);
  const pointY = asFiniteNumberOrNaN(args.pointY);
  const boxCenterX = asFiniteNumberOrNaN(args.boxCenterX);
  const boxCenterY = asFiniteNumberOrNaN(args.boxCenterY);
  const boxW = asFiniteNumberOrNaN(args.boxW);
  const boxH = asFiniteNumberOrNaN(args.boxH);
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

  const insetX = Math.min(
    halfW * SKETCH_BOX_FREE_REMOVE_POLICY.removeInsetHalfRatioMax,
    Math.max(
      SKETCH_BOX_FREE_REMOVE_POLICY.removeInsetMinM,
      Math.min(
        SKETCH_BOX_FREE_REMOVE_POLICY.removeInsetMaxM,
        boxW * SKETCH_BOX_FREE_REMOVE_POLICY.removeInsetRatio
      )
    )
  );
  const insetY = Math.min(
    halfH * SKETCH_BOX_FREE_REMOVE_POLICY.removeInsetHalfRatioMax,
    Math.max(
      SKETCH_BOX_FREE_REMOVE_POLICY.removeInsetMinM,
      Math.min(
        SKETCH_BOX_FREE_REMOVE_POLICY.removeInsetMaxM,
        boxH * SKETCH_BOX_FREE_REMOVE_POLICY.removeInsetRatio
      )
    )
  );
  const removeHalfW = Math.max(SKETCH_BOX_FREE_REMOVE_POLICY.removeHalfMinM, halfW - insetX);
  const removeHalfH = Math.max(SKETCH_BOX_FREE_REMOVE_POLICY.removeHalfMinM, halfH - insetY);
  return dx <= removeHalfW && dy <= removeHalfH;
}
