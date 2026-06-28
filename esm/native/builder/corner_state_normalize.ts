// Corner wing: state normalization
//
// The public owner now stays focused on orchestration while parsing,
// stack/config policy, and placement math live in dedicated helpers.

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

function readPositiveThickness(value: unknown, defaultThickness: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : defaultThickness;
}

export function normalizeCornerWingState(args: {
  mainW: number;
  mainH: number;
  mainD: number;
  woodThick: number;
  startY: number;
  meta: CornerBuildMeta | null | undefined;
}): NormalizedCornerWingState {
  const { mainW, mainH, mainD, woodThick, startY, meta } = args;
  const shelfThick = readPositiveThickness(meta?.shelfThick, woodThick);

  const snapshot = meta?.snapshot;
  if (!snapshot || typeof snapshot !== 'object') {
    throw new TypeError('[corner_state_normalize] build snapshot is required');
  }
  if (!snapshot.ui || typeof snapshot.ui !== 'object') {
    throw new TypeError('[corner_state_normalize] snapshot ui is required');
  }
  if (!snapshot.renderPolicy || typeof snapshot.renderPolicy.sketchMode !== 'boolean') {
    throw new TypeError('[corner_state_normalize] snapshot renderPolicy is required');
  }
  if (typeof snapshot.primaryMode !== 'string') {
    throw new TypeError('[corner_state_normalize] snapshot primaryMode is required');
  }
  const uiAny = asCornerBuildUI(snapshot.ui);
  const __sketchMode = snapshot.renderPolicy.sketchMode;
  const __primaryMode = snapshot.primaryMode;
  const stackMeta = resolveCornerWingStackMeta(meta);
  const configState = createCornerNormalizedConfigState({
    cfgSnapshot: snapshot.cfg,
    uiAny,
    __stackKey: stackMeta.__stackKey,
    __stackSplitEnabled: stackMeta.__stackSplitEnabled,
  });
  const metrics = resolveCornerWingMetrics({
    uiAny,
    config: configState.config,
    rootConfig: configState.__cfg,
    mainH,
    mainD,
    woodThick,
    startY,
    __stackKey: stackMeta.__stackKey,
    __stackSplitEnabled: stackMeta.__stackSplitEnabled,
  });
  const flags = resolveCornerWingFlags({
    uiAny,
    primaryMode: __primaryMode,
    __stackKey: stackMeta.__stackKey,
    __stackSplitEnabled: stackMeta.__stackSplitEnabled,
  });

  const placement = resolveCornerWingPlacement({
    uiAny,
    config: configState.config,
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
    __baseLegPlatformModeOverride: stackMeta.__baseLegPlatformModeOverride,
    __baseLegPlatformSideModeOverride: stackMeta.__baseLegPlatformSideModeOverride,
    __baseLegPlatformSideOverhangCmOverride: stackMeta.__baseLegPlatformSideOverhangCmOverride,
    __baseLegPlatformFrontOverhangCmOverride: stackMeta.__baseLegPlatformFrontOverhangCmOverride,
    __stackKey: stackMeta.__stackKey,
    __stackSplitEnabled: stackMeta.__stackSplitEnabled,
  });

  return {
    uiAny,
    __sketchMode,
    __primaryMode,
    __stackKey: stackMeta.__stackKey,
    __stackSplitEnabled: stackMeta.__stackSplitEnabled,
    __stackSplitUnifiedFrame: stackMeta.__stackSplitUnifiedFrame,
    __stackOffsetZ: stackMeta.__stackOffsetZ,
    __mirrorX: metrics.__mirrorX,
    cornerSide: metrics.cornerSide,
    cornerConnectorEnabled: metrics.cornerConnectorEnabled,
    wingLengthCM: metrics.wingLengthCM,
    wingW: metrics.wingW,
    wingH: metrics.wingH,
    wingD: metrics.wingD,
    shelfThick,
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
    baseLegHeightM: placement.baseLegHeightM,
    baseLegPlatformMode: placement.baseLegPlatformMode,
    baseLegPlatformSideMode: placement.baseLegPlatformSideMode,
    baseLegPlatformSideOverhangM: placement.baseLegPlatformSideOverhangM,
    baseLegPlatformFrontOverhangM: placement.baseLegPlatformFrontOverhangM,
    baseLegBottomPlatformHeightM: placement.baseLegBottomPlatformHeightM,
    baseLegTopPlatformHeightM: placement.baseLegTopPlatformHeightM,
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
