// Extracted canonical drawer render ops helpers.
//
// This keeps render_ops.ts as the public owner entrypoint while moving
// drawer-specific THREE mutations into dedicated helper modules.

import type { BuilderRenderDrawerDeps } from './render_drawer_ops_shared.js';
import { createApplyExternalDrawersOps } from './render_drawer_ops_external.js';
import { createApplyInternalDrawersOps } from './render_drawer_ops_internal.js';

export function createBuilderRenderDrawerOps(deps: BuilderRenderDrawerDeps) {
  const applyExternalDrawersOps = createApplyExternalDrawersOps(deps);
  const applyInternalDrawersOps = createApplyInternalDrawersOps(deps);

  return {
    applyExternalDrawersOps,
    applyInternalDrawersOps,
  };
}
