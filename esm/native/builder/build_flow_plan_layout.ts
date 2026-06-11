import { computeModulesAndLayout } from './module_layout_pipeline.js';
import { readRecord } from './build_flow_readers.js';
import { collectModuleDepths, collectModuleHeights } from './build_flow_plan_dimensions.js';

import type { BuildFlowPlanLayoutArgs, BuildFlowPlanLayoutMetrics } from './build_flow_plan_contracts.js';

type ComputeModulesAndLayoutFn = typeof computeModulesAndLayout;

export function resolveBuildFlowPlanLayout(
  args: BuildFlowPlanLayoutArgs & { computeModulesAndLayoutFn?: ComputeModulesAndLayoutFn }
): BuildFlowPlanLayoutMetrics {
  const {
    App,
    state,
    cfg,
    ui,
    totalW,
    woodThick,
    doorsCount,
    calculateModuleStructureFn,
    splitActiveForBuild,
    lowerHeightCm,
    H,
    D,
    computeModulesAndLayoutFn = computeModulesAndLayout,
  } = args;

  const moduleLayout = computeModulesAndLayoutFn({
    App,
    state,
    cfg,
    ui,
    totalW,
    woodThick,
    doorsCount,
    calculateModuleStructure: calculateModuleStructureFn,
  });

  const moduleCfgList = moduleLayout.moduleCfgList;
  const moduleInternalWidthsRaw = readRecord(moduleLayout)?.moduleInternalWidths;
  const moduleInternalWidths = Array.isArray(moduleInternalWidthsRaw)
    ? moduleInternalWidthsRaw.filter(
        (value): value is number => typeof value === 'number' && Number.isFinite(value)
      )
    : null;

  const { moduleHeightsTotal, carcassH } = collectModuleHeights({
    moduleCfgList,
    splitActiveForBuild,
    lowerHeightCm,
    H,
    woodThick,
  });

  const { moduleDepthsTotal, carcassD } = collectModuleDepths({
    moduleCfgList,
    D,
    woodThick,
  });

  return {
    modules: moduleLayout.modules,
    moduleCfgList,
    singleUnitWidth: moduleLayout.singleUnitWidth,
    moduleInternalWidths,
    hingedDoorPivotMap: moduleLayout.hingedDoorPivotMap,
    moduleHeightsTotal,
    moduleDepthsTotal,
    carcassH,
    carcassD,
  };
}
