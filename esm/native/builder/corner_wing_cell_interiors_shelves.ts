import {
  CORNER_WING_DIMENSIONS,
  INTERIOR_FITTINGS_DIMENSIONS,
  MATERIAL_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { CornerCellCfg } from './corner_geometry_plan.js';
import type {
  CornerWingInteriorCellRuntime,
  CornerWingInteriorRuntime,
} from './corner_wing_cell_interiors_contracts.js';

export type CornerWingInteriorShelfRuntime = {
  shelfMat: unknown;
  glassShelfMat: unknown | null;
  GLASS_SHELF_THICK: number;
  DOUBLE_SHELF_THICK: number;
  readCornerShelfVariant(cfgCell: CornerCellCfg, gridIndex: number): 'regular' | 'double' | 'glass' | 'brace';
  addCornerShelfPins(
    shelfY: number,
    shelfZ: number,
    shelfDepth: number,
    shelfH: number,
    isBrace: boolean,
    leftInnerX: number,
    rightInnerX: number,
    moduleIndex: string
  ): void;
};

export function createCornerWingInteriorShelfRuntime(
  runtime: CornerWingInteriorRuntime
): CornerWingInteriorShelfRuntime {
  const shelfMat = runtime.getCornerMat('corner_shelves', runtime.bodyMat);
  const GLASS_SHELF_THICK = MATERIAL_DIMENSIONS.glassShelf.thicknessM;
  const DOUBLE_SHELF_THICK = Math.max(
    runtime.woodThick,
    runtime.woodThick * INTERIOR_FITTINGS_DIMENSIONS.shelves.doubleThicknessMultiplier
  );
  let glassShelfMat: unknown | null = null;

  try {
    const cache = runtime.getOrCreateCacheRecord(runtime.App, 'cornerWingInteriorMaterialCache');
    if (!cache.__cornerGlassShelfMat && typeof runtime.THREE.MeshStandardMaterial === 'function') {
      const m = new runtime.THREE.MeshStandardMaterial({
        color: 0xf2fbff,
        transparent: true,
        opacity: 0.25,
        roughness: 0.15,
        metalness: 0.0,
      });
      const matRec = runtime.asRecord(m);
      matRec.depthWrite = false;
      matRec.premultipliedAlpha = true;
      if (runtime.THREE.DoubleSide != null) matRec.side = runtime.THREE.DoubleSide;
      matRec.__keepMaterial = true;
      cache.__cornerGlassShelfMat = m;
    }
    glassShelfMat = cache.__cornerGlassShelfMat || null;
  } catch {
    glassShelfMat = null;
  }

  const readCornerShelfVariant = (
    cfgCell: CornerCellCfg,
    gridIndex: number
  ): 'regular' | 'double' | 'glass' | 'brace' => {
    const customData = runtime.isRecord(cfgCell.customData) ? cfgCell.customData : null;
    const variants = Array.isArray(customData?.shelfVariants) ? customData.shelfVariants : [];
    const raw =
      typeof variants[gridIndex - 1] === 'string'
        ? String(variants[gridIndex - 1])
            .trim()
            .toLowerCase()
        : '';
    if (raw === 'double' || raw === 'glass' || raw === 'brace' || raw === 'regular') return raw;
    return 'regular';
  };

  const pinRadius = INTERIOR_FITTINGS_DIMENSIONS.pins.radiusM;
  const pinLen = INTERIOR_FITTINGS_DIMENSIONS.pins.lengthM;
  const pinEdgeOffsetDefault = INTERIOR_FITTINGS_DIMENSIONS.pins.edgeOffsetDefaultM;
  let pinGeo: unknown | null = null;
  let pinMat: ReturnType<CornerWingInteriorRuntime['asRecord']> | null = null;

  const ensurePinResources = (): boolean => {
    try {
      if (!pinGeo)
        pinGeo = new runtime.THREE.CylinderGeometry(
          pinRadius,
          pinRadius,
          pinLen,
          INTERIOR_FITTINGS_DIMENSIONS.pins.radialSegments
        );
      if (!pinMat) {
        pinMat = runtime.asRecord(runtime.getMaterial(null, 'metal'));
        pinMat.__keepMaterial = true;
      }
      return true;
    } catch {
      return false;
    }
  };

  const addCornerShelfPins = (
    shelfY: number,
    shelfZ: number,
    shelfDepth: number,
    shelfH: number,
    isBrace: boolean,
    leftInnerX: number,
    rightInnerX: number,
    moduleIndex: string
  ) => {
    if (isBrace) return;
    if (!(rightInnerX > leftInnerX) || !(shelfDepth > 0)) return;
    if (!ensurePinResources()) return;

    const shelfBottom = shelfY - shelfH / 2;
    const yPin = shelfBottom - pinRadius + INTERIOR_FITTINGS_DIMENSIONS.pins.bottomYOffsetM;
    const backEdge = shelfZ - shelfDepth / 2;
    const frontEdge = shelfZ + shelfDepth / 2;
    const maxOff = shelfDepth / 2 - INTERIOR_FITTINGS_DIMENSIONS.pins.maxDepthSideClearanceM;
    const edgeOff = Math.max(
      INTERIOR_FITTINGS_DIMENSIONS.pins.minEdgeOffsetM,
      Math.min(pinEdgeOffsetDefault, maxOff)
    );
    const zBack = backEdge + edgeOff;
    const zFront = frontEdge - edgeOff;

    const mkPin = (x: number, z: number) => {
      const m = new runtime.THREE.Mesh(pinGeo, pinMat);
      m.rotation.z = Math.PI / 2;
      m.position.set(x, yPin, z);
      m.userData = m.userData || {};
      m.userData.partId = 'corner_shelves';
      m.userData.moduleIndex = moduleIndex;
      m.userData.__kind = 'shelf_pin';
      runtime.asRecord(m.material).__keepMaterial = true;
      runtime.wingGroup.add(m);
    };

    mkPin(leftInnerX + pinLen / 2, zBack);
    mkPin(leftInnerX + pinLen / 2, zFront);
    mkPin(rightInnerX - pinLen / 2, zBack);
    mkPin(rightInnerX - pinLen / 2, zFront);
  };

  return {
    shelfMat,
    glassShelfMat,
    GLASS_SHELF_THICK,
    DOUBLE_SHELF_THICK,
    readCornerShelfVariant,
    addCornerShelfPins,
  };
}

function cornerShelfHeightForVariant(
  runtime: CornerWingInteriorRuntime,
  shelfRuntime: CornerWingInteriorShelfRuntime,
  variant: 'regular' | 'double' | 'glass' | 'brace'
): number {
  if (variant === 'glass') return shelfRuntime.GLASS_SHELF_THICK;
  if (variant === 'double') return shelfRuntime.DOUBLE_SHELF_THICK;
  return runtime.woodThick;
}

function resolveCornerShelfContentsMaxHeight(
  cellRuntime: CornerWingInteriorCellRuntime,
  shelfRuntime: CornerWingInteriorShelfRuntime,
  gridIndex: number,
  shelfY: number,
  shelfH: number
): number {
  const { runtime, cfgCell } = cellRuntime;
  const shelfTopY = shelfY + shelfH / 2;
  let topLimitY = cellRuntime.effectiveTopY;
  const customData = runtime.isRecord(cfgCell.customData) ? cfgCell.customData : null;
  const shelves = Array.isArray(customData?.shelves) ? customData.shelves : [];
  const maxGrid = Math.max(0, Math.floor(Number(cellRuntime.gridDivisions) || 0));

  for (let nextIndex = gridIndex + 1; nextIndex < maxGrid; nextIndex += 1) {
    if (shelves[nextIndex - 1]) {
      const nextVariant = shelfRuntime.readCornerShelfVariant(cfgCell, nextIndex);
      const nextShelfH = cornerShelfHeightForVariant(runtime, shelfRuntime, nextVariant);
      topLimitY = cellRuntime.effectiveBottomY + nextIndex * cellRuntime.localGridStep - nextShelfH / 2;
      break;
    }
  }

  return Math.max(0, topLimitY - shelfTopY - CORNER_WING_DIMENSIONS.interior.shelfContentsTopClearanceM);
}

export function addCornerWingGridShelf(
  cellRuntime: CornerWingInteriorCellRuntime,
  shelfRuntime: CornerWingInteriorShelfRuntime,
  gridIndex: number
): void {
  const { runtime, cfgCell, cellKey, cellShelfW, cellInnerCenterX, cellInnerW, __braceSet } = cellRuntime;
  const y = cellRuntime.effectiveBottomY + gridIndex * cellRuntime.localGridStep;
  if (!(y < cellRuntime.effectiveTopY - CORNER_WING_DIMENSIONS.interior.shelfTopPlacementGuardM)) return;

  const shelfVariant = shelfRuntime.readCornerShelfVariant(cfgCell, gridIndex);
  const isBraceShelf = !!__braceSet[gridIndex] || shelfVariant === 'brace';
  const isGlassShelf = shelfVariant === 'glass';
  const shelfDepth = isBraceShelf ? cellRuntime.__internalDepth : cellRuntime.__regularDepth;
  const shelfH = cornerShelfHeightForVariant(runtime, shelfRuntime, shelfVariant);
  const shelfZ = cellRuntime.__backFaceZ + shelfDepth / 2;
  const shelfMaterial =
    isGlassShelf && shelfRuntime.glassShelfMat ? shelfRuntime.glassShelfMat : shelfRuntime.shelfMat;
  const shelf = new runtime.THREE.Mesh(
    new runtime.THREE.BoxGeometry(cellShelfW, shelfH, shelfDepth),
    shelfMaterial
  );
  shelf.position.set(cellInnerCenterX, y, shelfZ);
  shelf.userData = { partId: 'corner_shelves', moduleIndex: cellKey };
  if (isGlassShelf) {
    const shelfRec = runtime.asRecord(shelf);
    shelfRec.castShadow = false;
    shelfRec.receiveShadow = false;
    shelfRec.renderOrder = 2;
    const matRec = runtime.asRecord(shelf.material);
    matRec.__keepMaterial = true;
  }
  runtime.addOutlines(shelf);
  runtime.wingGroup.add(shelf);

  shelfRuntime.addCornerShelfPins(
    y,
    shelfZ,
    shelfDepth,
    shelfH,
    isBraceShelf,
    cellRuntime.cellInnerLeftX,
    cellRuntime.cellInnerRightX,
    cellKey
  );

  if (!(cfgCell.intDrawersList || []).includes(gridIndex + 1) && runtime.showContentsEnabled) {
    runtime.addFoldedClothes(
      cellInnerCenterX,
      y + shelfH / 2,
      shelfZ,
      Math.max(
        CORNER_WING_DIMENSIONS.interior.foldedContentsMinWidthM,
        cellInnerW - CORNER_WING_DIMENSIONS.interior.foldedContentsWidthClearanceM
      ),
      runtime.wingGroup,
      resolveCornerShelfContentsMaxHeight(cellRuntime, shelfRuntime, gridIndex, y, shelfH),
      shelfDepth
    );
  }
}
