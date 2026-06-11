// Builder Module Loop Pipeline (ESM)
//
// Keeps the module-loop owner focused on orchestration only:
// - validate BuildContext
// - resolve normalized runtime/state
// - dispatch per-module execution

import { isBuildContext } from './build_context.js';
import { resolveModuleLoopRuntime } from './module_loop_pipeline_runtime.js';
import { runModuleLoopItem } from './module_loop_pipeline_module.js';

/**
 * Run the per-module build loop.
 *
 * @param {import('../../../types').BuildContextLike} ctx BuildContext
 * @returns {{currentX:number, globalDoorCounter:number}}
 */
export function buildModulesLoop(ctx: unknown) {
  if (!isBuildContext(ctx)) {
    throw new Error('[builder/module_loop] BuildContext required');
  }

  const runtime = resolveModuleLoopRuntime(ctx);
  const state = {
    currentX: -runtime.totalW / 2 + runtime.woodThick,
    globalDoorCounter: Number.isFinite(Number(runtime.flags.doorIdStart))
      ? Number(runtime.flags.doorIdStart)
      : 1,
  };

  runtime.modules.forEach((_module, index) => {
    runModuleLoopItem(runtime, state, index);
  });

  return state;
}
