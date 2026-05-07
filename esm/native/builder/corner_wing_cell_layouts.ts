import { INTERIOR_FITTINGS_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type {
  CornerCell,
  CornerCellCfg,
  GroupLike,
  SlotMetaLike,
  ThreeCornerCellLike,
} from './corner_wing_cell_shared.js';

type StorageBarrierParams = {
  THREE: ThreeCornerCellLike;
  wingGroup: GroupLike;
  bodyMat: unknown;
  getCornerMat: (partId: string, fallback: unknown) => unknown;
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
  getCornerMat: (partId: string, fallback: unknown) => unknown;
  addGridShelf: (gridIndex: number) => void;
  createRod: (yPos: number, limitHeight?: number | null) => void;
  checkAndCreateInternalDrawer: (slotIndex: number, slotMeta?: SlotMetaLike) => boolean;
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
  const barrierHeight = INTERIOR_FITTINGS_DIMENSIONS.storage.barrierHeightM;
  const partId = `corner_storage_barrier_c${cell.idx}`;
  const barrierMat = getCornerMat(partId, bodyMat);
  const barrier = new THREE.Mesh(
    new THREE.BoxGeometry(
      Math.max(
        INTERIOR_FITTINGS_DIMENSIONS.storage.barrierWidthMinM,
        cellW - INTERIOR_FITTINGS_DIMENSIONS.storage.barrierWidthClearanceM
      ),
      barrierHeight,
      woodThick
    ),
    barrierMat
  );
  barrier.position.set(
    cellCenterX,
    effectiveBottomY + barrierHeight / 2,
    __z(INTERIOR_FITTINGS_DIMENSIONS.storage.barrierFrontZOffsetM)
  );
  barrier.userData = { partId, moduleIndex: cellKey };
  wingGroup.add(barrier);
}

function applyCornerWingCustomLayout(params: CornerWingCellLayoutParams): void {
  const {
    cfgCell,
    gridDivisions,
    localGridStep,
    effectiveBottomY,
    effectiveTopY,
    woodThick,
    addGridShelf,
    createRod,
    checkAndCreateInternalDrawer,
  } = params;
  const activeDrawerSlots = cfgCell.intDrawersList || [];
  for (let i = 1; i <= gridDivisions; i++) {
    if (i < gridDivisions && cfgCell.customData.shelves[i - 1]) addGridShelf(i);
    {
      let __slotTopY = effectiveTopY;
      for (let __nextShelfIdx = i; __nextShelfIdx < gridDivisions; __nextShelfIdx++) {
        if (cfgCell.customData.shelves[__nextShelfIdx - 1]) {
          __slotTopY = effectiveBottomY + __nextShelfIdx * localGridStep;
          break;
        }
      }
      const __slotBottomY = effectiveBottomY + (i - 1) * localGridStep;
      checkAndCreateInternalDrawer(i, {
        slotBottomY: __slotBottomY,
        slotTopY: __slotTopY,
        slotAvailableHeight: __slotTopY - __slotBottomY,
      });
    }

    if (cfgCell.customData.rods[i - 1]) {
      const rodY = effectiveBottomY + i * localGridStep + INTERIOR_FITTINGS_DIMENSIONS.rods.defaultYOffsetM;
      let limitHeight = null;

      for (let k = i - 1; k >= 1; k--) {
        const gridLineY = effectiveBottomY + k * localGridStep;
        if (cfgCell.customData.shelves[k - 1]) {
          limitHeight = rodY - (gridLineY + woodThick / 2);
          break;
        }
        if (activeDrawerSlots.includes(k)) {
          limitHeight = rodY - gridLineY;
          break;
        }
        if (cfgCell.customData.rods[k - 1]) {
          const rodBelowY = gridLineY + INTERIOR_FITTINGS_DIMENSIONS.rods.defaultYOffsetM;
          limitHeight = rodY - rodBelowY;
          break;
        }
      }

      if (limitHeight === null && cfgCell.customData.storage) {
        const storageHeight = INTERIOR_FITTINGS_DIMENSIONS.storage.barrierHeightM;
        const storageTopY = effectiveBottomY + storageHeight;
        if (rodY > storageTopY) limitHeight = rodY - storageTopY;
      }

      createRod(rodY, limitHeight);
    }
  }

  {
    const __slotBottomY = effectiveBottomY + (gridDivisions - 1) * localGridStep;
    checkAndCreateInternalDrawer(gridDivisions, {
      slotBottomY: __slotBottomY,
      slotTopY: effectiveTopY,
      slotAvailableHeight: effectiveTopY - __slotBottomY,
    });
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
  const {
    cfgCell,
    gridDivisions,
    localGridStep,
    effectiveBottomY,
    effectiveTopY,
    addGridShelf,
    createRod,
    checkAndCreateInternalDrawer,
  } = params;
  const layoutType = cfgCell.layout;
  const presetDims = INTERIOR_FITTINGS_DIMENSIONS.presets;
  const __presetShelfSet: Record<number, true> = Object.create(null);
  const addPresetShelfRows = (rows: readonly number[]) => {
    for (const row of rows) __presetShelfSet[row] = true;
  };
  switch (layoutType) {
    case 'shelves':
    case 'mixed':
      addPresetShelfRows(presetDims.fullShelfRows);
      break;
    case 'hanging':
    case 'hanging_top2':
    case 'storage':
    case 'storage_shelf':
      addPresetShelfRows(presetDims.hangingShelfRows);
      break;
    case 'hanging_split':
      addPresetShelfRows(presetDims.splitShelfRows);
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
    checkAndCreateInternalDrawer(s, {
      slotBottomY: __slotBottomY,
      slotTopY: __slotTopY,
      slotAvailableHeight: __slotTopY - __slotBottomY,
    });
  }

  switch (layoutType) {
    case 'shelves':
      for (const row of presetDims.fullShelfRows) addGridShelf(row);
      break;
    case 'mixed':
      for (const row of presetDims.fullShelfRows) addGridShelf(row);
      createRod(effectiveBottomY + presetDims.mixedRodYFactor * localGridStep);
      break;
    case 'hanging':
    case 'hanging_top2':
      for (const row of presetDims.hangingShelfRows) addGridShelf(row);
      createRod(effectiveBottomY + presetDims.hangingRodYFactor * localGridStep);
      break;
    case 'hanging_split':
      for (const row of presetDims.splitShelfRows) addGridShelf(row);
      createRod(
        effectiveBottomY + presetDims.splitUpperRodYFactor * localGridStep,
        presetDims.splitUpperRodLimitFactor * localGridStep
      );
      createRod(effectiveBottomY + presetDims.splitLowerRodYFactor * localGridStep);
      break;
    case 'storage':
    case 'storage_shelf':
      for (const row of presetDims.hangingShelfRows) addGridShelf(row);
      createRod(
        effectiveBottomY + presetDims.storageRodYFactor * localGridStep,
        presetDims.storageRodLimitFactor * localGridStep - localGridStep
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
