// Native Builder: hinged doors per-module ops assembly (ESM)
//
// Public owner stays focused on module-level orchestration. Heavy normalization,
// full-door emission, and split-door segmentation now live in focused helpers.

import type { AppendHingedDoorOpsParams } from './hinged_doors_shared.js';
import {
  appendDrawerShadowPlane,
  createHingedDoorIterationState,
  createHingedDoorModuleOpsContext,
} from './hinged_doors_module_ops_shared.js';
import { appendFullHingedDoorOps } from './hinged_doors_module_ops_full.js';
import { appendSplitHingedDoorOps } from './hinged_doors_module_ops_split.js';

export function appendHingedDoorOpsForModule(params: AppendHingedDoorOpsParams): number {
  let globalDoorCounter =
    params && typeof params.globalDoorCounter === 'number' ? params.globalDoorCounter : 1;

  const ctx = createHingedDoorModuleOpsContext(params || {});
  if (!ctx) return globalDoorCounter;

  appendDrawerShadowPlane(ctx);

  for (let doorIndex = 0; doorIndex < ctx.moduleDoors; doorIndex++) {
    const state = createHingedDoorIterationState(ctx, doorIndex, globalDoorCounter);
    globalDoorCounter = state.nextGlobalDoorCounter;

    if (state.shouldSplitThisDoor) {
      appendSplitHingedDoorOps(ctx, state);
      continue;
    }

    appendFullHingedDoorOps(ctx, state);
  }

  return globalDoorCounter;
}
