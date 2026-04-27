import { applyCarcassAndGetCabinetMetrics } from './carcass_pipeline.js';

import type { AppContainer, BuilderOutlineFn, ThreeLike, UnknownRecord } from '../../../types';
import type { BuildFlowPlan } from './build_flow_plan.js';

export type BuildWardrobeCarcassMetrics = {
  startY: number;
  cabinetBodyHeight: number;
  cabinetTopY: number;
  splitLineY: number;
};

export function computeBuildWardrobeSplitLineY(args: {
  startY: number;
  cabinetBodyHeight: number;
  woodThick: number;
}): number {
  const { startY, cabinetBodyHeight, woodThick } = args;
  const internalTotalHeight = startY + cabinetBodyHeight - woodThick - (startY + woodThick);
  const gridStep = internalTotalHeight / 6;
  return startY + woodThick + 4 * gridStep;
}

export function resolveBuildWardrobeCarcassMetrics(args: {
  App: AppContainer;
  THREE: ThreeLike | null;
  cfg: UnknownRecord;
  plan: BuildFlowPlan;
  sketchMode: boolean;
  addOutlinesMesh: BuilderOutlineFn | null;
  applyCarcassAndGetCabinetMetricsFn?: typeof applyCarcassAndGetCabinetMetrics;
}): BuildWardrobeCarcassMetrics {
  const {
    App,
    THREE,
    cfg,
    plan,
    sketchMode,
    addOutlinesMesh,
    applyCarcassAndGetCabinetMetricsFn = applyCarcassAndGetCabinetMetrics,
  } = args;

  const carcassArgs: Parameters<typeof applyCarcassAndGetCabinetMetrics>[0] = {
    App,
    THREE,
    cfg,
    totalW: plan.totalW,
    D: plan.carcassD,
    H: plan.carcassH,
    woodThick: plan.woodThick,
    baseType: plan.baseTypeTop,
    baseLegStyle: plan.baseLegStyle,
    baseLegHeightCm: plan.baseLegHeightCm,
    baseLegWidthCm: plan.baseLegWidthCm,
    doorsCount: plan.doorsCount,
    hasCornice: plan.hasCornice,
    corniceType: plan.corniceType,
    moduleInternalWidths: plan.moduleInternalWidths,
    moduleHeightsTotal: plan.moduleHeightsTotal,
    moduleDepthsTotal: plan.moduleDepthsTotal,
    addOutlines: addOutlinesMesh,
    __sketchMode: sketchMode,
    legMat: plan.legMat,
    masoniteMat: plan.masoniteMat,
    whiteMat: plan.whiteMat,
    bodyMat: plan.bodyMat,
    getPartColorValue: plan.getPartColorValue,
    getPartMaterial: plan.getPartMaterial,
    baseHeight: 0,
    startY: 0,
  };

  const carcassRes = plan.noMainWardrobe
    ? {
        startY: 0,
        cabinetBodyHeight: plan.carcassH,
        cabinetTopY: plan.carcassH,
      }
    : applyCarcassAndGetCabinetMetricsFn(carcassArgs);

  const startY = carcassRes.startY;
  const cabinetBodyHeight = carcassRes.cabinetBodyHeight;
  const cabinetTopY = carcassRes.cabinetTopY;

  return {
    startY,
    cabinetBodyHeight,
    cabinetTopY,
    splitLineY: computeBuildWardrobeSplitLineY({
      startY,
      cabinetBodyHeight,
      woodThick: plan.woodThick,
    }),
  };
}
