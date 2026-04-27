import type { InteriorPresetOpsLike, InteriorRodOpLike } from '../../../../types';

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

  const addShelves_1_to_5 = (): void => {
    ops.shelves = [1, 2, 3, 4, 5];
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
      addShelves_1_to_5();
      break;
    case 'mixed':
      addShelves_1_to_5();
      pushRod(3.5, false, false);
      break;
    case 'hanging':
    case 'hanging_top2':
      ops.shelves = [5, 4];
      pushRod(3.8, true, true);
      break;
    case 'hanging_split':
      ops.shelves = [5, 1];
      pushRod(4.6, true, true, 2.3, 0);
      pushRod(2.3, true, true, 1.3, 0);
      break;
    case 'storage':
    case 'storage_shelf': {
      ops.shelves = [5, 4];
      const barrierH = 0.5;
      pushRod(3.5, true, true, 3.5, -barrierH);
      ops.storageBarrier = { barrierH, zFrontOffset: -0.06 };
      break;
    }
    default:
      break;
  }

  return ops;
}
