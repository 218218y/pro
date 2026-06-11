// Corner wing door emission owner.
//
// Keep the public wing-cell door layer focused on per-door orchestration while
// split/full policy lives in dedicated helpers.

import type { CornerWingCellFlowParams } from './corner_wing_cell_shared.js';
import { appendCornerWingFullDoor } from './corner_wing_cell_doors_full.js';
import { createCornerWingDoorContext, createCornerWingDoorState } from './corner_wing_cell_doors_shared.js';
import { appendCornerWingSplitDoor } from './corner_wing_cell_doors_split.js';

export function applyCornerWingCellDoors(params: CornerWingCellFlowParams): void {
  const ctx = createCornerWingDoorContext(params);
  if (!ctx) return;

  for (let doorIdx = 0; doorIdx < ctx.doorCount; doorIdx++) {
    const state = createCornerWingDoorState(ctx, doorIdx);
    if (state.shouldSplit) {
      appendCornerWingSplitDoor(ctx, state);
      continue;
    }
    appendCornerWingFullDoor(ctx, state);
  }
}
