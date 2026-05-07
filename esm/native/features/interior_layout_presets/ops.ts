import type { InteriorPresetOpsLike, InteriorRodOpLike } from '../../../../types';
import { INTERIOR_FITTINGS_DIMENSIONS } from '../../../shared/wardrobe_dimension_tokens_shared.js';

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
  const lt = layoutType != null ? String(layoutType) : 'shelves';
  const ops: InteriorPresetOpsLike = { shelves: [], rods: [] };
  const preset = INTERIOR_FITTINGS_DIMENSIONS.presets;

  const addFullShelfRows = (): void => {
    ops.shelves = Array.from(preset.fullShelfRows);
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
      pushRod(preset.mixedRodYFactor, false, false);
      break;
    case 'hanging':
    case 'hanging_top2':
      ops.shelves = Array.from(preset.hangingShelfRows);
      pushRod(preset.hangingRodYFactor, true, true);
      break;
    case 'hanging_split':
      ops.shelves = Array.from(preset.splitShelfRows);
      pushRod(preset.splitUpperRodYFactor, true, true, preset.splitUpperRodLimitFactor, 0);
      pushRod(preset.splitLowerRodYFactor, true, true, preset.splitLowerRodLimitFactor, 0);
      break;
    case 'storage':
    case 'storage_shelf': {
      ops.shelves = Array.from(preset.hangingShelfRows);
      const barrierH = INTERIOR_FITTINGS_DIMENSIONS.storage.barrierHeightM;
      pushRod(preset.storageRodYFactor, true, true, preset.storageRodLimitFactor, -barrierH);
      ops.storageBarrier = {
        barrierH,
        zFrontOffset: INTERIOR_FITTINGS_DIMENSIONS.storage.barrierFrontZOffsetM,
      };
      break;
    }
    default:
      break;
  }

  return ops;
}
