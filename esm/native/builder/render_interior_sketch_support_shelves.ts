import { MATERIAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { InteriorValueRecord } from './render_interior_ops_contracts.js';
import type { ApplySketchShelvesArgs } from './render_interior_sketch_support_contracts.js';

import { readObject } from './render_interior_sketch_shared.js';
import { normalizeSketchShelfVariant } from './render_interior_sketch_layout.js';

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
    currentShelfMat,
    glassMat,
    createBoard,
    THREE,
    addBraceDarkSeams,
    addShelfPins,
  } = args;

  for (let i = 0; i < shelves.length; i++) {
    const shelf = shelves[i] || null;
    if (!shelf) continue;
    const y = yFromNorm(shelf.yNorm);
    if (y == null) continue;
    const variant = normalizeSketchShelfVariant(shelf.variant);
    const isBrace = variant === 'brace';
    const isGlass = variant === 'glass';
    const isDouble = variant === 'double';
    const isRegular = variant === 'regular';

    const boxHere = findBoxAtY(y);
    const baseShelfX = isBrace ? braceCenterX : internalCenterX;
    const baseShelfW = isBrace ? braceShelfWidth : regularShelfWidth;
    const boxShelfW = boxHere ? Math.max(0, boxHere.innerW - (isBrace ? 0.002 : 0.014)) : null;
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
    const GLASS_THICK_M = MATERIAL_DIMENSIONS.glassShelf.thicknessM;
    const shelfH = isGlass ? GLASS_THICK_M : isDouble ? Math.max(woodThick, woodThick * 2) : woodThick;
    const mat = isGlass && glassMat ? glassMat : currentShelfMat;
    const mesh = createBoard(shelfW, shelfH, shelfDepth, shelfX, y, shelfZ, mat, 'all_shelves');

    if (isBrace) addBraceDarkSeams(y, shelfZ, shelfDepth, true, THREE);

    const meshRec = readObject<{
      userData?: InteriorValueRecord;
      castShadow?: boolean;
      receiveShadow?: boolean;
      renderOrder?: number;
    }>(mesh);
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
      !isBrace && (isDouble || isGlass || isRegular)
    );
  }
}
