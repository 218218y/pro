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
  const wRaw = box.widthM;
  const dRaw = box.depthM;
  const widthM = typeof wRaw === 'number' ? wRaw : wRaw != null ? Number(wRaw) : NaN;
  const depthM = typeof dRaw === 'number' ? dRaw : dRaw != null ? Number(dRaw) : NaN;

  if (isFreePlacement) {
    const absX = Number(box.absX);
    const absY = Number(box.absY);
    const freeBackZ =
      freeWardrobeBox && Number.isFinite(freeWardrobeBox.centerZ) && Number.isFinite(freeWardrobeBox.depth)
        ? Number(freeWardrobeBox.centerZ) - Number(freeWardrobeBox.depth) / 2
        : internalZ - internalDepth / 2;
    if (!Number.isFinite(absX) || !Number.isFinite(absY) || !Number.isFinite(freeBackZ)) return null;
    const centerY =
      freeWardrobeBox && Number.isFinite(freeWardrobeBox.centerY) && Number.isFinite(freeWardrobeBox.height)
        ? clampSketchFreeBoxCenterY({
            centerY: absY,
            boxH: height,
            wardrobeCenterY: Number(freeWardrobeBox.centerY),
            wardrobeHeight: Number(freeWardrobeBox.height),
            pad: resolveSketchBoxPlacementClampPad(woodThick),
          })
        : absY;
    const geometry = resolveSketchFreeBoxGeometry({
      wardrobeWidth: freeWardrobeBox ? Number(freeWardrobeBox.width) : innerW,
      wardrobeDepth: freeWardrobeBox ? Number(freeWardrobeBox.depth) : internalDepth,
      backZ: freeBackZ,
      centerX: absX,
      woodThick,
      widthM: Number.isFinite(widthM) && widthM > 0 ? widthM : null,
      depthM: Number.isFinite(depthM) && depthM > 0 ? depthM : null,
    });
    return { centerY, geometry, absEntry: null };
  }

  const yNormRaw = box.yNorm;
  const xNormRaw = box.xNorm;
  const yNorm = typeof yNormRaw === 'number' ? yNormRaw : Number(yNormRaw);
  const xNorm = typeof xNormRaw === 'number' ? xNormRaw : xNormRaw != null ? Number(xNormRaw) : NaN;
  if (!Number.isFinite(yNorm)) return null;

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
    widthM: Number.isFinite(widthM) && widthM > 0 ? widthM : null,
    depthM: Number.isFinite(depthM) && depthM > 0 ? depthM : null,
    xNorm: Number.isFinite(xNorm) ? xNorm : null,
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
