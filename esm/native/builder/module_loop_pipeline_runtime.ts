import { createModuleDoorSpanResolver } from './module_loop_pipeline_runtime_shared.js';
import { resolveModuleLoopRuntimeBase } from './module_loop_pipeline_runtime_base.js';
import { resolveModuleLoopRuntimeResolvers } from './module_loop_pipeline_runtime_resolvers.js';

import type { BuildContextLike } from '../../../types/index.js';

export type { ModuleDoorSpan, ModuleLoopRuntime } from './module_loop_pipeline_runtime_contracts.js';

export function resolveModuleLoopRuntime(ctx: BuildContextLike) {
  const base = resolveModuleLoopRuntimeBase(ctx);
  const resolved = resolveModuleLoopRuntimeResolvers(ctx);

  return {
    ...base,
    ...resolved,
    computeModuleDoorSpan: createModuleDoorSpanResolver(base.hingedDoorPivotMap),
  };
}
