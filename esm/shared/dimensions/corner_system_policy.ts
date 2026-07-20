import { BASE_LEG_LAYOUT_POLICY } from './base_leg_policy.js';
import { CARCASS_SHELL_DIMENSIONS } from './carcass_shell_policy.js';
import {
  EXTERNAL_DRAWER_BOX_POLICY,
  EXTERNAL_DRAWER_FRONT_RENDER_POLICY,
  EXTERNAL_DRAWER_MOTION_POLICY,
  EXTERNAL_DRAWER_SIZE_POLICY,
} from './external_drawer_policy.js';
import {
  INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY,
  INTERIOR_SHELF_GEOMETRY_POLICY,
} from './interior_fittings_policy.js';
import { INTERNAL_DRAWER_LAYOUT_POLICY } from './internal_drawer_policy.js';
import { MATERIAL_THICKNESS_POLICY } from './material_thickness_policy.js';
import { centimeters, meters } from './units.js';
import { WARDROBE_DEFAULTS } from './wardrobe_defaults.js';

export const CORNER_WING_BODY_POLICY = Object.freeze({
  defaultWidthCm: WARDROBE_DEFAULTS.corner.widthCm,
  minBodyHeightM: meters(0.2),
  minDepthM: meters(0.2),
  blindClearanceM: meters(0.05),
  minGroupWidthM: meters(0.001),
  minActiveWidthM: meters(0.01),
});

export const CORNER_CONNECTOR_LAYOUT_POLICY = Object.freeze({
  defaultWallLengthM: meters(1.03),
  minWallLengthM: meters(0.2),
  minFrontLengthM: meters(0.15),
});

export const CORNER_CONNECTOR_DOOR_RENDER_POLICY = Object.freeze({
  frontDoorGapM: meters(0.006),
  splitGapM: meters(0.006),
  doorMinWidthM: meters(0.05),
  doorMinHeightM: meters(0.25),
  doorBottomOffsetM: meters(0.002),
  doorTopClearanceM: meters(0.002),
  doorOutsetM: meters(0.001),
  splitGridDivisions: 6,
  splitGridLineIndex: 4,
  bottomStorageHeightM: meters(0.5),
  bottomLineMinGapM: meters(0.08),
  bottomLineTopGapM: meters(0.12),
  splitCutMinGapM: meters(0.08),
  splitCutToleranceMinM: meters(0.004),
  splitCutToleranceMaxM: meters(0.02),
  splitCutToleranceRatio: 0.01,
  minSegmentHeightM: meters(0.12),
  minRenderableSegmentHeightM: meters(0.1),
  visualMinWidthM: meters(0.03),
  visualMinHeightM: meters(0.2),
  fullDoorTopHandleClearanceM: meters(0.002),
  visualWidthClearanceM: meters(0.004),
  visualHeightClearanceM: meters(0.004),
  frontThicknessM: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
  frontTrimZOffsetM: meters(0.011),
  hitboxThicknessM: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
});

export const CORNER_CONNECTOR_SHELL_POLICY = Object.freeze({
  shellMinWallHeightM: CARCASS_SHELL_DIMENSIONS.bodyMinHeightM,
  shellWallHeightClearanceM: meters(0.002),
  shellBackPanelThicknessM: CARCASS_SHELL_DIMENSIONS.backPanelThicknessM,
  shellBackPanelOutsideInsetM: meters(0.0025),
  shellPanelMinLengthM: meters(0.01),
  shellNoOverlapInsetExtraM: meters(0.001),
  shellPlateSideInsetExtraM: meters(0.0006),
  shellAttachFaceEpsilonM: meters(0.0002),
  shellBackJunctionInsetM: meters(0.002),
  shellAttachPanelEpsilonM: meters(0.0008),
  shellBackInsetXM: CARCASS_SHELL_DIMENSIONS.sideDepthClearanceM,
  shellBackInsetZM: CARCASS_SHELL_DIMENSIONS.sideDepthClearanceM,
  shellFrontInsetM: CARCASS_SHELL_DIMENSIONS.frontInsetZM,
  shellBaseMinHeightM: CARCASS_SHELL_DIMENSIONS.boardMinDimensionM,
});

export const CORNER_CONNECTOR_CORNICE_HIT_POLICY = Object.freeze({
  shellCorniceHitMinM: CARCASS_SHELL_DIMENSIONS.bodyMinHeightM,
  corniceHitMinWidthM: CARCASS_SHELL_DIMENSIONS.bodyMinHeightM,
  corniceHitHeightClearanceM: CARCASS_SHELL_DIMENSIONS.bodyMinHeightM,
});

export const CORNER_CONNECTOR_HANDLE_POLICY = Object.freeze({
  edgeHandleShortInsetM: meters(0.1),
  edgeHandleLongInsetM: meters(0.2),
  edgeHandleLongLiftM: meters(0.1),
  edgeHandleLiftDrawerCountThreshold: 4,
  edgeHandleDefaultAbsY: meters(1.05),
  edgeHandleLiftDoorBottomThresholdM: meters(0.9),
  edgeHandleLiftExtraM: meters(0.15),
});

export const CORNER_CONNECTOR_POLICY = Object.freeze({
  defaultWallLengthM: CORNER_CONNECTOR_LAYOUT_POLICY.defaultWallLengthM,
  minWallLengthM: CORNER_CONNECTOR_LAYOUT_POLICY.minWallLengthM,
  minFrontLengthM: CORNER_CONNECTOR_LAYOUT_POLICY.minFrontLengthM,
  frontDoorGapM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.frontDoorGapM,
  splitGapM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.splitGapM,
  doorMinWidthM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.doorMinWidthM,
  doorMinHeightM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.doorMinHeightM,
  doorBottomOffsetM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.doorBottomOffsetM,
  doorTopClearanceM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.doorTopClearanceM,
  doorOutsetM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.doorOutsetM,
  splitGridDivisions: CORNER_CONNECTOR_DOOR_RENDER_POLICY.splitGridDivisions,
  splitGridLineIndex: CORNER_CONNECTOR_DOOR_RENDER_POLICY.splitGridLineIndex,
  bottomStorageHeightM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.bottomStorageHeightM,
  bottomLineMinGapM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.bottomLineMinGapM,
  bottomLineTopGapM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.bottomLineTopGapM,
  splitCutMinGapM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.splitCutMinGapM,
  splitCutToleranceMinM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.splitCutToleranceMinM,
  splitCutToleranceMaxM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.splitCutToleranceMaxM,
  splitCutToleranceRatio: CORNER_CONNECTOR_DOOR_RENDER_POLICY.splitCutToleranceRatio,
  minSegmentHeightM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.minSegmentHeightM,
  minRenderableSegmentHeightM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.minRenderableSegmentHeightM,
  visualMinWidthM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.visualMinWidthM,
  visualMinHeightM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.visualMinHeightM,
  shellMinWallHeightM: CORNER_CONNECTOR_SHELL_POLICY.shellMinWallHeightM,
  shellWallHeightClearanceM: CORNER_CONNECTOR_SHELL_POLICY.shellWallHeightClearanceM,
  shellBackPanelThicknessM: CORNER_CONNECTOR_SHELL_POLICY.shellBackPanelThicknessM,
  shellBackPanelOutsideInsetM: CORNER_CONNECTOR_SHELL_POLICY.shellBackPanelOutsideInsetM,
  shellPanelMinLengthM: CORNER_CONNECTOR_SHELL_POLICY.shellPanelMinLengthM,
  shellNoOverlapInsetExtraM: CORNER_CONNECTOR_SHELL_POLICY.shellNoOverlapInsetExtraM,
  shellPlateSideInsetExtraM: CORNER_CONNECTOR_SHELL_POLICY.shellPlateSideInsetExtraM,
  shellAttachFaceEpsilonM: CORNER_CONNECTOR_SHELL_POLICY.shellAttachFaceEpsilonM,
  shellBackJunctionInsetM: CORNER_CONNECTOR_SHELL_POLICY.shellBackJunctionInsetM,
  shellAttachPanelEpsilonM: CORNER_CONNECTOR_SHELL_POLICY.shellAttachPanelEpsilonM,
  shellBackInsetXM: CORNER_CONNECTOR_SHELL_POLICY.shellBackInsetXM,
  shellBackInsetZM: CORNER_CONNECTOR_SHELL_POLICY.shellBackInsetZM,
  shellFrontInsetM: CORNER_CONNECTOR_SHELL_POLICY.shellFrontInsetM,
  shellBaseMinHeightM: CORNER_CONNECTOR_SHELL_POLICY.shellBaseMinHeightM,
  shellCorniceHitMinM: CORNER_CONNECTOR_CORNICE_HIT_POLICY.shellCorniceHitMinM,
  corniceHitMinWidthM: CORNER_CONNECTOR_CORNICE_HIT_POLICY.corniceHitMinWidthM,
  corniceHitHeightClearanceM: CORNER_CONNECTOR_CORNICE_HIT_POLICY.corniceHitHeightClearanceM,
  fullDoorTopHandleClearanceM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.fullDoorTopHandleClearanceM,
  visualWidthClearanceM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.visualWidthClearanceM,
  visualHeightClearanceM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.visualHeightClearanceM,
  frontThicknessM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.frontThicknessM,
  frontTrimZOffsetM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.frontTrimZOffsetM,
  hitboxThicknessM: CORNER_CONNECTOR_DOOR_RENDER_POLICY.hitboxThicknessM,
  edgeHandleShortInsetM: CORNER_CONNECTOR_HANDLE_POLICY.edgeHandleShortInsetM,
  edgeHandleLongInsetM: CORNER_CONNECTOR_HANDLE_POLICY.edgeHandleLongInsetM,
  edgeHandleLongLiftM: CORNER_CONNECTOR_HANDLE_POLICY.edgeHandleLongLiftM,
  edgeHandleLiftDrawerCountThreshold: CORNER_CONNECTOR_HANDLE_POLICY.edgeHandleLiftDrawerCountThreshold,
  edgeHandleDefaultAbsY: CORNER_CONNECTOR_HANDLE_POLICY.edgeHandleDefaultAbsY,
  edgeHandleLiftDoorBottomThresholdM: CORNER_CONNECTOR_HANDLE_POLICY.edgeHandleLiftDoorBottomThresholdM,
  edgeHandleLiftExtraM: CORNER_CONNECTOR_HANDLE_POLICY.edgeHandleLiftExtraM,
});

export const CORNER_WING_INTERIOR_POLICY = Object.freeze({
  minInnerFaceGapM: meters(0.02),
  minCellWidthM: meters(0.05),
  minCellDepthM: meters(0.2),
  shelfWidthClearanceM: meters(0.005),
  internalDepthBackClearanceM: meters(0.05),
  regularShelfDepthM: INTERIOR_SHELF_GEOMETRY_POLICY.regularDepthM,
  fullDepthCenterBackInsetM: meters(0.015),
  shelfContentsTopClearanceM: INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsHeightClearanceM,
  shelfTopPlacementGuardM: meters(0.01),
  foldedContentsMinWidthM: meters(0.05),
  foldedContentsWidthClearanceM: INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsWidthClearanceM,
});

export const CORNER_WING_PANEL_POLICY = Object.freeze({
  fallbackSegmentWidthM: meters(0.2),
  minPanelHeightM: meters(0.05),
  minPanelWidthM: meters(0.05),
  panelWidthClearanceM: meters(0.002),
  minBlindWidthM: meters(0.001),
  minCellDepthM: meters(0.2),
  minWallDepthM: meters(0.05),
  noZFightAttachInsetM: meters(0.0012),
});

export const CORNER_WING_SELECTOR_POLICY = Object.freeze({
  minDepthM: meters(0.2),
  minWidthM: meters(0.01),
  widthClearanceM: meters(0.001),
  fallbackMinWidthM: meters(0.01),
});

export const CORNER_WING_CEILING_POLICY = Object.freeze({
  noZFightAttachInsetM: meters(0.0012),
  minDepthM: meters(0.05),
  minWidthM: meters(0.05),
  widthClearanceM: meters(0.001),
});

export const CORNER_WING_CELL_POLICY = Object.freeze({
  doorsPerCell: 2,
  defaultGridDivisions: 6,
  splitGridLineIndex: 4,
  minWidthM: meters(0.05),
  minDoorUnitWidthM: meters(0.2),
  widthAdjustmentEpsilonM: meters(1e-6),
  minAbsDepthCm: centimeters(20),
  minAbsDepthWoodMultiplier: 4,
  minBodyWoodMultiplier: 2,
});

export const CORNER_WING_DRAWER_POLICY = Object.freeze({
  shoeHeightM: EXTERNAL_DRAWER_SIZE_POLICY.shoeHeightM,
  externalRegularHeightM: EXTERNAL_DRAWER_SIZE_POLICY.regularHeightM,
  internalDefaultDepthM: INTERNAL_DRAWER_LAYOUT_POLICY.defaultDepthM,
  internalMaxSingleDrawerHeightM: INTERNAL_DRAWER_LAYOUT_POLICY.maxSingleDrawerHeightM,
  internalDefaultSingleHeightM: INTERNAL_DRAWER_LAYOUT_POLICY.defaultSingleDrawerHeightM,
  internalVerticalInsetM: INTERNAL_DRAWER_LAYOUT_POLICY.verticalInsetM,
  internalMinHeightM: INTERNAL_DRAWER_LAYOUT_POLICY.minDrawerHeightM,
  internalFirstBottomGapM: INTERNAL_DRAWER_LAYOUT_POLICY.firstDrawerBottomGapM,
  internalBetweenGapM: INTERNAL_DRAWER_LAYOUT_POLICY.betweenDrawersGapM,
  rodMinLengthM: meters(0.05),
  rodWidthClearanceM: meters(0.02),
  hangingClothesWidthClearanceM: meters(0.06),
  internalMinWidthM: meters(0.1),
  internalWidthClearanceM: meters(0.1),
  internalMinDepthM: meters(0.08),
  internalDepthClearanceM: meters(0.12),
  internalClosedBackOffsetM: meters(0.02),
  internalOpenBackOffsetM: meters(0.3),
  internalStackCount: INTERNAL_DRAWER_LAYOUT_POLICY.stackCount,
  shelfOverDrawerMinDepthM: meters(0.05),
  shelfOverDrawerDepthClearanceM: meters(0.002),
  externalFrontOffsetZM: EXTERNAL_DRAWER_FRONT_RENDER_POLICY.frontOffsetZM,
  externalOpenOffsetZM: EXTERNAL_DRAWER_MOTION_POLICY.openOffsetZM,
  externalVisualWidthClearanceM: EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualWidthClearanceM,
  externalBoxWidthClearanceM: EXTERNAL_DRAWER_BOX_POLICY.boxWidthClearanceM,
  externalBoxHeightClearanceM: EXTERNAL_DRAWER_BOX_POLICY.boxHeightClearanceM,
  externalBoxDepthBackClearanceM: EXTERNAL_DRAWER_BOX_POLICY.boxDepthBackClearanceM,
  externalBoxOffsetZM: EXTERNAL_DRAWER_BOX_POLICY.boxOffsetZM,
  drawerShadowWidthClearanceM: meters(0.01),
  drawerShadowHeightM: meters(0.008),
  drawerShadowDepthM: meters(0.01),
  drawerShadowFrontOffsetM: meters(0.005),
});

export const CORNER_WING_BASE_LEG_POLICY = Object.freeze({
  minCount: 2,
  spacingM: meters(0.6),
  widthClearanceM: meters(0.1),
  insetM: BASE_LEG_LAYOUT_POLICY.cornerInsetM,
});

export const CORNER_SYSTEM_POLICY = Object.freeze({
  wing: CORNER_WING_BODY_POLICY,
  connector: CORNER_CONNECTOR_POLICY,
  interior: CORNER_WING_INTERIOR_POLICY,
  panels: CORNER_WING_PANEL_POLICY,
  selector: CORNER_WING_SELECTOR_POLICY,
  ceiling: CORNER_WING_CEILING_POLICY,
  cells: CORNER_WING_CELL_POLICY,
  drawers: CORNER_WING_DRAWER_POLICY,
  baseLegs: CORNER_WING_BASE_LEG_POLICY,
});
