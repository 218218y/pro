import type { ModuleLoopRuntime } from './module_loop_pipeline_runtime.js';
import type { ResolvedModuleFrame } from './module_loop_pipeline_module_frame.js';
import type { RemovedFrameSideFrontClosurePlan } from './removed_frame_side_construction_plan.js';

export type { RemovedFrameSideFrontClosurePlan } from './removed_frame_side_construction_plan.js';

function resolveFrontClosureMaterial(runtime: ModuleLoopRuntime, partId: string): unknown {
  const hasSpecificColor =
    runtime.cfg.isMultiColorMode === true &&
    typeof runtime.getPartColorValue === 'function' &&
    !!runtime.getPartColorValue(partId);
  if (!hasSpecificColor) return runtime.bodyMat;
  return runtime.getPartMaterial(partId) || runtime.bodyMat;
}

function requireFinitePositive(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`[builder/removed_frame_side_front_closure] Invalid ${label}`);
  }
  return value;
}

function requireFinite(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`[builder/removed_frame_side_front_closure] Invalid ${label}`);
  }
  return value;
}

export function renderRemovedFrameSideFrontClosure(args: {
  runtime: ModuleLoopRuntime;
  frame: ResolvedModuleFrame;
  plan: RemovedFrameSideFrontClosurePlan;
}): unknown {
  const { runtime, frame, plan } = args;
  if (!runtime || typeof runtime.createBoard !== 'function') {
    throw new Error('[builder/removed_frame_side_front_closure] createBoard missing');
  }

  const width = requireFinitePositive(frame.modWidth, 'module width');
  const woodThick = requireFinitePositive(runtime.woodThick, 'wood thickness');
  const cabinetBodyHeight = requireFinitePositive(frame.moduleCabinetBodyHeight, 'cabinet body height');
  const height = cabinetBodyHeight - 2 * woodThick;
  if (!(height > 0)) {
    throw new Error('[builder/removed_frame_side_front_closure] Front closure height is not positive');
  }

  const centerX = requireFinite(frame.moduleCenterX, 'module center X');
  const startY = requireFinite(runtime.startY, 'start Y');
  const internalDepth = requireFinitePositive(frame.moduleInternalDepth, 'module internal depth');
  const internalZ = requireFinite(frame.moduleInternalZ, 'module internal Z');
  const closureCenterZ = internalZ + internalDepth / 2 + woodThick / 2;

  return runtime.createBoard(
    width,
    height,
    woodThick,
    centerX,
    startY + cabinetBodyHeight / 2,
    closureCenterZ,
    resolveFrontClosureMaterial(runtime, plan.partId),
    plan.partId
  );
}

export function advanceDoorCounterPastFrontClosure(plan: RemovedFrameSideFrontClosurePlan): number {
  return plan.startDoorId + plan.moduleDoors;
}
