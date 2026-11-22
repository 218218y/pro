import type { BuiltInDeskHost } from '../../../types/built_in_desk.js';
import type { ModuleLoopRuntime } from './module_loop_pipeline_runtime.js';
import type { ModuleVerticalMetrics, ResolvedModuleFrame } from './module_loop_pipeline_module_frame.js';

export function resolveModuleBuiltInDeskHost(
  runtime: ModuleLoopRuntime,
  index: number,
  frame: ResolvedModuleFrame,
  metrics: ModuleVerticalMetrics
): BuiltInDeskHost {
  const cornerSide =
    runtime.ui.cornerMode === true ? (runtime.ui.cornerSide === 'left' ? 'left' : 'right') : null;
  const leftSide = index === 0 && cornerSide !== 'left';
  const rightSide = index === runtime.modules.length - 1 && cornerSide !== 'right';
  return {
    moduleKey: index,
    stack: runtime.stackKey === 'bottom' ? 'bottom' : 'top',
    geometry: {
      leftX: metrics.internalCenterX - metrics.innerW / 2,
      rightX: metrics.internalCenterX + metrics.innerW / 2,
      bottomY: metrics.effectiveBottomY,
      topY: metrics.effectiveTopY,
      backZ: frame.moduleInternalZ - frame.moduleInternalDepth / 2,
      frontZ: frame.braceFrontZ,
      thickness: runtime.shelfThick,
      leftSide,
      rightSide,
      leftWallThickness: runtime.woodThick,
      rightWallThickness: runtime.woodThick,
    },
  };
}
