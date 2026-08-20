import {
  resolveModuleDepthProfile,
  resolveRearClearedPanelDepth,
} from './module_loop_pipeline_module_depth.js';
import type { ModuleLoopRuntime } from './module_loop_pipeline_runtime.js';
import type { ModuleConfigLike } from '../../../types/index.js';
import type { ModuleLoopMutableState } from './module_loop_pipeline_module_contracts.js';
import type { ResolvedModuleFrame } from './module_loop_pipeline_module_frame.js';

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

    // Hinged wardrobes use full-depth internal carcass walls so hinge mounting
    // matches the outer sides. Sliding wardrobes must keep regular internal
    // dividers within the shelf volume so the door tracks stay unobstructed.
    const useFullDepthRegularDivider = runtime.cfg?.wardrobeType !== 'sliding';
    if (Math.abs(frame.moduleInternalDepth - nextDepth.moduleInternalDepth) > 1e-6) {
      const leftId = `divider_inter_depthL_${index}`;
      const rightId = `divider_inter_depthR_${index}`;
      const leftPanel = useFullDepthRegularDivider
        ? resolveFullFrontDividerPanel(runtime, frame.moduleTotalDepth)
        : { depth: frame.moduleInternalDepth, z: frame.moduleInternalZ };
      const rightPanel = useFullDepthRegularDivider
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
    const dividerPanel = useFullDepthRegularDivider
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
  const leftPanel = resolveFullFrontDividerPanel(runtime, frame.moduleTotalDepth);
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
  const rightPanel = resolveFullFrontDividerPanel(runtime, nextDepth.moduleTotalDepth);
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
