// Extracted canonical door render ops helpers.
//
// This keeps render_ops.ts as the public owner entrypoint while moving
// door-specific THREE mutations into dedicated helper modules.

import type { BuilderRenderDoorDeps } from './render_door_ops_shared.js';
import { createApplyHingedDoorsOps } from './render_door_ops_hinged.js';
import { createApplySlidingDoorsOps } from './render_door_ops_sliding.js';

export function createBuilderRenderDoorOps(deps: BuilderRenderDoorDeps) {
  const applySlidingDoorsOps = createApplySlidingDoorsOps(deps);
  const applyHingedDoorsOps = createApplyHingedDoorsOps(deps);

  return {
    applySlidingDoorsOps,
    applyHingedDoorsOps,
  };
}
