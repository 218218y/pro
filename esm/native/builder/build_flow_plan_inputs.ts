import { moduleHasHexCell } from '../features/hex_cell/index.js';
import { getActiveDepthCmFromConfig } from '../features/special_dims/index.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import { normalizeStackSplit } from '../features/stack_split/index.js';
import {
  getDefaultBaseLegWidthCm,
  normalizeBaseLegColor,
  normalizeBaseLegHeightCm,
  normalizeBaseLegStyle,
  normalizeBaseLegWidthCm,
} from '../features/base_leg_support.js';
import { normalizeBasePlinthHeightCm } from '../features/base_plinth_support.js';
import { readUiState } from './build_flow_readers.js';
import {
  CARCASS_INTERIOR_DIMENSIONS,
  resolveDoorMountThicknessesFromConfig,
  WARDROBE_DEFAULTS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';

import type { BuildFlowPlanInputs, BuildFlowPlanInputsArgs } from './build_flow_plan_contracts.js';
import type { UiRawInputsLike } from '../../../types';

const STACK_SPLIT_DIMENSION_EPSILON_CM = 0.001;

function areStackSplitOuterDimensionsEqual(args: {
  lowerDepthCm: number;
  lowerWidthCm: number;
  overallDepthCm: number;
  overallWidthCm: number;
}): boolean {
  const { lowerDepthCm, lowerWidthCm, overallDepthCm, overallWidthCm } = args;
  if (![lowerDepthCm, lowerWidthCm, overallDepthCm, overallWidthCm].every(Number.isFinite)) return false;
  return (
    Math.abs(lowerDepthCm - overallDepthCm) <= STACK_SPLIT_DIMENSION_EPSILON_CM &&
    Math.abs(lowerWidthCm - overallWidthCm) <= STACK_SPLIT_DIMENSION_EPSILON_CM
  );
}

function moduleConfigListHasActiveDepthOverride(list: unknown[]): boolean {
  if (!Array.isArray(list) || !list.length) return false;
  for (let i = 0; i < list.length; i += 1) {
    if (getActiveDepthCmFromConfig(list[i]) != null) return true;
  }
  return false;
}

function moduleConfigListHasHexCell(list: unknown[]): boolean {
  if (!Array.isArray(list) || !list.length) return false;
  for (let i = 0; i < list.length; i += 1) {
    if (moduleHasHexCell(list[i])) return true;
  }
  return false;
}

function hasStackSplitPerCellFrameBreakingGeometry(cfg: unknown): boolean {
  const upperModules = readModulesConfigurationListFromConfigSnapshot(cfg, 'modulesConfiguration');
  const lowerModules = readModulesConfigurationListFromConfigSnapshot(
    cfg,
    'stackSplitLowerModulesConfiguration'
  );
  return (
    moduleConfigListHasActiveDepthOverride(upperModules) ||
    moduleConfigListHasActiveDepthOverride(lowerModules) ||
    moduleConfigListHasHexCell(upperModules) ||
    moduleConfigListHasHexCell(lowerModules)
  );
}

export function resolveBuildFlowPlanInputs(args: BuildFlowPlanInputsArgs): BuildFlowPlanInputs {
  const { ui, cfg, widthCm, heightCm, depthCm, doorsCount, toStr } = args;

  const uiState = readUiState(ui);
  const rawUi: UiRawInputsLike = uiState?.raw || {};
  const isSliding = typeof cfg.wardrobeType !== 'undefined' && cfg.wardrobeType === 'sliding';
  const noMainWardrobe = !isSliding && doorsCount === 0;
  const stackSplitEnabled = !!uiState?.stackSplitEnabled && !noMainWardrobe;
  const stackSplitDecorativeSeparatorEnabled =
    stackSplitEnabled && !!uiState?.stackSplitDecorativeSeparatorEnabled;

  const split = normalizeStackSplit({
    stackSplitEnabled,
    overallHeightCm: heightCm,
    overallDepthCm: depthCm,
    overallWidthCm: widthCm,
    overallDoorsCount: doorsCount,
    rawLowerHeightCm: rawUi.stackSplitLowerHeight,
    rawLowerDepthCm: rawUi.stackSplitLowerDepth,
    rawLowerWidthCm: rawUi.stackSplitLowerWidth,
    rawLowerDoorsCount: rawUi.stackSplitLowerDoors,
    rawLowerDepthManual: rawUi.stackSplitLowerDepthManual,
    rawLowerWidthManual: rawUi.stackSplitLowerWidthManual,
    rawLowerDoorsManual: rawUi.stackSplitLowerDoorsManual,
  });

  const lowerHeightCm = split.lowerHeightCm;
  const lowerDepthCm = split.lowerDepthCm;
  const lowerWidthCm = split.lowerWidthCm;
  const lowerDoorsCount = split.lowerDoorsCount;
  const splitActiveForBuild = split.active;
  const resolvedThicknesses = resolveDoorMountThicknessesFromConfig(cfg);
  const woodThick = resolvedThicknesses.frameThicknessM;
  const shelfThick = resolvedThicknesses.shelfThicknessM;
  const stackSplitHasFrameBreakingPerCellGeometry =
    splitActiveForBuild && hasStackSplitPerCellFrameBreakingGeometry(cfg);
  const stackSplitUnifiedFrame =
    splitActiveForBuild &&
    !stackSplitDecorativeSeparatorEnabled &&
    !stackSplitHasFrameBreakingPerCellGeometry &&
    areStackSplitOuterDimensionsEqual({
      lowerDepthCm,
      lowerWidthCm,
      overallDepthCm: depthCm,
      overallWidthCm: widthCm,
    });
  const splitSeamGapM =
    splitActiveForBuild && !stackSplitUnifiedFrame ? WARDROBE_DEFAULTS.stackSplit.seamGapM : 0;

  const H = Math.max(
    CARCASS_INTERIOR_DIMENSIONS.minTopBodyHeightM,
    split.topHeightCm / 100 + (stackSplitUnifiedFrame ? woodThick : -splitSeamGapM)
  );
  const totalW = widthCm / 100;
  const D = split.topDepthCm / 100;

  const depthReduction = isSliding
    ? CARCASS_INTERIOR_DIMENSIONS.slidingDepthReductionM
    : CARCASS_INTERIOR_DIMENSIONS.hingedDepthReductionM;
  const baseType = toStr(ui.baseType, '');
  const baseLegStyle = normalizeBaseLegStyle(ui.baseLegStyle);
  const baseLegColor = normalizeBaseLegColor(ui.baseLegColor);
  const basePlinthHeightCm = normalizeBasePlinthHeightCm(ui.basePlinthHeightCm);
  const baseLegHeightCm = normalizeBaseLegHeightCm(ui.baseLegHeightCm);
  const baseLegWidthCm = normalizeBaseLegWidthCm(ui.baseLegWidthCm, getDefaultBaseLegWidthCm(baseLegStyle));

  return {
    uiState,
    rawUi,
    isCornerMode: !!ui.cornerMode,
    handleControlEnabled: !!ui.handleControl,
    showHangerEnabled: !!ui.showHanger,
    showContentsEnabled: !!ui.showContents,
    stackSplitEnabled,
    stackSplitDecorativeSeparatorEnabled,
    splitActiveForBuild,
    stackSplitUnifiedFrame,
    lowerHeightCm,
    lowerDepthCm,
    lowerWidthCm,
    lowerDoorsCount,
    splitSeamGapM,
    H,
    totalW,
    D,
    doorsCount,
    noMainWardrobe,
    depthReduction,
    doorStyle: toStr(ui.doorStyle, ''),
    baseLegStyle,
    baseLegColor,
    basePlinthHeightCm,
    baseLegHeightCm,
    baseLegWidthCm,
    baseTypeBottom: baseType,
    baseTypeTop: splitActiveForBuild && !stackSplitUnifiedFrame ? '' : baseType,
    hasCornice: !!ui.hasCornice,
    corniceType: toStr(uiState?.corniceType, 'classic'),
    splitDoors: !!ui.splitDoors,
    isGroovesEnabled: !!ui.groovesEnabled,
    isInternalDrawersEnabled: !!ui.internalDrawersEnabled,
    woodThick,
    shelfThick,
  };
}
