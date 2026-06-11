import { createInteriorSketchPlacementSupport } from './render_interior_sketch_support.js';

import type {
  InteriorSketchExtrasInput,
  InteriorSketchPlacementPlan,
  InteriorSketchResolvedThree,
  RenderInteriorSketchOpsContext,
} from './render_interior_sketch_ops_types.js';

export function createInteriorSketchExtrasPlacementPlan(
  owner: RenderInteriorSketchOpsContext,
  resolved: InteriorSketchExtrasInput,
  resolvedThree: InteriorSketchResolvedThree
): InteriorSketchPlacementPlan {
  const placementSupport = createInteriorSketchPlacementSupport({
    App: resolved.App,
    group: resolved.group,
    effectiveBottomY: resolved.effectiveBottomY,
    effectiveTopY: resolved.effectiveTopY,
    woodThick: resolved.woodThick,
    innerW: resolved.innerW,
    internalDepth: resolved.internalDepth,
    internalCenterX: resolved.internalCenterX,
    matCache: owner.matCache,
    THREE: resolvedThree.THREE,
    asObject: owner.asObject,
    renderOpsHandleCatch: owner.renderOpsHandleCatch,
    faces: resolved.faces,
  });

  return { placementSupport };
}
