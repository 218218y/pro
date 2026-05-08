import type { InteriorValueRecord } from './render_interior_ops_contracts.js';
import { INTERIOR_FITTINGS_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  __isFn,
  asRecord,
  type InteriorCustomInput,
  type InteriorRodMapEntry,
  type ShelfVariant,
} from './render_interior_custom_ops_shared.js';

export function applyCustomInteriorGridLayout(args: {
  gridDivisions: number;
  effectiveBottomY: number;
  effectiveTopY: number;
  localGridStep: number;
  shelfSet: Record<number, true>;
  shelfVariantByIndex: Record<number, ShelfVariant>;
  addGridShelf: (gridIndex: number, variant: ShelfVariant | undefined) => void;
  checkAndCreateInternalDrawer: unknown;
  createRod: (
    rodY: number,
    enableHangingClothes: boolean,
    enableSingleHanger: boolean,
    limit: number | null
  ) => unknown;
  rodMap: Record<number, InteriorRodMapEntry>;
}): void {
  const {
    gridDivisions,
    effectiveBottomY,
    effectiveTopY,
    localGridStep,
    shelfSet,
    shelfVariantByIndex,
    addGridShelf,
    checkAndCreateInternalDrawer,
    createRod,
    rodMap,
  } = args;

  for (let i = 1; i <= gridDivisions; i += 1) {
    if (i < gridDivisions && shelfSet[i]) {
      addGridShelf(i, shelfVariantByIndex[i]);
    }

    if (__isFn(checkAndCreateInternalDrawer)) {
      let slotTopY = effectiveTopY;
      for (let nextShelfIdx = i; nextShelfIdx < gridDivisions; nextShelfIdx += 1) {
        if (shelfSet[nextShelfIdx]) {
          slotTopY = effectiveBottomY + nextShelfIdx * localGridStep;
          break;
        }
      }
      const slotBottomY = effectiveBottomY + (i - 1) * localGridStep;
      const slotAvailableHeight = slotTopY - slotBottomY;
      checkAndCreateInternalDrawer(i, { slotBottomY, slotTopY, slotAvailableHeight });
    }

    const rodOp = rodMap[i];
    if (!rodOp) continue;
    const yAdd = Number(rodOp.yAdd || 0);
    const rawYFactor = Number(rodOp.yFactor);
    const rodFactor = Number.isFinite(rawYFactor) ? rawYFactor : i;
    const rodY = effectiveBottomY + rodFactor * localGridStep + yAdd;

    let limit = null;
    const limitFactor = Number(rodOp.limitFactor);
    const limitAdd = Number(rodOp.limitAdd);
    if (Number.isFinite(limitFactor) || Number.isFinite(limitAdd)) {
      limit =
        (Number.isFinite(limitFactor) ? limitFactor : 0) * localGridStep +
        (Number.isFinite(limitAdd) ? limitAdd : 0);
      if (!(limit > 0)) limit = null;
    }

    createRod(rodY, !!rodOp.enableHangingClothes, !!rodOp.enableSingleHanger, limit);
  }
}

export function applyCustomStorageBarrier(args: {
  input: InteriorCustomInput;
  ops: InteriorValueRecord;
  createBoard: (
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    material: unknown,
    partId: string
  ) => unknown;
  bodyMat: unknown;
  moduleKey: string;
  innerW: number;
  woodThick: number;
  internalCenterX: number;
  effectiveBottomY: number;
  D: number;
}): void {
  const {
    input,
    ops,
    createBoard,
    bodyMat,
    moduleKey,
    innerW,
    woodThick,
    internalCenterX,
    effectiveBottomY,
    D,
  } = args;
  const storageBarrier = asRecord(ops.storageBarrier);
  if (!storageBarrier || !storageBarrier.barrierH) return;

  const barrierH = Number(storageBarrier.barrierH || 0);
  const zOff =
    storageBarrier.zFrontOffset != null
      ? Number(storageBarrier.zFrontOffset)
      : INTERIOR_FITTINGS_DIMENSIONS.storage.barrierFrontZOffsetM;
  const partId = moduleKey ? `storage_barrier_${moduleKey}` : 'storage_barrier';
  let material = bodyMat;
  try {
    const cfg = input.cfg;
    const getPartMaterial = input.getPartMaterial;
    const getPartColorValue = input.getPartColorValue;
    if (cfg && cfg.isMultiColorMode && __isFn(getPartColorValue) && getPartColorValue(partId)) {
      if (__isFn(getPartMaterial)) {
        const specificMaterial = getPartMaterial(partId);
        if (specificMaterial) material = specificMaterial;
      }
    }
  } catch {
    // Keep the default body material if per-part color lookup fails.
  }

  createBoard(
    innerW - INTERIOR_FITTINGS_DIMENSIONS.storage.barrierWidthClearanceM,
    barrierH,
    woodThick,
    internalCenterX,
    effectiveBottomY + barrierH / 2,
    D / 2 + zOff,
    material,
    partId
  );
}
