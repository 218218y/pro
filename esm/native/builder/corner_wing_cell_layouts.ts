import { INTERIOR_STORAGE_BARRIER_POLICY } from '../../shared/dimensions/interior_storage_policy.js';
import {
  INTERIOR_PRESET_ROD_FACTORS_POLICY,
  INTERIOR_PRESET_SHELF_ROWS_POLICY,
  INTERIOR_ROD_PLACEMENT_POLICY,
} from '../../shared/dimensions/interior_fittings_policy.js';
import type { CornerCell, CornerCellCfg, GroupLike, ThreeCornerCellLike } from './corner_wing_cell_shared.js';

type StorageBarrierParams = {
  THREE: ThreeCornerCellLike;
  wingGroup: GroupLike;
  bodyMat: unknown;
  getCornerMat: (partId: string, defaultMaterial: unknown) => unknown;
  cell: CornerCell;
  cellW: number;
  cellCenterX: number;
  cellKey: string;
  effectiveBottomY: number;
  woodThick: number;
  __z: (z: number) => number;
};

type CornerWingCellLayoutParams = {
  cfgCell: CornerCellCfg;
  cell: CornerCell;
  cellW: number;
  cellCenterX: number;
  cellKey: string;
  gridDivisions: number;
  localGridStep: number;
  effectiveBottomY: number;
  effectiveTopY: number;
  woodThick: number;
  bodyMat: unknown;
  wingGroup: GroupLike;
  THREE: ThreeCornerCellLike;
  getCornerMat: (partId: string, defaultMaterial: unknown) => unknown;
  addGridShelf: (gridIndex: number) => void;
  createRod: (yPos: number, limitHeight?: number | null) => void;
  __z: (z: number) => number;
};

function addCornerStorageBarrier(params: StorageBarrierParams): void {
  const {
    THREE,
    wingGroup,
    bodyMat,
    getCornerMat,
    cell,
    cellW,
    cellCenterX,
    cellKey,
    effectiveBottomY,
    woodThick,
    __z,
  } = params;
  const barrierHeight = INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM;
  const partId = `corner_storage_barrier_c${cell.idx}`;
  const barrierMat = getCornerMat(partId, bodyMat);
  const barrier = new THREE.Mesh(
    new THREE.BoxGeometry(
      Math.max(
        INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthMinM,
        cellW - INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthClearanceM
      ),
      barrierHeight,
      woodThick
    ),
    barrierMat
  );
  barrier.position.set(
    cellCenterX,
    effectiveBottomY + barrierHeight / 2,
    __z(INTERIOR_STORAGE_BARRIER_POLICY.barrierFrontZOffsetM)
  );
  barrier.userData = { partId, moduleIndex: cellKey };
  wingGroup.add(barrier);
}

function applyCornerWingCustomLayout(params: CornerWingCellLayoutParams): void {
  const { cfgCell, gridDivisions, localGridStep, effectiveBottomY, woodThick, addGridShelf, createRod } =
    params;
  for (let i = 1; i <= gridDivisions; i++) {
    if (i < gridDivisions && cfgCell.customData.shelves[i - 1]) addGridShelf(i);
    if (cfgCell.customData.rods[i - 1]) {
      const rodY = effectiveBottomY + i * localGridStep + INTERIOR_ROD_PLACEMENT_POLICY.defaultYOffsetM;
      let limitHeight = null;

      for (let k = i - 1; k >= 1; k--) {
        const gridLineY = effectiveBottomY + k * localGridStep;
        if (cfgCell.customData.shelves[k - 1]) {
          limitHeight = rodY - (gridLineY + woodThick / 2);
          break;
        }
        if (cfgCell.customData.rods[k - 1]) {
          const rodBelowY = gridLineY + INTERIOR_ROD_PLACEMENT_POLICY.defaultYOffsetM;
          limitHeight = rodY - rodBelowY;
          break;
        }
      }

      if (limitHeight === null && cfgCell.customData.storage) {
        const storageHeight = INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM;
        const storageTopY = effectiveBottomY + storageHeight;
        if (rodY > storageTopY) limitHeight = rodY - storageTopY;
      }

      createRod(rodY, limitHeight);
    }
  }

  if (cfgCell.customData.storage) {
    addCornerStorageBarrier({
      THREE: params.THREE,
      wingGroup: params.wingGroup,
      bodyMat: params.bodyMat,
      getCornerMat: params.getCornerMat,
      cell: params.cell,
      cellW: params.cellW,
      cellCenterX: params.cellCenterX,
      cellKey: params.cellKey,
      effectiveBottomY,
      woodThick,
      __z: params.__z,
    });
  }
}

function applyCornerWingPresetLayout(params: CornerWingCellLayoutParams): void {
  const { cfgCell, gridDivisions, localGridStep, effectiveBottomY, effectiveTopY, addGridShelf, createRod } =
    params;
  const layoutType = cfgCell.layout;
  const presetShelfRows = INTERIOR_PRESET_SHELF_ROWS_POLICY;
  const presetRodFactors = INTERIOR_PRESET_ROD_FACTORS_POLICY;
  const __presetShelfSet: Record<number, true> = Object.create(null);
  const addPresetShelfRows = (rows: readonly number[]) => {
    for (const row of rows) __presetShelfSet[row] = true;
  };
  switch (layoutType) {
    case 'shelves':
    case 'mixed':
      addPresetShelfRows(presetShelfRows.fullShelfRows);
      break;
    case 'hanging':
    case 'hanging_top2':
    case 'storage':
    case 'storage_shelf':
      addPresetShelfRows(presetShelfRows.hangingShelfRows);
      break;
    case 'hanging_split':
      addPresetShelfRows(presetShelfRows.splitShelfRows);
      break;
  }

  for (let s = 1; s <= gridDivisions; s++) {
    let __slotTopY = effectiveTopY;
    for (let __nextShelfIdx = s; __nextShelfIdx < gridDivisions; __nextShelfIdx++) {
      if (__presetShelfSet[__nextShelfIdx]) {
        __slotTopY = effectiveBottomY + __nextShelfIdx * localGridStep;
        break;
      }
    }
    const __slotBottomY = effectiveBottomY + (s - 1) * localGridStep;
  }

  switch (layoutType) {
    case 'shelves':
      for (const row of presetShelfRows.fullShelfRows) addGridShelf(row);
      break;
    case 'mixed':
      for (const row of presetShelfRows.fullShelfRows) addGridShelf(row);
      createRod(effectiveBottomY + presetRodFactors.mixedRodYFactor * localGridStep);
      break;
    case 'hanging':
    case 'hanging_top2':
      for (const row of presetShelfRows.hangingShelfRows) addGridShelf(row);
      createRod(effectiveBottomY + presetRodFactors.hangingRodYFactor * localGridStep);
      break;
    case 'hanging_split':
      for (const row of presetShelfRows.splitShelfRows) addGridShelf(row);
      createRod(
        effectiveBottomY + presetRodFactors.splitUpperRodYFactor * localGridStep,
        presetRodFactors.splitUpperRodLimitFactor * localGridStep
      );
      createRod(effectiveBottomY + presetRodFactors.splitLowerRodYFactor * localGridStep);
      break;
    case 'storage':
    case 'storage_shelf':
      for (const row of presetShelfRows.hangingShelfRows) addGridShelf(row);
      createRod(
        effectiveBottomY + presetRodFactors.storageRodYFactor * localGridStep,
        presetRodFactors.storageRodLimitFactor * localGridStep - localGridStep
      );
      addCornerStorageBarrier({
        THREE: params.THREE,
        wingGroup: params.wingGroup,
        bodyMat: params.bodyMat,
        getCornerMat: params.getCornerMat,
        cell: params.cell,
        cellW: params.cellW,
        cellCenterX: params.cellCenterX,
        cellKey: params.cellKey,
        effectiveBottomY,
        woodThick: params.woodThick,
        __z: params.__z,
      });
      break;
  }
}

export function applyCornerWingCellLayout(params: CornerWingCellLayoutParams): void {
  if (params.cfgCell.isCustom) {
    applyCornerWingCustomLayout(params);
    return;
  }
  applyCornerWingPresetLayout(params);
}
