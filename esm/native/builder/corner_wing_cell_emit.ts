// Corner wing per-cell owner.
//
// Keep the canonical wing cell owner focused on orchestration and delegate the
// heavy interior/contents policy plus door policy to dedicated emitter modules.

import type { CornerWingCellFlowParams } from './corner_wing_cell_shared.js';
import { applyCornerWingCellInteriors } from './corner_wing_cell_interiors.js';
import { applyCornerWingCellDoors } from './corner_wing_cell_doors.js';

export function applyCornerWingCellFlow(params: CornerWingCellFlowParams): void {
  applyCornerWingCellInteriors(params);
  applyCornerWingCellDoors(params);
}
