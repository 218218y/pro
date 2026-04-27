import { getBuilderRegistry, getBuilderRenderOps } from '../runtime/builder_service_access.js';

import { markEdgeHandleDefaultNone } from './edge_handle_default_none_runtime.js';
import type { ModuleLoopRuntime } from './module_loop_pipeline_runtime.js';
import type { ModuleLoopMutableState } from './module_loop_pipeline_module_contracts.js';
import type { ResolvedModuleFrame } from './module_loop_pipeline_module_frame.js';

export function registerModuleHitBox(
  runtime: ModuleLoopRuntime,
  _state: ModuleLoopMutableState,
  index: number,
  frame: ResolvedModuleFrame
): void {
  const builderRenderOps = getBuilderRenderOps(runtime.App);
  const hitBox =
    builderRenderOps && typeof builderRenderOps.createModuleHitBox === 'function'
      ? builderRenderOps.createModuleHitBox({
          THREE: runtime.THREE,
          modWidth: frame.modWidth,
          cabinetBodyHeight: frame.moduleCabinetBodyHeight,
          D: frame.moduleTotalDepth,
          x: frame.moduleCenterX,
          y: runtime.startY + frame.moduleCabinetBodyHeight / 2,
          z: frame.moduleOuterZ,
          moduleIndex: index,
          __wpStack: runtime.stackKey,
        })
      : null;

  try {
    const reg = getBuilderRegistry(runtime.App);
    if (reg && typeof reg.registerModuleHitBox === 'function' && hitBox) {
      reg.registerModuleHitBox(index, hitBox);
    }
  } catch (_error) {
    // ignore registry wiring failures during preview/offline modes
  }
}

export function applyEdgeHandleDefaults(
  runtime: ModuleLoopRuntime,
  modDoors: number,
  startDoorOfModule: number
): void {
  try {
    const globalHandleType = runtime.cfg.globalHandleType;
    if (globalHandleType !== 'edge' || !runtime.App) return;
    const nDoors = Number(modDoors) || 0;
    if (nDoors >= 2 && Number.isFinite(startDoorOfModule)) {
      for (let di = 0; di + 1 < nDoors; di += 2) {
        const doorNum = Number(startDoorOfModule) + di;
        if (Number.isFinite(doorNum) && doorNum > 0) {
          markEdgeHandleDefaultNone(
            runtime.App,
            runtime.stackKey === 'bottom' ? 'bottom' : 'top',
            `d${doorNum}`
          );
        }
      }
    }
  } catch (_error) {
    // ignore cache hint failures
  }
}
