import { normalizeStackSplit } from '../features/stack_split/index.js';
import {
  getDefaultBaseLegWidthCm,
  normalizeBaseLegColor,
  normalizeBaseLegHeightCm,
  normalizeBaseLegStyle,
  normalizeBaseLegWidthCm,
} from '../features/base_leg_support.js';
import { readUiState } from './build_flow_readers.js';

import type { BuildFlowPlanInputs, BuildFlowPlanInputsArgs } from './build_flow_plan_contracts.js';
import type { UiRawInputsLike } from '../../../types';

export function resolveBuildFlowPlanInputs(args: BuildFlowPlanInputsArgs): BuildFlowPlanInputs {
  const { ui, cfg, widthCm, heightCm, depthCm, doorsCount, toStr } = args;

  const uiState = readUiState(ui);
  const rawUi: UiRawInputsLike = uiState?.raw || {};
  const stackSplitEnabled = !!uiState?.stackSplitEnabled;

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
  const splitSeamGapM = splitActiveForBuild ? 0.002 : 0;

  const H = Math.max(0.05, split.topHeightCm / 100 - splitSeamGapM);
  const totalW = widthCm / 100;
  const D = split.topDepthCm / 100;

  const isSliding = typeof cfg.wardrobeType !== 'undefined' && cfg.wardrobeType === 'sliding';
  const noMainWardrobe = !isSliding && doorsCount === 0;
  const depthReduction = isSliding ? 0.12 : 0.03;
  const baseType = toStr(ui.baseType, '');
  const baseLegStyle = normalizeBaseLegStyle(ui.baseLegStyle);
  const baseLegColor = normalizeBaseLegColor(ui.baseLegColor);
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
    splitActiveForBuild,
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
    baseLegHeightCm,
    baseLegWidthCm,
    baseTypeBottom: baseType,
    baseTypeTop: splitActiveForBuild ? '' : baseType,
    hasCornice: !!ui.hasCornice,
    corniceType: toStr(uiState?.corniceType, 'classic'),
    splitDoors: !!ui.splitDoors,
    isGroovesEnabled: !!ui.groovesEnabled,
    isInternalDrawersEnabled: !!ui.internalDrawersEnabled,
    woodThick: 0.018,
  };
}
