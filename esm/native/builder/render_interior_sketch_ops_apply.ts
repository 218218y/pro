import { renderInteriorSketchOwnedBoxes } from './render_interior_sketch_ops_boxes.js';
import {
  renderInteriorSketchPendingFreeBoxDimensions,
  resolveInteriorSketchThreeAndDimensions,
} from './render_interior_sketch_ops_dimensions.js';
import {
  applyInteriorSketchOwnedDrawers,
  applyInteriorSketchOwnedRods,
  applyInteriorSketchOwnedShelves,
  applyInteriorSketchOwnedStorageBarriers,
} from './render_interior_sketch_ops_extras.js';
import { resolveInteriorSketchExtrasInput } from './render_interior_sketch_ops_input.js';
import { createInteriorSketchExtrasPlacementPlan } from './render_interior_sketch_ops_placement.js';

import type { RenderInteriorSketchOpsContext } from './render_interior_sketch_ops_types.js';

export function applyInteriorSketchExtrasOwner(owner: RenderInteriorSketchOpsContext, args: unknown): true {
  const resolved = resolveInteriorSketchExtrasInput(owner, args);
  if (!resolved) return true;

  const resolvedThree = resolveInteriorSketchThreeAndDimensions(owner, resolved);
  const placementPlan = createInteriorSketchExtrasPlacementPlan(owner, resolved, resolvedThree);
  const boxAbs = renderInteriorSketchOwnedBoxes({ owner, resolved, resolvedThree, placementPlan });

  applyInteriorSketchOwnedStorageBarriers(resolved, owner);
  renderInteriorSketchPendingFreeBoxDimensions(resolvedThree);
  applyInteriorSketchOwnedShelves({ resolved, resolvedThree, placementPlan, boxAbs });
  applyInteriorSketchOwnedRods({ owner, resolved, resolvedThree, placementPlan });
  applyInteriorSketchOwnedDrawers({ owner, resolved, resolvedThree });

  return true;
}
