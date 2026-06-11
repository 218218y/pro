// Canonical sketch drawer seams.
//
// Keeps render_interior_sketch_ops.ts wired to a stable entrypoint while
// external/internal sketch drawer logic lives in dedicated owners.

export type {
  ApplySketchExternalDrawersArgs,
  ApplySketchInternalDrawersOwnerArgs as ApplySketchInternalDrawersArgs,
} from './render_interior_sketch_drawers_shared.js';

export {
  normalizeSketchDoorStyle,
  resolveSketchDoorStyle,
  resolveSketchDoorStyleMap,
} from './render_interior_sketch_drawers_shared.js';

export { applySketchExternalDrawers } from './render_interior_sketch_drawers_external.js';
export { applySketchInternalDrawers } from './render_interior_sketch_drawers_internal.js';
