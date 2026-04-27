import { getActiveDepthCmFromConfig } from '../features/special_dims/index.js';

import type { ModuleLoopRuntime } from './module_loop_pipeline_runtime.js';
import type { ModuleConfigLike } from '../../../types/index.js';

export interface ModuleDepthProfile {
  moduleTotalDepth: number;
  moduleInternalDepth: number;
  moduleInternalZ: number;
  moduleOuterZ: number;
  moduleFrontZ: number;
}

export function resolveModuleDepthProfile(
  runtime: ModuleLoopRuntime,
  config: ModuleConfigLike
): ModuleDepthProfile {
  const depthCmActive = getActiveDepthCmFromConfig(config);
  const moduleTotalDepth =
    typeof depthCmActive === 'number' && Number.isFinite(depthCmActive) && depthCmActive > 0
      ? depthCmActive / 100
      : runtime.D;
  const moduleInternalDepth = Math.max(runtime.woodThick, moduleTotalDepth - runtime.depthReduction);
  const moduleInternalZ = -runtime.D / 2 + moduleInternalDepth / 2 + 0.005;
  const moduleOuterZ = -runtime.D / 2 + moduleTotalDepth / 2;
  const moduleFrontZ = -runtime.D / 2 + moduleTotalDepth;

  return {
    moduleTotalDepth,
    moduleInternalDepth,
    moduleInternalZ,
    moduleOuterZ,
    moduleFrontZ,
  };
}
