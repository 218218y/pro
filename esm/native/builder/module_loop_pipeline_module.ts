import { applyModuleContents } from './module_loop_pipeline_module_contents.js';
import {
  resolveModuleFrame,
  resolveModuleVerticalMetrics,
  writeInternalGridMap,
} from './module_loop_pipeline_module_frame.js';
import { createInterDivider } from './module_loop_pipeline_module_dividers.js';
import { applyEdgeHandleDefaults, registerModuleHitBox } from './module_loop_pipeline_module_registry.js';

import type { ModuleLoopRuntime } from './module_loop_pipeline_runtime.js';

export type { ModuleLoopMutableState } from './module_loop_pipeline_module_contracts.js';
import type { ModuleLoopMutableState } from './module_loop_pipeline_module_contracts.js';

export function runModuleLoopItem(
  runtime: ModuleLoopRuntime,
  state: ModuleLoopMutableState,
  index: number
): void {
  const mod = runtime.modules[index];
  const frame = resolveModuleFrame(runtime, state, index, mod?.doors);

  registerModuleHitBox(runtime, state, index, frame);
  createInterDivider(runtime, state, index, frame);

  const metrics = resolveModuleVerticalMetrics(runtime, frame);
  writeInternalGridMap(runtime, index, frame, metrics);

  const startDoorOfModule = state.globalDoorCounter;
  applyEdgeHandleDefaults(runtime, frame.modDoors, startDoorOfModule);
  applyModuleContents(runtime, state, index, frame, metrics, startDoorOfModule);

  state.currentX += frame.modWidth + (index < runtime.modules.length - 1 ? runtime.woodThick : 0);
}
