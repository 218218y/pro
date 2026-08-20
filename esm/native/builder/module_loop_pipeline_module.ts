import { applyModuleContents } from './module_loop_pipeline_module_contents.js';
import {
  resolveModuleFrame,
  resolveModuleVerticalMetrics,
  writeInternalGridMap,
} from './module_loop_pipeline_module_frame.js';
import { createInterDivider } from './module_loop_pipeline_module_dividers.js';
import { applyEdgeHandleDefaults, registerModuleHitBox } from './module_loop_pipeline_module_registry.js';
import { applyHexCellGeometryForModule } from './module_loop_pipeline_hex_cell.js';
import { resolveRemovedFrameSideModuleConstructionPlan } from './removed_frame_side_construction_plan.js';

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

  const startDoorOfModule = state.globalDoorCounter;
  const removedSideConstruction = resolveRemovedFrameSideModuleConstructionPlan({
    constructionPlan: runtime.removedFrameSidePlan,
    capabilities: runtime.removedFrameSideCapabilities,
    moduleIndex: index,
    modulesLength: runtime.modules.length,
    startDoorId: startDoorOfModule,
    moduleDoors: frame.modDoors,
  });
  const frontClosurePlan = removedSideConstruction.frontClosure;

  registerModuleHitBox(runtime, state, index, frame);
  createInterDivider(runtime, state, index, frame);
  applyHexCellGeometryForModule(runtime, state, index, frame);

  const metrics = resolveModuleVerticalMetrics(runtime, frame);
  writeInternalGridMap(runtime, index, frame, metrics);

  if (!frontClosurePlan) applyEdgeHandleDefaults(runtime, frame.modDoors, startDoorOfModule);
  applyModuleContents(runtime, state, index, frame, metrics, startDoorOfModule, frontClosurePlan);

  state.currentX += frame.modWidth + (index < runtime.modules.length - 1 ? runtime.woodThick : 0);
}
