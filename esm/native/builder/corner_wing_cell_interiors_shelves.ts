import { CORNER_WING_INTERIOR_POLICY } from '../../shared/dimensions/corner_system_policy.js';
import {
  INTERIOR_SHELF_GEOMETRY_POLICY,
  INTERIOR_SHELF_PIN_RENDER_POLICY,
} from '../../shared/dimensions/interior_fittings_policy.js';
import { MATERIAL_THICKNESS_POLICY } from '../../shared/dimensions/material_thickness_policy.js';
import type { CornerCellCfg } from './corner_geometry_plan.js';
import {
  CORNER_SHELF_GROUP_PART_ID,
  createCornerShelfPartId,
  markShelfBoardUserData,
} from '../features/part_identity/api.js';
import type {
  CornerWingInteriorCellRuntime,
  CornerWingInteriorRuntime,
} from './corner_wing_cell_interiors_contracts.js';

export type CornerWingInteriorShelfRuntime = {
  shelfMat: unknown;
  braceShelfMat: unknown;
  glassShelfMat: unknown;
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
    moduleIndex: string,
    shelfPartId?: string
  ): void;
};

export function createCornerWingInteriorShelfRuntime(
  runtime: CornerWingInteriorRuntime
): CornerWingInteriorShelfRuntime {
  const shelfMat = runtime.getCornerShelfMat(CORNER_SHELF_GROUP_PART_ID, false);
  const braceShelfMat = runtime.getCornerShelfMat(CORNER_SHELF_GROUP_PART_ID, true);
  const GLASS_SHELF_THICK = MATERIAL_THICKNESS_POLICY.glassShelf.thicknessM;
  const DOUBLE_SHELF_THICK = Math.max(
    runtime.woodThick,
    runtime.woodThick * INTERIOR_SHELF_GEOMETRY_POLICY.doubleThicknessMultiplier
  );
  let glassShelfMat: unknown = null;

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

  const pinRadius = INTERIOR_SHELF_PIN_RENDER_POLICY.radiusM;
  const pinLen = INTERIOR_SHELF_PIN_RENDER_POLICY.lengthM;
  const pinEdgeOffsetDefault = INTERIOR_SHELF_PIN_RENDER_POLICY.edgeOffsetDefaultM;
  let pinGeo: unknown = null;
  let pinMat: ReturnType<CornerWingInteriorRuntime['asRecord']> | null = null;

  const ensurePinResources = (): boolean => {
    try {
      if (!pinGeo)
        pinGeo = new runtime.THREE.CylinderGeometry(
          pinRadius,
          pinRadius,
          pinLen,
          INTERIOR_SHELF_PIN_RENDER_POLICY.radialSegments
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
    moduleIndex: string,
    shelfPartId?: string
  ) => {
    if (isBrace) return;
    if (!(rightInnerX > leftInnerX) || !(shelfDepth > 0)) return;
    if (!ensurePinResources()) return;

    const shelfBottom = shelfY - shelfH / 2;
    const yPin = shelfBottom - pinRadius + INTERIOR_SHELF_PIN_RENDER_POLICY.bottomYOffsetM;
    const backEdge = shelfZ - shelfDepth / 2;
    const frontEdge = shelfZ + shelfDepth / 2;
    const maxOff = shelfDepth / 2 - INTERIOR_SHELF_PIN_RENDER_POLICY.maxDepthSideClearanceM;
    const edgeOff = Math.max(
      INTERIOR_SHELF_PIN_RENDER_POLICY.minEdgeOffsetM,
      Math.min(pinEdgeOffsetDefault, maxOff)
    );
    const zBack = backEdge + edgeOff;
    const zFront = frontEdge - edgeOff;

    const mkPin = (x: number, z: number) => {
      const m = new runtime.THREE.Mesh(pinGeo, pinMat);
      m.rotation.z = Math.PI / 2;
      m.position.set(x, yPin, z);
      m.userData = m.userData || {};
      m.userData.partId = shelfPartId || CORNER_SHELF_GROUP_PART_ID;
      m.userData.moduleIndex = moduleIndex;
      m.userData.__kind = 'shelf_pin';
      markShelfBoardUserData(m.userData, { groupPartId: CORNER_SHELF_GROUP_PART_ID });
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
    braceShelfMat,
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
  const gridDivisions =
    typeof cellRuntime.gridDivisions === 'number' && Number.isFinite(cellRuntime.gridDivisions)
      ? cellRuntime.gridDivisions
      : 0;
  const maxGrid = Math.max(0, Math.floor(gridDivisions));

  for (let nextIndex = gridIndex + 1; nextIndex < maxGrid; nextIndex += 1) {
    if (shelves[nextIndex - 1]) {
      const nextVariant = shelfRuntime.readCornerShelfVariant(cfgCell, nextIndex);
      const nextShelfH = cornerShelfHeightForVariant(runtime, shelfRuntime, nextVariant);
      topLimitY = cellRuntime.effectiveBottomY + nextIndex * cellRuntime.localGridStep - nextShelfH / 2;
      break;
    }
  }

  return Math.max(0, topLimitY - shelfTopY - CORNER_WING_INTERIOR_POLICY.shelfContentsTopClearanceM);
}

export function addCornerWingGridShelf(
  cellRuntime: CornerWingInteriorCellRuntime,
  shelfRuntime: CornerWingInteriorShelfRuntime,
  gridIndex: number
): void {
  const { runtime, cfgCell, cellKey, cellShelfW, cellInnerCenterX, cellInnerW, __braceSet } = cellRuntime;
  const y = cellRuntime.effectiveBottomY + gridIndex * cellRuntime.localGridStep;
  if (!(y < cellRuntime.effectiveTopY - CORNER_WING_INTERIOR_POLICY.shelfTopPlacementGuardM)) return;

  const shelfVariant = shelfRuntime.readCornerShelfVariant(cfgCell, gridIndex);
  const isBraceShelf = !!__braceSet[gridIndex] || shelfVariant === 'brace';
  const isGlassShelf = shelfVariant === 'glass';
  const shelfDepth = isBraceShelf ? cellRuntime.__internalDepth : cellRuntime.__regularDepth;
  const shelfH = cornerShelfHeightForVariant(runtime, shelfRuntime, shelfVariant);
  const shelfW = isBraceShelf ? cellInnerW : cellShelfW;
  const shelfZ = cellRuntime.__backFaceZ + shelfDepth / 2;
  const rawShelfPartId = createCornerShelfPartId(cellKey, gridIndex);
  const shelfPartId =
    runtime.__stackKey === 'bottom' ? runtime.__stackScopePartKey(rawShelfPartId) : rawShelfPartId;
  const shelfMaterial =
    isGlassShelf && shelfRuntime.glassShelfMat
      ? shelfRuntime.glassShelfMat
      : runtime.getCornerShelfMat(shelfPartId, isBraceShelf);
  const shelf = new runtime.THREE.Mesh(
    new runtime.THREE.BoxGeometry(shelfW, shelfH, shelfDepth),
    shelfMaterial
  );
  shelf.position.set(cellInnerCenterX, y, shelfZ);
  shelf.userData = { partId: shelfPartId, moduleIndex: cellKey };
  markShelfBoardUserData(shelf.userData, {
    groupPartId: CORNER_SHELF_GROUP_PART_ID,
    shelfIndex: gridIndex,
    variant: shelfVariant,
    isBrace: isBraceShelf,
  });
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
    cellKey,
    shelfPartId
  );

  if (runtime.showContentsEnabled) {
    runtime.addFoldedClothes(
      cellInnerCenterX,
      y + shelfH / 2,
      shelfZ,
      Math.max(
        CORNER_WING_INTERIOR_POLICY.foldedContentsMinWidthM,
        cellInnerW - CORNER_WING_INTERIOR_POLICY.foldedContentsWidthClearanceM
      ),
      runtime.wingGroup,
      resolveCornerShelfContentsMaxHeight(cellRuntime, shelfRuntime, gridIndex, y, shelfH),
      shelfDepth,
      {
        showContentsEnabled: runtime.showContentsEnabled,
        sketchMode: runtime.__sketchMode === true,
        addOutlines: runtime.addOutlines,
        cfgSnapshot: runtime.__cfg,
      }
    );
  }
}
