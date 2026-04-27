// Thin canonical seam for corner wing interior runtime/cell contracts.
// Keep callers stable while focused interior owners hold the real runtime and
// per-cell derivation logic.

export type {
  CornerWingInteriorCellRuntime,
  CornerWingInteriorLayoutOps,
  CornerWingInteriorRuntime,
} from './corner_wing_cell_interiors_contracts.js';
export { createCornerWingInteriorRuntime } from './corner_wing_cell_interiors_runtime.js';
export {
  createCornerWingInteriorCellRuntime,
  getCornerCellInnerFacesX,
} from './corner_wing_cell_interiors_cell.js';
