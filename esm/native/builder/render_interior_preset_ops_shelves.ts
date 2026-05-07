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
  __isFn,
  asMaterial,
  reportInteriorPresetSoft,
  type InteriorPresetHandleCatch,
} from './render_interior_preset_ops_shared.js';

export function createAddGridShelf(args: {
  App: AppContainer;
  threeSurface: InteriorTHREESurface | null;
  group: InteriorGroupLike;
  createBoard: InteriorOpsCallable;
  addFoldedClothes?: InteriorOpsCallable;
  currentShelfMat: unknown;
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
  internalDepth: number;
  internalZ: number;
  regularDepth: number;
  regularZ: number;
  regularShelfWidth: number;
  braceShelfWidth: number;
  leftInnerX: number;
  rightInnerX: number;
  isInternalDrawersEnabled: boolean;
  intDrawersSlot: number;
  renderOpsHandleCatch: InteriorPresetHandleCatch;
}): (gridIndex: number) => void {
  const {
    App,
    threeSurface,
    group,
    createBoard,
    addFoldedClothes,
    currentShelfMat,
    braceSet,
    shelfSet,
    effectiveBottomY,
    effectiveTopY,
    localGridStep,
    gridDivisions,
    internalCenterX,
    braceCenterX,
    innerW,
    woodThick,
    internalDepth,
    internalZ,
    regularDepth,
    regularZ,
    regularShelfWidth,
    braceShelfWidth,
    leftInnerX,
    rightInnerX,
    isInternalDrawersEnabled,
    intDrawersSlot,
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
    isBrace: boolean
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
      mesh.userData.partId = 'all_shelves';
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

  const addBraceDarkSeams = (
    _shelfY: number,
    _shelfZ: number,
    _shelfDepth: number,
    _isBrace: boolean
  ): void => {};

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
    const hasDrawerInBottomSpace = isInternalDrawersEnabled && intDrawersSlot === 1;
    if (hasDrawerInBottomSpace) return;

    const isBrace = !!braceSet[1];
    const shelfDepth = isBrace ? internalDepth : regularDepth;
    const shelfZ = isBrace ? internalZ : regularZ;
    const maxHeight = resolveBaseContentsMaxHeight(woodThick);
    if (!(maxHeight > 0)) return;

    addFoldedClothes(
      internalCenterX,
      effectiveBottomY,
      shelfZ,
      innerW - INTERIOR_FITTINGS_DIMENSIONS.shelves.contentsWidthClearanceM,
      group,
      maxHeight,
      shelfDepth
    );
  }

  function resolveShelfContentsMaxHeight(gridIndex: number, shelfY: number, shelfH: number): number {
    const shelfTopY = shelfY + shelfH / 2;
    let topLimitY = effectiveTopY;
    const maxGrid = Math.max(0, Math.floor(Number(gridDivisions) || 0));

    for (let nextIndex = gridIndex + 1; nextIndex < maxGrid; nextIndex += 1) {
      if (shelfSet[nextIndex]) {
        topLimitY = effectiveBottomY + nextIndex * localGridStep - woodThick / 2;
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

    createBoard(shelfW, woodThick, shelfDepth, shelfX, y, shelfZ, currentShelfMat, 'all_shelves');
    addBraceDarkSeams(y, shelfZ, shelfDepth, isBrace);
    addShelfPins(y, shelfZ, shelfDepth, woodThick, isBrace);

    const hasDrawerInSpace = isInternalDrawersEnabled && intDrawersSlot === Number(gridIndex || 0) + 1;
    if (!hasDrawerInSpace && __isFn(addFoldedClothes)) {
      addFoldedClothes(
        internalCenterX,
        y + woodThick / 2,
        shelfZ,
        innerW - INTERIOR_FITTINGS_DIMENSIONS.shelves.contentsWidthClearanceM,
        group,
        resolveShelfContentsMaxHeight(Number(gridIndex || 0), y, woodThick),
        shelfDepth
      );
    }
  };
}
