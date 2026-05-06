import { HANDLE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import { getExtraLongEdgeHandleLiftAbsY, getMaxGlobalExternalDrawerHeightM } from './build_handle_policy.js';

import type { BuildFlowPlan } from './build_flow_plan.js';

export type BuildWardrobeHingedContext = {
  useHingedDoorOps: boolean;
  hingedDoorOpsList: unknown[] | null;
  globalHingedHandleAbsY: number;
};

function readWardrobeType(cfg: unknown): string {
  if (!cfg || typeof cfg !== 'object') return '';
  const value = Reflect.get(cfg, 'wardrobeType');
  return typeof value === 'string' ? value : '';
}

export function resolveBuildWardrobeHingedContext(args: {
  App: unknown;
  cfg: unknown;
  plan: BuildFlowPlan;
  startY: number;
  splitY: number;
  getBuilderRenderOpsFn?: typeof getBuilderRenderOps;
  readModulesConfigurationListFn?: typeof readModulesConfigurationListFromConfigSnapshot;
  getMaxGlobalExternalDrawerHeightMFn?: typeof getMaxGlobalExternalDrawerHeightM;
  getExtraLongEdgeHandleLiftAbsYFn?: typeof getExtraLongEdgeHandleLiftAbsY;
}): BuildWardrobeHingedContext {
  const {
    App,
    cfg,
    plan,
    startY,
    splitY,
    getBuilderRenderOpsFn = getBuilderRenderOps,
    readModulesConfigurationListFn = readModulesConfigurationListFromConfigSnapshot,
    getMaxGlobalExternalDrawerHeightMFn = getMaxGlobalExternalDrawerHeightM,
    getExtraLongEdgeHandleLiftAbsYFn = getExtraLongEdgeHandleLiftAbsY,
  } = args;

  const renderOps = getBuilderRenderOpsFn(App);
  const wardrobeType = readWardrobeType(cfg);
  const useHingedDoorOps =
    !plan.noMainWardrobe &&
    wardrobeType === 'hinged' &&
    !!(renderOps && typeof renderOps.applyHingedDoorsOps === 'function');

  if (!plan.noMainWardrobe && wardrobeType === 'hinged' && !useHingedDoorOps) {
    throw new Error('[WardrobePro] Hinged door ops missing: applyHingedDoorsOps');
  }

  const hingedDoorOpsList = useHingedDoorOps ? [] : null;
  let globalHingedHandleAbsY = HANDLE_DIMENSIONS.edge.defaultGlobalAbsYM;

  if (useHingedDoorOps) {
    const modulesCfg = Array.isArray(plan.moduleCfgList)
      ? plan.moduleCfgList
      : readModulesConfigurationListFn(cfg, 'modulesConfiguration');
    const maxDoorBottom = startY + plan.woodThick + getMaxGlobalExternalDrawerHeightMFn(modulesCfg);
    const stackShiftY = plan.splitActiveForBuild && Number.isFinite(splitY) ? splitY : 0;
    const maxDoorBottomAbs = maxDoorBottom + stackShiftY;

    if (maxDoorBottomAbs > HANDLE_DIMENSIONS.edge.drawerLiftThresholdYM) {
      const extraLongEdgeLift = getExtraLongEdgeHandleLiftAbsYFn(cfg, modulesCfg);
      globalHingedHandleAbsY =
        maxDoorBottomAbs + HANDLE_DIMENSIONS.edge.drawerLiftClearanceM + extraLongEdgeLift;
    }
  }

  return {
    useHingedDoorOps: !!useHingedDoorOps,
    hingedDoorOpsList,
    globalHingedHandleAbsY,
  };
}
