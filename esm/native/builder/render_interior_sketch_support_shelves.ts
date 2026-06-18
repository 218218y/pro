import {
  INTERIOR_FITTINGS_DIMENSIONS,
  MATERIAL_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  SHELF_GROUP_PART_ID,
  createSketchShelfPartId,
  markShelfBoardUserData,
  resolveShelfPartMaterial,
} from '../features/shelf_part_identity.js';
import type { InteriorValueRecord } from './render_interior_ops_contracts.js';
import type { ApplySketchShelvesArgs } from './render_interior_sketch_support_contracts.js';

import { readObject } from './render_interior_sketch_shared.js';
import { normalizeSketchShelfVariant } from './render_interior_sketch_layout.js';
import type { RemovedFrameSideShelfRounding } from './removed_frame_side_brace_shelves.js';

type RoundedShelfBoardOptions = {
  shape: 'rounded_shelf';
  roundedShelfSide: RemovedFrameSideShelfRounding;
};

function resolveShelfDepth(args: {
  requestedDepth: unknown;
  woodThick: number;
  internalDepth: number;
  fallbackDepth: number;
  boxInnerDepth: number | null;
}): number {
  const { requestedDepth, woodThick, internalDepth, fallbackDepth, boxInnerDepth } = args;
  let shelfDepth = fallbackDepth;
  const depthM =
    typeof requestedDepth === 'number'
      ? requestedDepth
      : requestedDepth != null
        ? Number(requestedDepth)
        : NaN;
  if (Number.isFinite(depthM) && depthM > 0) {
    let depth = depthM;
    if (depth < woodThick) depth = woodThick;
    if (internalDepth > 0) depth = Math.min(depth, internalDepth);
    shelfDepth = depth;
  }
  if (boxInnerDepth != null && Number.isFinite(boxInnerDepth) && boxInnerDepth > 0) {
    shelfDepth = Math.min(shelfDepth, boxInnerDepth);
  }
  return shelfDepth;
}

export function applySketchShelves(args: ApplySketchShelvesArgs): void {
  const {
    shelves,
    yFromNorm,
    findBoxAtY,
    braceCenterX,
    braceShelfWidth,
    regularShelfWidth,
    internalCenterX,
    internalDepth,
    internalZ,
    regularDepth,
    backZ,
    woodThick,
    shelfThick,
    effectiveTopY,
    showContentsEnabled,
    addFoldedClothes,
    cfgSnapshot,
    currentShelfMat,
    currentBraceShelfMat,
    moduleKeyStr,
    getPartMaterial,
    getPartColorValue,
    glassMat,
    createBoard,
    group,
    addShelfPins,
  } = args;
  const forceBraceShelves = args.forceBraceShelves === true;
  const roundedShelfSide = args.roundedShelfSide || null;

  function shelfHeightForVariant(variant: ReturnType<typeof normalizeSketchShelfVariant>): number {
    if (variant === 'glass') return MATERIAL_DIMENSIONS.glassShelf.thicknessM;
    if (variant === 'double') {
      return Math.max(
        shelfThick,
        shelfThick * INTERIOR_FITTINGS_DIMENSIONS.shelves.doubleThicknessMultiplier
      );
    }
    return shelfThick;
  }

  function resolveNextShelfBottomY(currentY: number): number {
    let topLimitY = effectiveTopY;
    for (let j = 0; j < shelves.length; j++) {
      const nextShelf = shelves[j] || null;
      if (!nextShelf) continue;

      const nextY = yFromNorm(nextShelf.yNorm);
      if (
        nextY == null ||
        !(nextY > currentY + INTERIOR_FITTINGS_DIMENSIONS.shelves.contentsHeightClearanceM)
      ) {
        continue;
      }

      const nextBottomY = nextY - shelfHeightForVariant(normalizeSketchShelfVariant(nextShelf.variant)) / 2;
      if (nextBottomY < topLimitY) topLimitY = nextBottomY;
    }
    return topLimitY;
  }

  function resolveShelfContentsMaxHeight(shelfY: number, shelfH: number): number {
    const shelfTopY = shelfY + shelfH / 2;
    return Math.max(
      0,
      resolveNextShelfBottomY(shelfY) -
        shelfTopY -
        INTERIOR_FITTINGS_DIMENSIONS.shelves.contentsHeightClearanceM
    );
  }

  for (let i = 0; i < shelves.length; i++) {
    const shelf = shelves[i] || null;
    if (!shelf) continue;
    const y = yFromNorm(shelf.yNorm);
    if (y == null) continue;
    const rawVariant = normalizeSketchShelfVariant(shelf.variant);
    const variant = rawVariant;
    const isBrace = forceBraceShelves || variant === 'brace';
    const isGlass = variant === 'glass';
    const isDouble = variant === 'double';
    const isRegular = variant === 'regular';

    const boxHere = findBoxAtY(y);
    const baseShelfX = isBrace ? braceCenterX : internalCenterX;
    const baseShelfW = isBrace ? braceShelfWidth : regularShelfWidth;
    const shelfDims = INTERIOR_FITTINGS_DIMENSIONS.shelves;
    const boxShelfW = boxHere
      ? Math.max(
          0,
          boxHere.innerW - (isBrace ? shelfDims.braceWidthClearanceM : shelfDims.regularWidthClearanceM)
        )
      : null;
    const shelfX = boxHere ? boxHere.centerX : baseShelfX;
    const shelfW = boxHere ? (boxShelfW ?? baseShelfW) : baseShelfW;
    const shelfDepth = resolveShelfDepth({
      requestedDepth: shelf.depthM,
      woodThick,
      internalDepth,
      fallbackDepth: isBrace ? internalDepth : regularDepth,
      boxInnerDepth: boxHere?.innerD ?? null,
    });

    const backZ0 = boxHere ? boxHere.innerBackZ : internalDepth > 0 ? backZ : internalZ;
    const shelfZ = backZ0 + shelfDepth / 2;
    const shelfH = shelfHeightForVariant(variant);
    const shelfPartId = createSketchShelfPartId(moduleKeyStr, i + 1);
    const mat =
      isGlass && glassMat
        ? glassMat
        : resolveShelfPartMaterial({
            partId: shelfPartId,
            currentShelfMat: isBrace ? currentBraceShelfMat || currentShelfMat : currentShelfMat,
            getPartColorValue,
            getPartMaterial,
          });
    const roundedOptions: RoundedShelfBoardOptions | null =
      isBrace && roundedShelfSide ? { shape: 'rounded_shelf', roundedShelfSide } : null;
    const mesh = createBoard(shelfW, shelfH, shelfDepth, shelfX, y, shelfZ, mat, shelfPartId, roundedOptions);

    const meshRec = readObject<{
      userData?: InteriorValueRecord;
      castShadow?: boolean;
      receiveShadow?: boolean;
      renderOrder?: number;
    }>(mesh);
    if (meshRec && typeof meshRec === 'object') {
      meshRec.userData = meshRec.userData || {};
      markShelfBoardUserData(meshRec.userData, {
        groupPartId: SHELF_GROUP_PART_ID,
        shelfIndex: i + 1,
        variant,
        isBrace,
        roundedSide: roundedOptions?.roundedShelfSide,
      });
    }

    if (isGlass && meshRec && typeof meshRec === 'object') {
      meshRec.userData = meshRec.userData || {};
      meshRec.userData.__keepMaterial = true;
      meshRec.castShadow = false;
      meshRec.receiveShadow = false;
      meshRec.renderOrder = 2;
    }

    addShelfPins(
      shelfX,
      y,
      shelfZ,
      shelfW,
      shelfH,
      shelfDepth,
      !isBrace && (isDouble || isGlass || isRegular),
      shelfPartId
    );

    if (showContentsEnabled && typeof addFoldedClothes === 'function') {
      const contentsWidth = shelfW - INTERIOR_FITTINGS_DIMENSIONS.shelves.contentsWidthClearanceM;
      const maxHeight = resolveShelfContentsMaxHeight(y, shelfH);
      if (contentsWidth > 0 && maxHeight > 0) {
        addFoldedClothes(
          shelfX,
          y + shelfH / 2,
          shelfZ,
          contentsWidth,
          group,
          maxHeight,
          shelfDepth,
          cfgSnapshot
        );
      }
    }
  }
}
