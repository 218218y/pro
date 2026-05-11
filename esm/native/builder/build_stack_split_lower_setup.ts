import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { getWardrobeGroup } from '../runtime/render_access.js';
import { writeStackSplitLowerTopY } from '../runtime/cache_access.js';
import {
  CARCASS_INTERIOR_DIMENSIONS,
  CARCASS_SHELL_DIMENSIONS,
  DEFAULT_STACK_SPLIT_LOWER_HEIGHT,
  HANDLE_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import { applyCarcassAndGetCabinetMetrics } from './carcass_pipeline.js';
import { computeModulesAndLayout } from './module_layout_pipeline.js';
import { readFiniteNumberArray, readRecord } from './build_flow_readers.js';
import { getExtraLongEdgeHandleLiftAbsY, getMaxGlobalExternalDrawerHeightM } from './build_handle_policy.js';
import {
  buildBottomModuleConfigSeed,
  computeBottomModulesCount,
  makeBottomUi,
} from './build_stack_split_bottom_layout.js';
import {
  buildShiftedBottomHingedPivotMap,
  createBottomHandleTypeResolver,
} from './build_stack_split_bottom_handles.js';

import type {
  BuildStackSplitLowerUnitArgs,
  PreparedStackSplitLowerSetup,
} from './build_stack_split_contracts.js';

export function prepareStackSplitLowerSetup(
  args: BuildStackSplitLowerUnitArgs
): PreparedStackSplitLowerSetup {
  const group = readRecord(getWardrobeGroup(args.App));
  const splitBottomHeightCm =
    Number.isFinite(args.lowerHeightCm) && args.lowerHeightCm > 0
      ? args.lowerHeightCm
      : Math.min(args.heightCm, DEFAULT_STACK_SPLIT_LOWER_HEIGHT);
  const splitBottomDepthCm =
    Number.isFinite(args.lowerDepthCm) && args.lowerDepthCm > 0 ? args.lowerDepthCm : args.depthCm;

  const bottomD = splitBottomDepthCm / 100;
  const bottomH = splitBottomHeightCm / 100;
  const splitMaxDepth = Math.max(args.carcassDepthM || 0, bottomD || 0);
  const splitDzBottom = Number.isFinite(splitMaxDepth) ? (bottomD - splitMaxDepth) / 2 : 0;
  const splitDzTop = Number.isFinite(splitMaxDepth) ? (args.carcassDepthM - splitMaxDepth) / 2 : 0;
  const splitY = bottomH + args.splitSeamGapM;

  const splitBottomStartIndex = group && Array.isArray(group.children) ? group.children.length : -1;
  const bottomWidthCm =
    Number.isFinite(args.lowerWidthCm) && args.lowerWidthCm > 0
      ? Math.round(Number(args.lowerWidthCm))
      : args.widthCm;
  const bottomDoorsCount =
    Number.isFinite(args.lowerDoorsCount) && args.lowerDoorsCount >= 0
      ? Math.max(0, Math.round(Number(args.lowerDoorsCount)))
      : args.doorsCount;
  const bottomTotalW = bottomWidthCm / 100;

  const uiBottom = makeBottomUi({ ui: args.ui, bottomDoorsCount, topDoorsCount: args.doorsCount });
  const bottomModulesCount = computeBottomModulesCount({
    cfg: args.cfg,
    uiBottom,
    bottomDoorsCount,
    calculateModuleStructure: args.calculateModuleStructure,
  });
  const bottomModuleCfgSeed = buildBottomModuleConfigSeed({
    App: args.App,
    cfg: args.cfg,
    bottomModulesCount,
  });

  const bottomLayout = computeModulesAndLayout({
    App: args.App,
    state: null,
    cfg: Object.assign({}, args.cfg, { modulesConfiguration: bottomModuleCfgSeed }),
    ui: uiBottom,
    totalW: bottomTotalW,
    woodThick: args.woodThick,
    doorsCount: bottomDoorsCount,
    calculateModuleStructure: args.calculateModuleStructure,
  });

  const bottomModules = bottomLayout.modules;
  const bottomModuleCfgList = bottomLayout.moduleCfgList;
  const bottomSingleUnitWidth = bottomLayout.singleUnitWidth;
  const bottomLayoutRec = readRecord(bottomLayout);
  const bottomModuleInternalWidths = readFiniteNumberArray(bottomLayoutRec?.moduleInternalWidths);
  const bottomHingedDoorPivotBase = readRecord(bottomLayoutRec?.hingedDoorPivotMap);

  const bottomModuleHeightsTotal = Array.isArray(bottomModules) ? bottomModules.map(() => bottomH) : null;
  const bottomModuleDepthsTotal = Array.isArray(bottomModules) ? bottomModules.map(() => bottomD) : null;

  const bottomCarcassRes = applyCarcassAndGetCabinetMetrics({
    App: args.App,
    THREE: args.THREE,
    cfg: args.cfg,
    totalW: bottomTotalW,
    D: bottomD,
    H: bottomH,
    woodThick: args.woodThick,
    baseType: args.baseTypeBottom,
    baseLegStyle: args.baseLegStyle,
    basePlinthHeightCm: args.basePlinthHeightCm,
    baseLegHeightCm: args.baseLegHeightCm,
    baseLegWidthCm: args.baseLegWidthCm,
    doorsCount: bottomDoorsCount,
    hasCornice: false,
    moduleInternalWidths: bottomModuleInternalWidths,
    moduleHeightsTotal: bottomModuleHeightsTotal,
    moduleDepthsTotal: bottomModuleDepthsTotal,
    addOutlines: args.addOutlinesMesh,
    __sketchMode: args.sketchMode,
    legMat: args.legMat,
    masoniteMat: args.masoniteMat,
    whiteMat: args.whiteMat,
    bodyMat: args.bodyMat,
    getPartColorValue: args.getPartColorValue,
    getPartMaterial: args.getPartMaterial,
    partIdPrefix: 'lower_',
    baseHeight: 0,
    startY: 0,
  });

  const bottomStartY = bottomCarcassRes.startY;
  const bottomCabinetBodyHeight = bottomCarcassRes.cabinetBodyHeight;
  const bottomCabinetTopY = bottomCarcassRes.cabinetTopY;
  const bottomInternalDepth = Math.max(args.woodThick, bottomD - args.depthReduction);
  const bottomInternalZ =
    -bottomD / 2 + bottomInternalDepth / 2 + CARCASS_INTERIOR_DIMENSIONS.internalBackInsetM;
  const bottomInternalTotalHeight =
    bottomStartY + bottomCabinetBodyHeight - args.woodThick - (bottomStartY + args.woodThick);
  const bottomGridStep = bottomInternalTotalHeight / CARCASS_SHELL_DIMENSIONS.drawerGridDivisions;
  const bottomSplitLineY =
    bottomStartY + args.woodThick + CARCASS_SHELL_DIMENSIONS.drawerSplitGridLineIndex * bottomGridStep;

  writeStackSplitLowerTopY(args.App, bottomCabinetTopY);

  const lowerDoorIdStart = 1000;
  const lowerDoorIdOffset = lowerDoorIdStart - 1;
  const bottomHingedDoorPivotMap = buildShiftedBottomHingedPivotMap({
    cfg: args.cfg,
    bottomModules,
    bottomTotalW,
    woodThick: args.woodThick,
    bottomSingleUnitWidth,
    bottomModuleInternalWidths,
    bottomHingedDoorPivotBase,
    lowerDoorIdOffset,
  });

  const getHandleTypeBottom = createBottomHandleTypeResolver({
    App: args.App,
    cfg: args.cfg,
    doorState: args.doorState,
    handleControlEnabled: args.handleControlEnabled,
    bottomDoorsCount,
    topDoorsCount: args.doorsCount,
    lowerDoorIdStart,
    lowerDoorIdOffset,
    getHandleTypeTop: args.getHandleType,
  });

  const lowerRenderOps = getBuilderRenderOps(args.App);
  const useLowerHingedDoorOps =
    args.cfg.wardrobeType === 'hinged' &&
    !!(lowerRenderOps && typeof lowerRenderOps.applyHingedDoorsOps === 'function');
  const lowerHingedDoorOpsList = useLowerHingedDoorOps ? [] : null;

  let lowerGlobalHingedHandleAbsY = HANDLE_DIMENSIONS.edge.defaultGlobalAbsYM;
  if (useLowerHingedDoorOps) {
    const maxDoorBottom =
      bottomStartY + args.woodThick + getMaxGlobalExternalDrawerHeightM(bottomModuleCfgList);
    if (maxDoorBottom > HANDLE_DIMENSIONS.edge.drawerLiftThresholdYM) {
      lowerGlobalHingedHandleAbsY =
        maxDoorBottom +
        HANDLE_DIMENSIONS.edge.drawerLiftClearanceM +
        getExtraLongEdgeHandleLiftAbsY(args.cfg, bottomModuleCfgList);
    }
  }

  return {
    group,
    splitBottomStartIndex,
    splitDzBottom: Number.isFinite(splitDzBottom) ? splitDzBottom : 0,
    splitDzTop: Number.isFinite(splitDzTop) ? splitDzTop : 0,
    splitY,
    splitBottomHeightCm,
    splitBottomDepthCm,
    bottomWidthCm,
    bottomDoorsCount,
    bottomTotalW,
    bottomD,
    bottomH,
    uiBottom,
    bottomModules,
    bottomModuleCfgList,
    bottomSingleUnitWidth,
    bottomModuleInternalWidths,
    bottomHingedDoorPivotMap,
    bottomStartY,
    bottomCabinetBodyHeight,
    bottomCabinetTopY,
    bottomInternalDepth,
    bottomInternalZ,
    bottomSplitLineY,
    lowerDoorIdStart,
    useLowerHingedDoorOps,
    lowerHingedDoorOpsList,
    lowerGlobalHingedHandleAbsY,
    getHandleTypeBottom,
  };
}
