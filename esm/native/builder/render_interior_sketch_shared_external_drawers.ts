import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { InteriorValueRecord } from './render_interior_ops_contracts.js';
import type { SketchExternalDrawerFaceVerticalAlignment } from './render_interior_sketch_shared_types.js';
import { toFiniteNumber } from './render_interior_sketch_shared_numbers.js';
import { asValueRecord } from './render_interior_sketch_shared_records.js';

export function resolveSketchExternalDrawerDoorMountMode(input: unknown): 'overlay' | 'inset' {
  const root = asValueRecord(input);
  const cfgSnapshot = asValueRecord(root?.cfgSnapshot);
  return cfgSnapshot?.doorMountMode === 'inset' ? 'inset' : 'overlay';
}

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
  const topY = toFiniteNumber(effectiveTopY);
  const thick = toFiniteNumber(woodThick);
  if (topY == null) return 0;

  // Module hinged doors are built against `effectiveTopLimit`, which is half a board
  // above the module's inner top (`effectiveTopY`). The drawer stack itself is clamped
  // to the inner top so shelves and boxes still obey the internal cabinet envelope, but
  // the external drawer front must grow to the same outer front envelope as the adjacent
  // door. Do not subtract the 4mm render-mesh shrink here: the visual/outline contract and
  // cut metadata use the full front envelope, and subtracting it leaves a snapped-top
  // sketch drawer visibly lower than the neighboring door.
  const doorFaceTopY = thick != null && thick > 0 ? topY + thick / 2 : topY;
  return doorFaceTopY > topY ? doorFaceTopY : topY;
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
  const visualHRaw = toFiniteNumber(args.visualH);
  const centerYRaw = toFiniteNumber(args.centerY);
  const visualH = visualHRaw != null && visualHRaw > 0 ? visualHRaw : 0;
  const centerY = centerYRaw ?? 0;
  const epsilon =
    typeof args.epsilon === 'number' && Number.isFinite(args.epsilon) && args.epsilon >= 0
      ? args.epsilon
      : DRAWER_DIMENSIONS.sketch.faceVerticalAlignmentEpsilonM;
  const drawerIndexRaw = toFiniteNumber(args.drawerIndex);
  const drawerCountRaw = toFiniteNumber(args.drawerCount);
  const drawerIndex = Math.max(0, Math.floor(drawerIndexRaw ?? 0));
  const drawerCount = Math.max(1, Math.floor(drawerCountRaw ?? 1));
  const isBottomDrawer = drawerIndex === 0;
  const isTopDrawer = drawerIndex === drawerCount - 1;
  const stackMinY = toFiniteNumber(args.stackMinY);
  const stackMaxY = toFiniteNumber(args.stackMaxY);
  const containerMinY = toFiniteNumber(args.containerMinY);
  const containerMaxY = toFiniteNumber(args.containerMaxY);
  const flushBottom =
    isBottomDrawer &&
    stackMinY != null &&
    containerMinY != null &&
    Math.abs(stackMinY - containerMinY) <= epsilon;
  const flushTop =
    isTopDrawer &&
    stackMaxY != null &&
    containerMaxY != null &&
    Math.abs(stackMaxY - containerMaxY) <= epsilon;
  const currentMinY = centerY - visualH / 2;
  const currentMaxY = centerY + visualH / 2;
  const flushTargetMinY = toFiniteNumber(args.flushTargetMinY);
  const flushTargetMaxY = toFiniteNumber(args.flushTargetMaxY);
  const targetMinY = flushTargetMinY ?? containerMinY ?? currentMinY;
  const targetMaxY = flushTargetMaxY ?? containerMaxY ?? currentMaxY;
  const minY = flushBottom ? targetMinY : currentMinY;
  const maxY = flushTop ? targetMaxY : currentMaxY;
  const height = maxY - minY;
  if (!(height > DRAWER_DIMENSIONS.sketch.faceVerticalAlignmentMinHeightM)) {
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
