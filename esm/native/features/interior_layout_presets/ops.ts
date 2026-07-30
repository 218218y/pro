import type { InteriorPresetOpsLike, InteriorRodOpLike } from '../../../../types';
import {
  INTERIOR_PRESET_ROD_FACTORS_POLICY,
  INTERIOR_PRESET_SHELF_ROWS_POLICY,
  INTERIOR_STORAGE_BARRIER_POLICY,
} from '../../../shared/dimensions/interior_layout_presets_dimension_policy.js';

// Feature-level pure helpers for canonical interior layout presets.
//
// Why this lives under features/:
// - The logic is deterministic and domain-oriented (no App / THREE / DOM / builder service access).
// - Both builder/ and services/ consume the same preset semantics.
// - Keeping it here avoids a forbidden services -> builder dependency edge.

/**
 * Interior layout preset ops (DOM-free, THREE-free).
 * The caller converts these ops to absolute coordinates using its own geometry context.
 */
export function computeInteriorPresetOps(layoutType: unknown): InteriorPresetOpsLike {
  const lt = typeof layoutType === 'string' ? layoutType : 'shelves';
  const ops: InteriorPresetOpsLike = { shelves: [], rods: [] };
  const presetShelfRows = INTERIOR_PRESET_SHELF_ROWS_POLICY;
  const presetRodFactors = INTERIOR_PRESET_ROD_FACTORS_POLICY;

  const addFullShelfRows = (): void => {
    ops.shelves = Array.from(presetShelfRows.fullShelfRows);
  };

  const pushRod = (
    yFactor: number,
    enableHangingClothes: boolean,
    enableSingleHanger: boolean,
    limitFactor: number | null = null,
    limitAdd: number | null = null
  ): void => {
    const rod: InteriorRodOpLike = {
      yFactor: Number(yFactor),
      enableHangingClothes: !!enableHangingClothes,
      enableSingleHanger: !!enableSingleHanger,
    };
    if (Number.isFinite(Number(limitFactor))) rod.limitFactor = Number(limitFactor);
    if (Number.isFinite(Number(limitAdd))) rod.limitAdd = Number(limitAdd);
    ops.rods.push(rod);
  };

  switch (lt) {
    case 'shelves':
      addFullShelfRows();
      break;
    case 'mixed':
      addFullShelfRows();
      pushRod(presetRodFactors.mixedRodYFactor, false, false);
      break;
    case 'hanging':
    case 'hanging_top2':
      ops.shelves = Array.from(presetShelfRows.hangingShelfRows);
      pushRod(presetRodFactors.hangingRodYFactor, true, true);
      break;
    case 'hanging_split':
      ops.shelves = Array.from(presetShelfRows.splitShelfRows);
      pushRod(
        presetRodFactors.splitUpperRodYFactor,
        true,
        true,
        presetRodFactors.splitUpperRodLimitFactor,
        0
      );
      pushRod(
        presetRodFactors.splitLowerRodYFactor,
        true,
        true,
        presetRodFactors.splitLowerRodLimitFactor,
        0
      );
      break;
    case 'storage':
    case 'storage_shelf': {
      ops.shelves = Array.from(presetShelfRows.hangingShelfRows);
      const barrierH: number = INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM;
      pushRod(
        presetRodFactors.storageRodYFactor,
        true,
        true,
        presetRodFactors.storageRodLimitFactor,
        -barrierH
      );
      ops.storageBarrier = {
        barrierH,
        zFrontOffset: INTERIOR_STORAGE_BARRIER_POLICY.barrierFrontZOffsetM,
      };
      break;
    }
    default:
      break;
  }

  return ops;
}
