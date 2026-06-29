import { computeModulesAndLayout } from './module_layout_pipeline.js';
import { readRecord } from './build_flow_readers.js';
import { collectModuleDepths, collectModuleHeights } from './build_flow_plan_dimensions.js';
import { readCorePureNumberArray } from './core_pure_number_contracts.js';

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
    stackSplitUnifiedFrame,
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
  const moduleInternalWidths = readCorePureNumberArray(readRecord(moduleLayout)?.moduleInternalWidths);

  const { moduleHeightsTotal, carcassH: topCarcassH } = collectModuleHeights({
    moduleCfgList,
    splitActiveForBuild,
    lowerHeightCm,
    H,
    woodThick,
  });

  const carcassH = stackSplitUnifiedFrame
    ? Math.max(topCarcassH, H + lowerHeightCm / 100 - woodThick)
    : topCarcassH;

  const { moduleDepthsTotal, carcassD } = collectModuleDepths({
    moduleCfgList,
    moduleInternalWidths,
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
