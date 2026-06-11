import { doAxisIntervalsOverlap } from './canvas_picking_sketch_free_box_shared.js';

export function resolveSketchFreeBoxOutsideWardrobePlacement(args: {
  centerX: number;
  centerY: number;
  boxW: number;
  boxH: number;
  wardrobeCenterX: number;
  wardrobeCenterY: number;
  wardrobeWidth: number;
  wardrobeHeight: number;
  roomFloorY: number;
}): { centerX: number; centerY: number; axis: 'x' | 'y' } | null {
  const centerX = Number(args.centerX);
  const centerY = Number(args.centerY);
  const boxW = Number(args.boxW);
  const boxH = Number(args.boxH);
  const wardrobeCenterX = Number(args.wardrobeCenterX);
  const wardrobeCenterY = Number(args.wardrobeCenterY);
  const wardrobeWidth = Number(args.wardrobeWidth);
  const wardrobeHeight = Number(args.wardrobeHeight);
  const roomFloorY = Number(args.roomFloorY);
  if (
    !Number.isFinite(centerX) ||
    !Number.isFinite(centerY) ||
    !Number.isFinite(boxW) ||
    !(boxW > 0) ||
    !Number.isFinite(boxH) ||
    !(boxH > 0) ||
    !Number.isFinite(wardrobeCenterX) ||
    !Number.isFinite(wardrobeCenterY) ||
    !Number.isFinite(wardrobeWidth) ||
    !(wardrobeWidth > 0) ||
    !Number.isFinite(wardrobeHeight) ||
    !(wardrobeHeight > 0)
  ) {
    return null;
  }

  const halfW = boxW / 2;
  const halfH = boxH / 2;
  const wardrobeMinX = wardrobeCenterX - wardrobeWidth / 2;
  const wardrobeMaxX = wardrobeCenterX + wardrobeWidth / 2;
  const wardrobeMinY = wardrobeCenterY - wardrobeHeight / 2;
  const wardrobeMaxY = wardrobeCenterY + wardrobeHeight / 2;
  const boxMinX = centerX - halfW;
  const boxMaxX = centerX + halfW;
  const boxMinY = centerY - halfH;
  const boxMaxY = centerY + halfH;

  if (
    !doAxisIntervalsOverlap(boxMinX, boxMaxX, wardrobeMinX, wardrobeMaxX) ||
    !doAxisIntervalsOverlap(boxMinY, boxMaxY, wardrobeMinY, wardrobeMaxY)
  ) {
    return null;
  }

  const centerInsideX = centerX > wardrobeMinX && centerX < wardrobeMaxX;
  const centerInsideY = centerY > wardrobeMinY && centerY < wardrobeMaxY;
  if (centerInsideX && centerInsideY) return null;

  const leftCenterX = wardrobeMinX - halfW;
  const rightCenterX = wardrobeMaxX + halfW;
  const bottomCenterY = roomFloorY + halfH;
  const topCenterY = wardrobeMaxY + halfH;

  const resolveXCenter = () => {
    if (!centerInsideX) return centerX <= wardrobeCenterX ? leftCenterX : rightCenterX;
    return Math.abs(centerX - leftCenterX) <= Math.abs(centerX - rightCenterX) ? leftCenterX : rightCenterX;
  };
  const resolveYCenter = () => {
    if (!centerInsideY) return centerY <= wardrobeCenterY ? bottomCenterY : topCenterY;
    return Math.abs(centerY - bottomCenterY) <= Math.abs(centerY - topCenterY) ? bottomCenterY : topCenterY;
  };

  if (!centerInsideX && centerInsideY) return { centerX: resolveXCenter(), centerY, axis: 'x' };
  if (centerInsideX && !centerInsideY) return { centerX, centerY: resolveYCenter(), axis: 'y' };

  const snappedX = resolveXCenter();
  const snappedY = resolveYCenter();
  const moveX = Math.abs(snappedX - centerX);
  const moveY = Math.abs(snappedY - centerY);
  if (moveX <= moveY) return { centerX: snappedX, centerY, axis: 'x' };
  return { centerX, centerY: snappedY, axis: 'y' };
}
