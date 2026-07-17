import { CARCASS_INTERIOR_DIMENSIONS } from '../../shared/dimensions/carcass_interior_policy.js';
import { resolveBuildFlowPlanInputs } from './build_flow_plan_inputs.js';

import type { BuildFlowPlan, BuildFlowPlanResolveArgs } from './build_flow_plan_contracts.js';

export type { BuildFlowPlan } from './build_flow_plan_contracts.js';
export { collectModuleHeights } from './build_flow_plan_dimensions.js';

export function resolveBuildFlowPlan(args: BuildFlowPlanResolveArgs): BuildFlowPlan {
  const {
    orchestration,
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
  const materials = orchestration.resolvePlanMaterials({
    THREE,
    ui,
    cfg,
    sketchMode,
    toStr,
    getMaterialFn,
  });
  const layout = orchestration.computeModuleLayout({
    state,
    cfg,
    ui,
    totalW: inputs.totalW,
    woodThick: inputs.woodThick,
    doorsCount,
    calculateModuleStructureFn,
    splitActiveForBuild: inputs.splitActiveForBuild,
    stackSplitUnifiedFrame: inputs.stackSplitUnifiedFrame,
    lowerHeightCm: inputs.lowerHeightCm,
    H: inputs.H,
    D: inputs.D,
  });

  const internalDepth = Math.max(inputs.woodThick, layout.carcassD - inputs.depthReduction);
  const internalZ = -layout.carcassD / 2 + internalDepth / 2 + CARCASS_INTERIOR_DIMENSIONS.internalBackInsetM;
  const createBoard = orchestration.createBoardFactory({
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
