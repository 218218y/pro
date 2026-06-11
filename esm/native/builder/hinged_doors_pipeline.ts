// Native Builder: hinged doors pipeline (ESM)
//
// Public orchestration seam for hinged-door rendering.
// - append per-module ops
// - apply accumulated ops after module emission

import { isBuildContext } from './build_context.js';
import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { requireThree } from './hinged_doors_shared.js';

export { appendHingedDoorOpsForModule } from './hinged_doors_module_ops.js';
export type { AppendHingedDoorOpsParams, HingedDoorPipelineCfg } from './hinged_doors_shared.js';

/**
 * Apply hinged door ops after all modules were processed.
 *
 * BuildContext-only API.
 *
 * @param {import('../../../types').BuildContextLike} ctx BuildContext
 * @returns {boolean} whether ops were applied
 */
export function applyHingedDoorOpsAfterModules(ctx: unknown): boolean {
  if (!isBuildContext(ctx)) {
    throw new Error('[builder/hinged_doors] BuildContext required');
  }

  const bc = ctx;

  const App = bc.App;
  const THREE = requireThree(bc);
  const cfg = bc.cfg;
  const opsList = (bc.hinged && bc.hinged.opsList) || null;

  if (!opsList || !Array.isArray(opsList) || opsList.length === 0) return false;

  const ro = getBuilderRenderOps(App);
  if (!App || !ro || typeof ro.applyHingedDoorsOps !== 'function') {
    throw new Error('[WardrobePro] Hinged door ops missing: applyHingedDoorsOps');
  }

  ro.applyHingedDoorsOps({
    THREE: THREE,
    cfg: cfg,
    __wpStack: bc && bc.flags && typeof bc.flags.__wpStack === 'string' ? String(bc.flags.__wpStack) : 'top',
    ops: opsList,
    doorStyle: (bc.strings && bc.strings.doorStyle) || '',
    globalFrontMat: bc.materials && bc.materials.globalFrontMat,
    createDoorVisual: bc.create && bc.create.createDoorVisual,
    createHandleMesh: bc.create && bc.create.createHandleMesh,
    getPartMaterial: bc.resolvers && bc.resolvers.getPartMaterial,
    getHandleType: bc.resolvers && bc.resolvers.getHandleType,
    isRemoveDoorMode: !!(bc.resolvers && bc.resolvers.isRemoveDoorMode),
    removeDoorsEnabled: !!(bc.resolvers && bc.resolvers.removeDoorsEnabled),
    isDoorRemoved: bc.resolvers && bc.resolvers.isDoorRemoved,
  });

  return true;
}
