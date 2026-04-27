import { resolveModuleDepthProfile } from './module_loop_pipeline_module_depth.js';

import type { ModuleLoopRuntime } from './module_loop_pipeline_runtime.js';
import type { ModuleConfigLike } from '../../../types/index.js';
import type { ModuleLoopMutableState } from './module_loop_pipeline_module_contracts.js';
import type { ResolvedModuleFrame } from './module_loop_pipeline_module_frame.js';

export function createInterDivider(
  runtime: ModuleLoopRuntime,
  state: ModuleLoopMutableState,
  index: number,
  frame: ResolvedModuleFrame
): void {
  if (index >= runtime.modules.length - 1) return;

  const boundaryX = state.currentX + frame.modWidth;
  const createBoard = runtime.createBoard;
  const nextCfg: ModuleConfigLike = runtime.moduleCfgList[index + 1] || {};
  const nextDepth = resolveModuleDepthProfile(runtime, nextCfg);

  const needsFullDepthInterWalls = !!(runtime.moduleIsCustom[index] || runtime.moduleIsCustom[index + 1]);
  if (!needsFullDepthInterWalls) {
    const divBodyH = Math.max(
      runtime.moduleBodyHeights[index] || runtime.cabinetBodyHeight,
      runtime.moduleBodyHeights[index + 1] || runtime.cabinetBodyHeight
    );
    const divBodyH2 = Math.max(runtime.woodThick, divBodyH - 2 * runtime.woodThick);

    if (Math.abs(frame.moduleInternalDepth - nextDepth.moduleInternalDepth) > 1e-6) {
      const leftId = `divider_inter_depthL_${index}`;
      const rightId = `divider_inter_depthR_${index}`;
      createBoard(
        runtime.woodThick / 2,
        divBodyH2,
        frame.moduleInternalDepth,
        boundaryX + runtime.woodThick / 4,
        runtime.startY + divBodyH / 2,
        frame.moduleInternalZ,
        runtime.getPartMaterial(leftId),
        leftId
      );
      createBoard(
        runtime.woodThick / 2,
        divBodyH2,
        nextDepth.moduleInternalDepth,
        boundaryX + (3 * runtime.woodThick) / 4,
        runtime.startY + divBodyH / 2,
        nextDepth.moduleInternalZ,
        runtime.getPartMaterial(rightId),
        rightId
      );
      return;
    }

    const divId = `divider_inter_${index}`;
    createBoard(
      runtime.woodThick,
      divBodyH2,
      frame.moduleInternalDepth,
      boundaryX + runtime.woodThick / 2,
      runtime.startY + divBodyH / 2,
      frame.moduleInternalZ,
      runtime.getPartMaterial(divId),
      divId
    );
    return;
  }

  const leftH = runtime.moduleBodyHeights[index] || runtime.cabinetBodyHeight;
  const leftId = `divider_inter_fullL_${index}`;
  createBoard(
    runtime.woodThick,
    Math.max(runtime.woodThick, leftH - 2 * runtime.woodThick),
    frame.moduleTotalDepth,
    boundaryX + runtime.woodThick / 2,
    runtime.startY + leftH / 2,
    frame.moduleOuterZ,
    runtime.getPartMaterial(leftId),
    leftId
  );

  const rightH = runtime.moduleBodyHeights[index + 1] || runtime.cabinetBodyHeight;
  const rightId = `divider_inter_fullR_${index}`;
  createBoard(
    runtime.woodThick,
    Math.max(runtime.woodThick, rightH - 2 * runtime.woodThick),
    nextDepth.moduleTotalDepth,
    boundaryX + runtime.woodThick + runtime.woodThick / 2,
    runtime.startY + rightH / 2,
    nextDepth.moduleOuterZ,
    runtime.getPartMaterial(rightId),
    rightId
  );
}
