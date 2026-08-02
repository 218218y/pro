import {
  resolveModuleDepthProfile,
  resolveRearClearedPanelDepth,
} from './module_loop_pipeline_module_depth.js';
import { resolveRemovedFrameSideFrontClosurePlan } from './removed_frame_side_front_closure.js';

import type { ModuleLoopRuntime } from './module_loop_pipeline_runtime.js';
import type { ModuleConfigLike } from '../../../types/index.js';
import type { ModuleLoopMutableState } from './module_loop_pipeline_module_contracts.js';
import type { ResolvedModuleFrame } from './module_loop_pipeline_module_frame.js';
import type { RemovedFrameSideFrontClosurePlan } from './removed_frame_side_front_closure.js';

function isInsetHingedDoorMount(runtime: ModuleLoopRuntime): boolean {
  return runtime.cfg?.wardrobeType === 'hinged' && String(runtime.cfg?.doorMountMode || '') === 'inset';
}

function resolveFullFrontDividerPanel(
  runtime: ModuleLoopRuntime,
  panelDepth: number
): { depth: number; z: number } {
  return resolveRearClearedPanelDepth({
    cabinetDepth: runtime.D,
    panelDepth,
    woodThick: runtime.woodThick,
  });
}

type DividerFrontExtension = {
  left: boolean;
  right: boolean;
};

function readModuleDoorCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.trunc(value) : 1;
}

function resolveAdjacentFrontClosureExtension(args: {
  runtime: ModuleLoopRuntime;
  state: ModuleLoopMutableState;
  index: number;
  frame: ResolvedModuleFrame;
  currentPlan: RemovedFrameSideFrontClosurePlan | null | undefined;
}): DividerFrontExtension {
  const { runtime, state, index, frame, currentPlan } = args;
  const resolvedCurrentPlan =
    currentPlan === undefined
      ? resolveRemovedFrameSideFrontClosurePlan({
          cfg: runtime.cfg,
          moduleIndex: index,
          modulesLength: runtime.modules.length,
          frameSidePartIdPrefix: runtime.stackKey === 'bottom' ? 'lower_' : '',
          startDoorId: state.globalDoorCounter,
          moduleDoors: frame.modDoors,
        })
      : currentPlan;
  const nextIndex = index + 1;
  if (nextIndex >= runtime.modules.length) return { left: false, right: false };

  const nextModuleDoors = readModuleDoorCount(runtime.modules[nextIndex]?.doors);
  const nextPlan = resolveRemovedFrameSideFrontClosurePlan({
    cfg: runtime.cfg,
    moduleIndex: nextIndex,
    modulesLength: runtime.modules.length,
    frameSidePartIdPrefix: runtime.stackKey === 'bottom' ? 'lower_' : '',
    startDoorId: state.globalDoorCounter + frame.modDoors,
    moduleDoors: nextModuleDoors,
  });

  return {
    left: resolvedCurrentPlan?.side === 'left' || resolvedCurrentPlan?.side === 'both',
    right: nextPlan?.side === 'right' || nextPlan?.side === 'both',
  };
}

export function createInterDivider(
  runtime: ModuleLoopRuntime,
  state: ModuleLoopMutableState,
  index: number,
  frame: ResolvedModuleFrame,
  frontClosurePlan?: RemovedFrameSideFrontClosurePlan | null
): void {
  if (index >= runtime.modules.length - 1) return;

  const boundaryX = state.currentX + frame.modWidth;
  const createBoard = runtime.createBoard;
  const nextCfg: ModuleConfigLike = runtime.moduleCfgList[index + 1] || {};
  const nextDepth = resolveModuleDepthProfile(runtime, nextCfg);
  const adjacentFrontClosure = resolveAdjacentFrontClosureExtension({
    runtime,
    state,
    index,
    frame,
    currentPlan: frontClosurePlan,
  });

  const needsFullDepthInterWalls = !!(runtime.moduleIsCustom[index] || runtime.moduleIsCustom[index + 1]);
  if (!needsFullDepthInterWalls) {
    const divBodyH = Math.max(
      runtime.moduleBodyHeights[index] || runtime.cabinetBodyHeight,
      runtime.moduleBodyHeights[index + 1] || runtime.cabinetBodyHeight
    );
    const divBodyH2 = Math.max(runtime.woodThick, divBodyH - 2 * runtime.woodThick);
    const useInsetFullFrontDivider = isInsetHingedDoorMount(runtime);
    // Overlay dividers normally stop at the internal shelf volume. A fixed front
    // closure needs the adjacent divider to continue alongside it like an outer side.
    const extendLeftToFront = useInsetFullFrontDivider || adjacentFrontClosure.left;
    const extendRightToFront = useInsetFullFrontDivider || adjacentFrontClosure.right;

    if (Math.abs(frame.moduleInternalDepth - nextDepth.moduleInternalDepth) > 1e-6) {
      const leftId = `divider_inter_depthL_${index}`;
      const rightId = `divider_inter_depthR_${index}`;
      const leftPanel = extendLeftToFront
        ? resolveFullFrontDividerPanel(runtime, frame.moduleTotalDepth)
        : { depth: frame.moduleInternalDepth, z: frame.moduleInternalZ };
      const rightPanel = extendRightToFront
        ? resolveFullFrontDividerPanel(runtime, nextDepth.moduleTotalDepth)
        : { depth: nextDepth.moduleInternalDepth, z: nextDepth.moduleInternalZ };
      createBoard(
        runtime.woodThick / 2,
        divBodyH2,
        leftPanel.depth,
        boundaryX + runtime.woodThick / 4,
        runtime.startY + divBodyH / 2,
        leftPanel.z,
        runtime.getPartMaterial(leftId),
        leftId
      );
      createBoard(
        runtime.woodThick / 2,
        divBodyH2,
        rightPanel.depth,
        boundaryX + (3 * runtime.woodThick) / 4,
        runtime.startY + divBodyH / 2,
        rightPanel.z,
        runtime.getPartMaterial(rightId),
        rightId
      );
      return;
    }

    const divId = `divider_inter_${index}`;
    const dividerPanel =
      extendLeftToFront || extendRightToFront
        ? resolveFullFrontDividerPanel(runtime, Math.max(frame.moduleTotalDepth, nextDepth.moduleTotalDepth))
        : { depth: frame.moduleInternalDepth, z: frame.moduleInternalZ };
    createBoard(
      runtime.woodThick,
      divBodyH2,
      dividerPanel.depth,
      boundaryX + runtime.woodThick / 2,
      runtime.startY + divBodyH / 2,
      dividerPanel.z,
      runtime.getPartMaterial(divId),
      divId
    );
    return;
  }

  const leftH = runtime.moduleBodyHeights[index] || runtime.cabinetBodyHeight;
  const leftId = `divider_inter_fullL_${index}`;
  const leftPanel = resolveRearClearedPanelDepth({
    cabinetDepth: runtime.D,
    panelDepth: frame.moduleTotalDepth,
    woodThick: runtime.woodThick,
  });
  createBoard(
    runtime.woodThick,
    Math.max(runtime.woodThick, leftH - 2 * runtime.woodThick),
    leftPanel.depth,
    boundaryX + runtime.woodThick / 2,
    runtime.startY + leftH / 2,
    leftPanel.z,
    runtime.getPartMaterial(leftId),
    leftId
  );

  const rightH = runtime.moduleBodyHeights[index + 1] || runtime.cabinetBodyHeight;
  const rightId = `divider_inter_fullR_${index}`;
  const rightPanel = resolveRearClearedPanelDepth({
    cabinetDepth: runtime.D,
    panelDepth: nextDepth.moduleTotalDepth,
    woodThick: runtime.woodThick,
  });
  createBoard(
    runtime.woodThick,
    Math.max(runtime.woodThick, rightH - 2 * runtime.woodThick),
    rightPanel.depth,
    boundaryX + runtime.woodThick + runtime.woodThick / 2,
    runtime.startY + rightH / 2,
    rightPanel.z,
    runtime.getPartMaterial(rightId),
    rightId
  );
}
