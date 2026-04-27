import { makeBoardCreator } from './board_factory.js';
import { resolveBuildFlowPlanInputs } from './build_flow_plan_inputs.js';
import { resolveBuildFlowPlanMaterials } from './build_flow_plan_materials.js';
import { resolveBuildFlowPlanLayout } from './build_flow_plan_layout.js';

import type { BuildFlowPlan, BuildFlowPlanResolveArgs } from './build_flow_plan_contracts.js';

export type { BuildFlowPlan } from './build_flow_plan_contracts.js';
export { collectModuleHeights } from './build_flow_plan_dimensions.js';

export function resolveBuildFlowPlan(args: BuildFlowPlanResolveArgs): BuildFlowPlan {
  const {
    App,
    THREE,
    state,
    ui,
    cfg,
    widthCm,
    heightCm,
    depthCm,
    doorsCount,
    sketchMode,
    getMaterialFn,
    addOutlines,
    calculateModuleStructureFn,
    toStr,
  } = args;

  const inputs = resolveBuildFlowPlanInputs({
    ui,
    cfg,
    widthCm,
    heightCm,
    depthCm,
    doorsCount,
    toStr,
  });
  const materials = resolveBuildFlowPlanMaterials({
    App,
    THREE,
    ui,
    cfg,
    toStr,
    getMaterialFn,
  });
  const layout = resolveBuildFlowPlanLayout({
    App,
    state,
    cfg,
    ui,
    totalW: inputs.totalW,
    woodThick: inputs.woodThick,
    doorsCount,
    calculateModuleStructureFn,
    splitActiveForBuild: inputs.splitActiveForBuild,
    lowerHeightCm: inputs.lowerHeightCm,
    H: inputs.H,
    D: inputs.D,
  });

  const internalDepth = Math.max(inputs.woodThick, layout.carcassD - inputs.depthReduction);
  const internalZ = -layout.carcassD / 2 + internalDepth / 2 + 0.005;
  const createBoard = makeBoardCreator({
    App,
    THREE,
    sketchMode,
    addOutlines,
  });

  return {
    ...inputs,
    internalDepth,
    internalZ,
    ...materials,
    ...layout,
    createBoard,
  };
}
