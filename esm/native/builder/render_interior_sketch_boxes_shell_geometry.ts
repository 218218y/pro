import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  clampSketchFreeBoxCenterY,
  resolveSketchBoxGeometry,
  resolveSketchFreeBoxGeometry,
} from './render_interior_sketch_layout.js';

import type {
  ResolvedSketchBoxShellGeometry,
  ResolveSketchBoxShellGeometryArgs,
} from './render_interior_sketch_boxes_shell_types.js';

function resolveSketchBoxPlacementClampPad(woodThick: number): number {
  const geometryDims = SKETCH_BOX_DIMENSIONS.geometry;
  return Math.min(
    geometryDims.placementClampPadMaxM,
    Math.max(geometryDims.placementClampPadMinM, woodThick * geometryDims.placementClampPadWoodRatio)
  );
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readPositiveNumber(value: unknown): number | null {
  const n = readFiniteNumber(value);
  return n != null && n > 0 ? n : null;
}

export function resolveSketchBoxShellGeometry(
  args: ResolveSketchBoxShellGeometryArgs
): ResolvedSketchBoxShellGeometry | null {
  const { box, isFreePlacement, height, renderArgs, freeWardrobeBox } = args;
  const {
    effectiveBottomY,
    effectiveTopY,
    spanH,
    innerW,
    woodThick,
    internalDepth,
    internalCenterX,
    internalZ,
    clampY,
  } = renderArgs;
  const halfH = height / 2;
  const widthM = readPositiveNumber(box.widthM);
  const depthM = readPositiveNumber(box.depthM);

  if (isFreePlacement) {
    const absX = readFiniteNumber(box.absX);
    const absY = readFiniteNumber(box.absY);
    if (absX == null || absY == null) return null;
    const freeCenterY = freeWardrobeBox ? readFiniteNumber(freeWardrobeBox.centerY) : null;
    const freeCenterZ = freeWardrobeBox ? readFiniteNumber(freeWardrobeBox.centerZ) : null;
    const freeWidth = freeWardrobeBox ? readPositiveNumber(freeWardrobeBox.width) : null;
    const freeHeight = freeWardrobeBox ? readPositiveNumber(freeWardrobeBox.height) : null;
    const freeDepth = freeWardrobeBox ? readPositiveNumber(freeWardrobeBox.depth) : null;
    if (
      freeWardrobeBox &&
      (freeCenterY == null ||
        freeCenterZ == null ||
        freeWidth == null ||
        freeHeight == null ||
        freeDepth == null)
    ) {
      return null;
    }
    const freeBackZ =
      freeCenterZ != null && freeDepth != null ? freeCenterZ - freeDepth / 2 : internalZ - internalDepth / 2;
    if (!Number.isFinite(freeBackZ)) return null;
    const centerY =
      freeCenterY != null && freeHeight != null
        ? clampSketchFreeBoxCenterY({
            centerY: absY,
            boxH: height,
            wardrobeCenterY: freeCenterY,
            wardrobeHeight: freeHeight,
            pad: resolveSketchBoxPlacementClampPad(woodThick),
          })
        : absY;
    const geometry = resolveSketchFreeBoxGeometry({
      wardrobeWidth: freeWidth ?? innerW,
      wardrobeDepth: freeDepth ?? internalDepth,
      backZ: freeBackZ,
      centerX: absX,
      woodThick,
      widthM,
      depthM,
    });
    return { centerY, geometry, absEntry: null };
  }

  const yNorm = readFiniteNumber(box.yNorm);
  const xNorm = readFiniteNumber(box.xNorm);
  if (yNorm == null) return null;

  const centerYBase = effectiveBottomY + Math.max(0, Math.min(1, yNorm)) * spanH;
  const padBox = resolveSketchBoxPlacementClampPad(woodThick);
  const lo = effectiveBottomY + padBox + halfH;
  const hi = effectiveTopY - padBox - halfH;
  const centerY = hi > lo ? Math.max(lo, Math.min(hi, centerYBase)) : clampY(centerYBase);
  const geometry = resolveSketchBoxGeometry({
    innerW,
    internalCenterX,
    internalDepth,
    internalZ,
    woodThick,
    widthM,
    depthM,
    xNorm,
  });
  return {
    centerY,
    geometry,
    absEntry: {
      y: centerY,
      halfH,
      innerW: geometry.innerW,
      centerX: geometry.centerX,
      innerD: geometry.innerD,
      innerBackZ: geometry.innerBackZ,
    },
  };
}
