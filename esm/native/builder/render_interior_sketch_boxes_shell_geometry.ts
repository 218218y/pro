import { SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY } from '../../shared/dimensions/sketch_box_geometry_policy.js';
import {
  clampSketchFreeBoxCenterY,
  resolveSketchBoxGeometry,
  resolveSketchFreeBoxGeometry,
} from './render_interior_sketch_layout.js';
import { resolveRoomArchitectureGeometry, resolveRoomWallSurface } from './room_architecture_geometry.js';

import type {
  ResolvedSketchBoxShellGeometry,
  ResolveSketchBoxShellGeometryArgs,
} from './render_interior_sketch_boxes_shell_types.js';

function resolveSketchBoxPlacementClampPad(woodThick: number): number {
  return Math.min(
    SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY.placementClampPadMaxM,
    Math.max(
      SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY.placementClampPadMinM,
      woodThick * SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY.placementClampPadWoodRatio
    )
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
    const placementWall =
      box.placementWall === 'left' || box.placementWall === 'right' ? box.placementWall : 'back';
    const pad = resolveSketchBoxPlacementClampPad(woodThick);

    if (placementWall !== 'back') {
      const roomGeometry = resolveRoomArchitectureGeometry(renderArgs.App);
      const surface = resolveRoomWallSurface(roomGeometry, placementWall);
      if (!surface) return null;

      const sizing = resolveSketchFreeBoxGeometry({
        wardrobeWidth: surface.usableLength,
        wardrobeDepth: freeWardrobeBox
          ? (readPositiveNumber(freeWardrobeBox.depth) ?? internalDepth)
          : internalDepth,
        backZ: 0,
        centerX: 0,
        woodThick,
        widthM,
        depthM,
      });
      const halfAlong = sizing.outerW / 2;
      const minAlong = surface.startCoord + halfAlong;
      const maxAlong = surface.startCoord + surface.usableLength - halfAlong;
      const alongCenter =
        maxAlong >= minAlong
          ? Math.max(minAlong, Math.min(maxAlong, absX))
          : surface.startCoord + surface.usableLength / 2;
      const centerY = clampSketchFreeBoxCenterY({
        centerY: absY,
        boxH: height,
        wardrobeCenterY: surface.height / 2,
        wardrobeHeight: surface.height,
        pad,
      });
      const pivotX = surface.interiorFaceCoord + surface.inwardNormalX * (sizing.outerD / 2);
      const geometry = resolveSketchFreeBoxGeometry({
        wardrobeWidth: surface.usableLength,
        wardrobeDepth: freeWardrobeBox
          ? (readPositiveNumber(freeWardrobeBox.depth) ?? internalDepth)
          : internalDepth,
        backZ: alongCenter - sizing.outerD / 2,
        centerX: pivotX,
        woodThick,
        widthM: sizing.outerW,
        depthM: sizing.outerD,
      });
      return {
        centerY,
        geometry,
        absEntry: null,
        placementWall,
        rotationY: placementWall === 'left' ? Math.PI / 2 : -Math.PI / 2,
      };
    }

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
            pad,
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
    return { centerY, geometry, absEntry: null, placementWall: 'back', rotationY: 0 };
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
    placementWall: 'back',
    rotationY: 0,
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
