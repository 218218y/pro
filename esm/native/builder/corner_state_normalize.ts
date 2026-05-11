// Corner wing: state normalization
//
// The public owner now stays focused on orchestration while parsing,
// stack/config policy, and placement math live in dedicated helpers.

import type { AppContainer } from '../../../types/index.js';
import { readRuntimeScalarOrDefaultFromApp } from '../runtime/runtime_selectors.js';
import { getDoorsArray, getDrawersArray } from '../runtime/render_access.js';
import { getBuildUIFromPlatform } from '../runtime/platform_access.js';

export type { CornerBuildMeta } from './corner_state_normalize_contracts.js';
import type { CornerBuildMeta, NormalizedCornerWingState } from './corner_state_normalize_contracts.js';
import { asCornerBuildUI } from './corner_state_normalize_shared.js';
import { createCornerNormalizedConfigState } from './corner_state_normalize_config.js';
import {
  resolveCornerWingFlags,
  resolveCornerWingMetrics,
  resolveCornerWingPlacement,
  resolveCornerWingStackMeta,
} from './corner_state_normalize_layout.js';

export function normalizeCornerWingState(args: {
  App: AppContainer;
  mainW: number;
  mainH: number;
  mainD: number;
  woodThick: number;
  startY: number;
  meta: CornerBuildMeta | null | undefined;
}): NormalizedCornerWingState {
  const { App, mainW, mainH, mainD, woodThick, startY, meta } = args;

  const uiAny = asCornerBuildUI(getBuildUIFromPlatform(App));
  const __sketchMode = !!readRuntimeScalarOrDefaultFromApp(App, 'sketchMode', false);
  const stackMeta = resolveCornerWingStackMeta(meta);
  const metrics = resolveCornerWingMetrics({
    uiAny,
    mainH,
    mainD,
    woodThick,
    startY,
    __stackKey: stackMeta.__stackKey,
    __stackSplitEnabled: stackMeta.__stackSplitEnabled,
  });
  const flags = resolveCornerWingFlags({
    App,
    uiAny,
    __stackKey: stackMeta.__stackKey,
    __stackSplitEnabled: stackMeta.__stackSplitEnabled,
  });

  getDrawersArray(App);
  getDoorsArray(App);

  const configState = createCornerNormalizedConfigState({
    App,
    uiAny,
    __stackKey: stackMeta.__stackKey,
    __stackSplitEnabled: stackMeta.__stackSplitEnabled,
  });
  const placement = resolveCornerWingPlacement({
    uiAny,
    mainW,
    mainD,
    startY,
    wingH: metrics.wingH,
    wingD: metrics.wingD,
    cornerSide: metrics.cornerSide,
    __baseTypeOverride: stackMeta.__baseTypeOverride,
    __baseLegStyleOverride: stackMeta.__baseLegStyleOverride,
    __baseLegColorOverride: stackMeta.__baseLegColorOverride,
    __basePlinthHeightCmOverride: stackMeta.__basePlinthHeightCmOverride,
    __baseLegHeightCmOverride: stackMeta.__baseLegHeightCmOverride,
    __baseLegWidthCmOverride: stackMeta.__baseLegWidthCmOverride,
    __stackKey: stackMeta.__stackKey,
    __stackSplitEnabled: stackMeta.__stackSplitEnabled,
  });

  return {
    uiAny,
    __sketchMode,
    __stackKey: stackMeta.__stackKey,
    __stackSplitEnabled: stackMeta.__stackSplitEnabled,
    __stackOffsetZ: stackMeta.__stackOffsetZ,
    __mirrorX: metrics.__mirrorX,
    cornerSide: metrics.cornerSide,
    cornerConnectorEnabled: metrics.cornerConnectorEnabled,
    wingLengthCM: metrics.wingLengthCM,
    wingW: metrics.wingW,
    wingH: metrics.wingH,
    wingD: metrics.wingD,
    blindWidth: metrics.blindWidth,
    activeWidth: metrics.activeWidth,
    activeFaceCenter: metrics.activeFaceCenter,
    removeDoorsEnabled: flags.removeDoorsEnabled,
    doorStyle: flags.doorStyle,
    splitDoors: flags.splitDoors,
    groovesEnabled: flags.groovesEnabled,
    internalDrawersEnabled: flags.internalDrawersEnabled,
    showHangerEnabled: flags.showHangerEnabled,
    showContentsEnabled: flags.showContentsEnabled,
    hasCorniceEnabled: flags.hasCorniceEnabled,
    __corniceAllowedForThisStack: flags.__corniceAllowedForThisStack,
    __corniceTypeNorm: flags.__corniceTypeNorm,
    __cfg: configState.__cfg,
    config: configState.config,
    __removedDoorsMap: configState.__removedDoorsMap,
    __stackScopePartKey: configState.__stackScopePartKey,
    __isDoorRemoved: configState.__isDoorRemoved,
    baseType: placement.baseType,
    baseLegStyle: placement.baseLegStyle,
    baseLegColor: placement.baseLegColor,
    basePlinthHeightCm: placement.basePlinthHeightCm,
    baseLegHeightCm: placement.baseLegHeightCm,
    baseLegWidthCm: placement.baseLegWidthCm,
    baseH: placement.baseH,
    stackOffsetY: placement.stackOffsetY,
    cabinetBodyHeight: placement.cabinetBodyHeight,
    cornerWallL: placement.cornerWallL,
    cornerOX: placement.cornerOX,
    cornerOZ: placement.cornerOZ,
    roomCornerX: placement.roomCornerX,
    roomCornerZ: placement.roomCornerZ,
    wingStartX: placement.wingStartX,
    wingStartZ: placement.wingStartZ,
    wingRotationY: placement.wingRotationY,
    wingScaleX: placement.wingScaleX,
  };
}
