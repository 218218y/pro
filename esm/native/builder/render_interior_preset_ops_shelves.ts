import type { AppContainer } from '../../../types';
import type {
  InteriorGeometryLike,
  InteriorGroupLike,
  InteriorMaterialLike,
  InteriorOpsCallable,
  InteriorTHREESurface,
} from './render_interior_ops_contracts.js';
import { INTERIOR_FITTINGS_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  SHELF_GROUP_PART_ID,
  createModuleShelfPartId,
  markShelfBoardUserData,
  resolveShelfPartMaterial,
} from '../features/shelf_part_identity.js';
import {
  __isFn,
  asMaterial,
  reportInteriorPresetSoft,
  type InteriorPresetHandleCatch,
} from './render_interior_preset_ops_shared.js';
import type { RemovedFrameSideShelfRounding } from './removed_frame_side_brace_shelves.js';

type RoundedShelfBoardOptions = {
  shape: 'rounded_shelf';
  roundedShelfSide: RemovedFrameSideShelfRounding;
};

export function createAddGridShelf(args: {
  App: AppContainer;
  threeSurface: InteriorTHREESurface | null;
  group: InteriorGroupLike;
  createBoard: InteriorOpsCallable;
  addFoldedClothes?: InteriorOpsCallable;
  cfgSnapshot: unknown;
  currentShelfMat: unknown;
  currentBraceShelfMat?: unknown;
  moduleKey: string;
  getPartMaterial?: InteriorOpsCallable;
  getPartColorValue?: InteriorOpsCallable;
  braceSet: Record<number, true>;
  shelfSet: Record<number, true>;
  effectiveBottomY: number;
  effectiveTopY: number;
  localGridStep: number;
  gridDivisions: number;
  internalCenterX: number;
  braceCenterX: number;
  innerW: number;
  woodThick: number;
  shelfThick: number;
  internalDepth: number;
  internalZ: number;
  regularDepth: number;
  regularZ: number;
  regularShelfWidth: number;
  braceShelfWidth: number;
  leftInnerX: number;
  rightInnerX: number;
  roundedShelfSide?: RemovedFrameSideShelfRounding | null;
  renderOpsHandleCatch: InteriorPresetHandleCatch;
}): (gridIndex: number) => void {
  const {
    App,
    threeSurface,
    group,
    createBoard,
    addFoldedClothes,
    cfgSnapshot,
    currentShelfMat,
    currentBraceShelfMat,
    moduleKey,
    getPartMaterial,
    getPartColorValue,
    braceSet,
    shelfSet,
    effectiveBottomY,
    effectiveTopY,
    localGridStep,
    gridDivisions,
    internalCenterX,
    braceCenterX,
    innerW,
    shelfThick,
    internalDepth,
    internalZ,
    regularDepth,
    regularZ,
    regularShelfWidth,
    braceShelfWidth,
    leftInnerX,
    rightInnerX,
    roundedShelfSide,
    renderOpsHandleCatch,
  } = args;

  const pinRadius = INTERIOR_FITTINGS_DIMENSIONS.pins.radiusM;
  const pinLength = INTERIOR_FITTINGS_DIMENSIONS.pins.lengthM;
  const pinEdgeOffsetDefault = INTERIOR_FITTINGS_DIMENSIONS.pins.edgeOffsetDefaultM;
  let pinGeometry: InteriorGeometryLike | null = null;
  let pinMaterial: InteriorMaterialLike | null = null;

  function ensurePinResources(): boolean {
    if (!threeSurface) return false;
    try {
      if (!pinGeometry)
        pinGeometry = new threeSurface.CylinderGeometry(
          pinRadius,
          pinRadius,
          pinLength,
          INTERIOR_FITTINGS_DIMENSIONS.pins.radialSegments
        );
      if (!pinMaterial) {
        pinMaterial = new threeSurface.MeshStandardMaterial({
          color: 0xaaaaaa,
          roughness: 0.35,
          metalness: 0.8,
        });
      }
      try {
        pinMaterial.__keepMaterial = true;
      } catch (err) {
        reportInteriorPresetSoft(
          App,
          renderOpsHandleCatch,
          'applyInteriorPresetOps.ensurePinResources.keepMaterial',
          err
        );
      }
      return true;
    } catch (err) {
      reportInteriorPresetSoft(App, renderOpsHandleCatch, 'applyInteriorPresetOps.ensurePinResources', err);
      return false;
    }
  }

  function addShelfPins(
    shelfY: number,
    shelfZ: number,
    shelfDepth: number,
    shelfH: number,
    isBrace: boolean,
    shelfPartId: string
  ): void {
    if (isBrace) return;
    if (!(innerW > 0) || !(shelfDepth > 0)) return;
    if (!ensurePinResources()) return;

    const shelfBottom = shelfY - shelfH / 2;
    const yPin = shelfBottom - pinRadius + INTERIOR_FITTINGS_DIMENSIONS.pins.bottomYOffsetM;
    const backEdge = shelfZ - shelfDepth / 2;
    const frontEdge = shelfZ + shelfDepth / 2;
    const maxOffset = shelfDepth / 2 - INTERIOR_FITTINGS_DIMENSIONS.pins.maxDepthSideClearanceM;
    const edgeOffset = Math.max(
      INTERIOR_FITTINGS_DIMENSIONS.pins.minEdgeOffsetM,
      Math.min(pinEdgeOffsetDefault, maxOffset)
    );
    const zBack = backEdge + edgeOffset;
    const zFront = frontEdge - edgeOffset;

    const mkPin = (x: number, z: number) => {
      if (!threeSurface || !pinGeometry || !pinMaterial) return;
      const mesh = new threeSurface.Mesh(pinGeometry, pinMaterial);
      if (mesh.rotation) mesh.rotation.z = Math.PI / 2;
      mesh.position?.set?.(x, yPin, z);
      mesh.userData = mesh.userData || {};
      mesh.userData.partId = shelfPartId;
      markShelfBoardUserData(mesh.userData, { groupPartId: SHELF_GROUP_PART_ID });
      mesh.userData.__kind = 'shelf_pin';
      const material = asMaterial(mesh.material);
      if (material) material.__keepMaterial = true;
      group.add?.(mesh);
    };

    mkPin(leftInnerX + pinLength / 2, zBack);
    mkPin(leftInnerX + pinLength / 2, zFront);
    mkPin(rightInnerX - pinLength / 2, zBack);
    mkPin(rightInnerX - pinLength / 2, zFront);
  }

  function resolveBaseContentsMaxHeight(shelfH: number): number {
    if (!shelfSet[1]) return 0;
    const firstShelfBottomY = effectiveBottomY + localGridStep - shelfH / 2;
    return Math.max(
      0,
      firstShelfBottomY - effectiveBottomY - INTERIOR_FITTINGS_DIMENSIONS.shelves.contentsHeightClearanceM
    );
  }

  function addBaseShelfContents(): void {
    if (!shelfSet[1] || !__isFn(addFoldedClothes)) return;
    const isBrace = !!braceSet[1];
    const shelfDepth = isBrace ? internalDepth : regularDepth;
    const shelfZ = isBrace ? internalZ : regularZ;
    const maxHeight = resolveBaseContentsMaxHeight(shelfThick);
    if (!(maxHeight > 0)) return;

    addFoldedClothes(
      internalCenterX,
      effectiveBottomY,
      shelfZ,
      innerW - INTERIOR_FITTINGS_DIMENSIONS.shelves.contentsWidthClearanceM,
      group,
      maxHeight,
      shelfDepth,
      cfgSnapshot
    );
  }

  function resolveShelfContentsMaxHeight(gridIndex: number, shelfY: number, shelfH: number): number {
    const shelfTopY = shelfY + shelfH / 2;
    let topLimitY = effectiveTopY;
    const maxGrid = Math.max(0, Math.floor(Number(gridDivisions) || 0));

    for (let nextIndex = gridIndex + 1; nextIndex < maxGrid; nextIndex += 1) {
      if (shelfSet[nextIndex]) {
        topLimitY = effectiveBottomY + nextIndex * localGridStep - shelfThick / 2;
        break;
      }
    }

    return Math.max(0, topLimitY - shelfTopY - INTERIOR_FITTINGS_DIMENSIONS.shelves.contentsHeightClearanceM);
  }

  addBaseShelfContents();

  return function addGridShelf(gridIndex: number): void {
    const y = effectiveBottomY + Number(gridIndex || 0) * localGridStep;
    if (!(y < effectiveTopY - 0.01)) return;

    const gridKey = parseInt(String(gridIndex || 0), 10);
    const isBrace = !!braceSet[gridKey];
    const shelfDepth = isBrace ? internalDepth : regularDepth;
    const shelfZ = isBrace ? internalZ : regularZ;
    const shelfW = isBrace ? braceShelfWidth : regularShelfWidth;
    const shelfX = isBrace ? braceCenterX : internalCenterX;

    const shelfPartId = createModuleShelfPartId(moduleKey, gridKey);
    const shelfMat = resolveShelfPartMaterial({
      partId: shelfPartId,
      currentShelfMat: isBrace ? currentBraceShelfMat || currentShelfMat : currentShelfMat,
      getPartColorValue,
      getPartMaterial,
    });
    const roundedOptions: RoundedShelfBoardOptions | null =
      isBrace && roundedShelfSide ? { shape: 'rounded_shelf', roundedShelfSide } : null;
    const shelfMesh = createBoard(
      shelfW,
      shelfThick,
      shelfDepth,
      shelfX,
      y,
      shelfZ,
      shelfMat,
      shelfPartId,
      roundedOptions
    );
    if (shelfMesh && typeof shelfMesh === 'object') {
      const userData = ((shelfMesh as { userData?: Record<string, unknown> }).userData ||= {});
      markShelfBoardUserData(userData, {
        groupPartId: SHELF_GROUP_PART_ID,
        shelfIndex: gridKey,
        variant: isBrace ? 'brace' : 'regular',
        isBrace,
        roundedSide: roundedOptions?.roundedShelfSide,
      });
    }
    addShelfPins(y, shelfZ, shelfDepth, shelfThick, isBrace, shelfPartId);

    if (__isFn(addFoldedClothes)) {
      addFoldedClothes(
        internalCenterX,
        y + shelfThick / 2,
        shelfZ,
        innerW - INTERIOR_FITTINGS_DIMENSIONS.shelves.contentsWidthClearanceM,
        group,
        resolveShelfContentsMaxHeight(Number(gridIndex || 0), y, shelfThick),
        shelfDepth,
        cfgSnapshot
      );
    }
  };
}
