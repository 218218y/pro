import type { InteriorValueRecord } from './render_interior_ops_contracts.js';
import type { SketchExternalDrawerFaceVerticalAlignment } from './render_interior_sketch_shared_types.js';
import { toFiniteNumber } from './render_interior_sketch_shared_numbers.js';

export function applySketchExternalDrawerFaceOverrides(
  drawers: InteriorValueRecord[],
  faceWValue: unknown,
  faceOffsetXValue: unknown,
  frontZValue: unknown
): void {
  const faceW = toFiniteNumber(faceWValue);
  const faceOffsetX = toFiniteNumber(faceOffsetXValue);
  const frontZ = toFiniteNumber(frontZValue);

  if (faceW != null && faceW > 0) {
    for (let i = 0; i < drawers.length; i++) {
      const drawer = drawers[i];
      if (!drawer) continue;
      drawer.faceW = faceW;
      if (faceOffsetX != null) drawer.faceOffsetX = faceOffsetX;
      if (frontZ != null) drawer.frontZ = frontZ;
    }
    return;
  }

  if (frontZ == null && faceOffsetX == null) return;

  for (let i = 0; i < drawers.length; i++) {
    const drawer = drawers[i];
    if (!drawer) continue;
    if (frontZ != null) drawer.frontZ = frontZ;
    if (faceOffsetX != null) drawer.faceOffsetX = faceOffsetX;
  }
}

export function resolveSketchExternalDrawerDoorFaceTopY(effectiveTopY: number, woodThick: number): number {
  const topY = Number(effectiveTopY);
  const thick = Number(woodThick);
  if (!Number.isFinite(topY)) return 0;

  // Module hinged doors are built against `effectiveTopLimit`, which is half a board
  // above the module's inner top (`effectiveTopY`). The drawer stack itself is clamped
  // to the inner top so shelves and boxes still obey the internal cabinet envelope, but
  // the external drawer front must grow to the same outer front envelope as the adjacent
  // door. Do not subtract the 4mm render-mesh shrink here: the visual/outline contract and
  // cut metadata use the full front envelope, and subtracting it leaves a snapped-top
  // sketch drawer visibly lower than the neighboring door.
  const doorFaceTopY = Number.isFinite(thick) && thick > 0 ? topY + thick / 2 : topY;
  return Number.isFinite(doorFaceTopY) && doorFaceTopY > topY ? doorFaceTopY : topY;
}

export function resolveSketchExternalDrawerFaceVerticalAlignment(args: {
  drawerIndex: number;
  drawerCount: number;
  centerY: number;
  visualH: number;
  stackMinY: number;
  stackMaxY: number;
  containerMinY: number;
  containerMaxY: number;
  flushTargetMinY?: number;
  flushTargetMaxY?: number;
  epsilon?: number;
}): SketchExternalDrawerFaceVerticalAlignment {
  const visualH = Number.isFinite(args.visualH) && args.visualH > 0 ? args.visualH : 0;
  const centerY = Number.isFinite(args.centerY) ? args.centerY : 0;
  const epsilon =
    typeof args.epsilon === 'number' && Number.isFinite(args.epsilon) && args.epsilon >= 0
      ? args.epsilon
      : 0.003;
  const drawerIndex = Math.max(0, Math.floor(args.drawerIndex));
  const drawerCount = Math.max(1, Math.floor(args.drawerCount));
  const isBottomDrawer = drawerIndex === 0;
  const isTopDrawer = drawerIndex === drawerCount - 1;
  const stackMinY = Number(args.stackMinY);
  const stackMaxY = Number(args.stackMaxY);
  const containerMinY = Number(args.containerMinY);
  const containerMaxY = Number(args.containerMaxY);
  const flushBottom =
    isBottomDrawer &&
    Number.isFinite(stackMinY) &&
    Number.isFinite(containerMinY) &&
    Math.abs(stackMinY - containerMinY) <= epsilon;
  const flushTop =
    isTopDrawer &&
    Number.isFinite(stackMaxY) &&
    Number.isFinite(containerMaxY) &&
    Math.abs(stackMaxY - containerMaxY) <= epsilon;
  const currentMinY = centerY - visualH / 2;
  const currentMaxY = centerY + visualH / 2;
  const flushTargetMinY = Number(args.flushTargetMinY);
  const flushTargetMaxY = Number(args.flushTargetMaxY);
  const targetMinY = Number.isFinite(flushTargetMinY) ? flushTargetMinY : containerMinY;
  const targetMaxY = Number.isFinite(flushTargetMaxY) ? flushTargetMaxY : containerMaxY;
  const minY = flushBottom ? targetMinY : currentMinY;
  const maxY = flushTop ? targetMaxY : currentMaxY;
  const height = maxY - minY;
  if (!(height > 0.012)) {
    return {
      height: visualH,
      offsetY: 0,
      minY: currentMinY,
      maxY: currentMaxY,
      flushBottom: false,
      flushTop: false,
    };
  }
  return {
    height,
    offsetY: (minY + maxY) / 2 - centerY,
    minY,
    maxY,
    flushBottom,
    flushTop,
  };
}
