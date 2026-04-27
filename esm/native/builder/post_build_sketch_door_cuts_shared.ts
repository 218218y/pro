// Post-build sketch external-drawer door-cut shared seam (Pure ESM)
//
// Owns the canonical shared public surface for interval math, runtime assembly,
// and segmented-door rebuild/application helpers.

export type {
  ApplySketchDrawerDoorCutsArgs,
  RebuildSketchSegmentedDoorArgs,
  SketchDoorCutSelection,
  SketchDoorCutsRuntime,
  SketchDoorCutsRuntimeArgs,
  SketchDrawerCutSegment,
  SketchDrawerStackBounds,
} from './post_build_sketch_door_cuts_contracts.js';

export {
  normalizeSketchDrawerCutIntervals,
  subtractSketchDrawerIntervals,
  groupSketchDrawerStackBounds,
  expandSketchDrawerCutBounds,
} from './post_build_sketch_door_cuts_intervals.js';

export { createSketchDoorCutsRuntime } from './post_build_sketch_door_cuts_runtime.js';
export { rebuildSketchSegmentedDoor } from './post_build_sketch_door_cuts_rebuild.js';
export { applySketchDrawerDoorCuts } from './post_build_sketch_door_cuts_apply.js';
