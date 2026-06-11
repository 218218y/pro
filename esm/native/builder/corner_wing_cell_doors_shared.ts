// Corner wing door public shared surface.
//
// Keep the public wing-cell door layer thin while dedicated modules own context/state,
// rendering/material policy, and split-cut normalization.

export type { CornerWingDoorContext, CornerWingDoorState } from './corner_wing_cell_doors_contracts.js';
export type { CornerWingDoorSegmentArgs } from './corner_wing_cell_doors_rendering.js';

export { createCornerWingDoorContext } from './corner_wing_cell_doors_context.js';
export {
  clampHandleAbsY,
  createCornerWingDoorState,
  defaultHandleAbsYForPart,
} from './corner_wing_cell_doors_state.js';
export {
  appendCornerDoorRenderEntry,
  createCornerDoorGroup,
  processCornerDoorVisual,
  readMirrorLayout,
  readScopedReaderAny,
} from './corner_wing_cell_doors_rendering.js';
export {
  mergeSplitCuts,
  partIdForSegment,
  readCustomSplitCutsY,
} from './corner_wing_cell_doors_split_policy.js';
