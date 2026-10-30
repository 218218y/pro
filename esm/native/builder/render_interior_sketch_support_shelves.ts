import {
  INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY,
  INTERIOR_SHELF_GEOMETRY_POLICY,
} from '../../shared/dimensions/interior_fittings_policy.js';
import { MATERIAL_THICKNESS_POLICY } from '../../shared/dimensions/material_thickness_policy.js';
import {
  SHELF_GROUP_PART_ID,
  createSketchShelfPartId,
  markShelfBoardUserData,
  resolveShelfPartMaterial,
} from '../features/part_identity/api.js';
import type { BuilderCreateBoardOptions } from '../../../types';
import type { InteriorValueRecord } from './render_interior_ops_contracts.js';
import type { ApplySketchShelvesArgs } from './render_interior_sketch_support_contracts.js';

import { readObject, toFiniteNumber } from './render_interior_sketch_shared.js';
import { normalizeSketchShelfVariant } from './render_interior_sketch_layout.js';
import { isCellBelowWinterBrace, resolveWinterBlanketSupport } from './winter_brace_contents_layout.js';

export function resolveSketchPartitionShelfWidths(width: number): {
  braceShelfWidth: number;
  regularShelfWidth: number;
} {
  return {
    braceShelfWidth: Math.max(0, width - INTERIOR_SHELF_GEOMETRY_POLICY.braceWidthClearanceM),
    regularShelfWidth: Math.max(0, width - INTERIOR_SHELF_GEOMETRY_POLICY.regularWidthClearanceM),
  };
}

function resolveShelfDepth(args: {
  requestedDepth: unknown;
  woodThick: number;
  internalDepth: number;
  fallbackDepth: number;
  boxInnerDepth: number | null;
}): number {
  const { requestedDepth, woodThick, internalDepth, fallbackDepth, boxInnerDepth } = args;
  let shelfDepth = fallbackDepth;
  const depthM = toFiniteNumber(requestedDepth);
  if (depthM != null && depthM > 0) {
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
    contentsPolicy,
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
  const shelfExposedSide = args.shelfExposedSide || null;
  const roundedShelfSide = args.roundedShelfSide || null;

  function shelfHeightForVariant(variant: ReturnType<typeof normalizeSketchShelfVariant>): number {
    if (variant === 'glass') return MATERIAL_THICKNESS_POLICY.glassShelf.thicknessM;
    if (variant === 'double') {
      return Math.max(shelfThick, shelfThick * INTERIOR_SHELF_GEOMETRY_POLICY.doubleThicknessMultiplier);
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
        !(nextY > currentY + INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsHeightClearanceM)
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
        INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsHeightClearanceM
    );
  }

  const placements = shelves.flatMap(shelf => {
    const y = shelf ? yFromNorm(shelf.yNorm) : null;
    if (y == null) return [];
    const variant = normalizeSketchShelfVariant(shelf.variant);
    return [{ y, height: shelfHeightForVariant(variant), variant }];
  });

  for (let i = 0; i < shelves.length; i++) {
    const shelf = shelves[i] || null;
    if (!shelf) continue;
    const y = yFromNorm(shelf.yNorm);
    if (y == null) continue;
    const rawVariant = normalizeSketchShelfVariant(shelf.variant);
    const variant = rawVariant;
    const isBrace = forceBraceShelves || variant === 'brace' || variant === 'winter_brace';
    const isGlass = variant === 'glass';
    const isDouble = variant === 'double';
    const isRegular = variant === 'regular';

    const boxHere = findBoxAtY(y);
    const baseShelfX = isBrace ? braceCenterX : internalCenterX;
    const baseShelfW = isBrace ? braceShelfWidth : regularShelfWidth;
    const boxShelfW = boxHere
      ? Math.max(
          0,
          boxHere.innerW -
            (isBrace
              ? INTERIOR_SHELF_GEOMETRY_POLICY.braceWidthClearanceM
              : INTERIOR_SHELF_GEOMETRY_POLICY.regularWidthClearanceM)
        )
      : null;
    const shelfX = boxHere ? boxHere.centerX : baseShelfX;
    const shelfW = boxHere ? (boxShelfW ?? baseShelfW) : baseShelfW;
    const braceDepth = Math.max(woodThick, (args.braceFrontZ ?? backZ + internalDepth) - backZ);
    const maxShelfDepth = isBrace ? braceDepth : internalDepth;
    const shelfDepth = resolveShelfDepth({
      requestedDepth: shelf.depthM,
      woodThick,
      internalDepth: maxShelfDepth,
      fallbackDepth: isBrace ? braceDepth : regularDepth,
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
    const shelfOptions: BuilderCreateBoardOptions | null =
      variant === 'winter_brace'
        ? { shape: 'winter_brace_shelf', shelfExposedSide }
        : isBrace && shelfExposedSide
          ? {
              shelfExposedSide,
              ...(roundedShelfSide ? { shape: 'rounded_shelf', roundedShelfSide } : {}),
            }
          : null;
    const mesh = createBoard(shelfW, shelfH, shelfDepth, shelfX, y, shelfZ, mat, shelfPartId, shelfOptions);

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
        exposedSide: shelfOptions?.shelfExposedSide,
        roundedSide: shelfOptions?.roundedShelfSide,
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

    if (variant === 'winter_brace' && showContentsEnabled && typeof addFoldedClothes === 'function') {
      const support = resolveWinterBlanketSupport({
        shelves: placements,
        winterY: y,
        winterHeight: shelfH,
        bottomY: args.effectiveBottomY ?? Number.NaN,
        clearance: INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsHeightClearanceM,
      });
      const contentsWidth = shelfW - INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsWidthClearanceM;
      if (support && contentsWidth > 0) {
        addFoldedClothes(
          shelfX,
          support.shelfTopY,
          shelfZ,
          contentsWidth,
          group,
          support.maxHeight,
          shelfDepth,
          { ...contentsPolicy, contentKind: 'winter_blankets' }
        );
      }
    }

    if (
      variant !== 'winter_brace' &&
      !isCellBelowWinterBrace(placements, y) &&
      showContentsEnabled &&
      typeof addFoldedClothes === 'function'
    ) {
      const contentsWidth = shelfW - INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsWidthClearanceM;
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
          contentsPolicy
        );
      }
    }
  }
}
