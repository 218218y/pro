import { MATERIAL_THICKNESS_POLICY } from './material_thickness_policy.js';
import { meters } from './units.js';
import { WARDROBE_DEFAULTS } from './wardrobe_defaults.js';

export const HINGED_DOOR_RENDER_POLICY = Object.freeze({
  visualWidthClearanceM: meters(0.004),
  visualHeightClearanceM: meters(0.004),
  visualThicknessM: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
  frontTrimZOffsetM: meters(0.011),
  opFrontZOffsetM: meters(0.01),
});

export const HINGED_DOOR_MOUNT_POLICY = Object.freeze({
  insetFrameThicknessM: meters(0.036),
  insetRevealM: meters(0.003),
  sameModuleLeafGapMaxM: meters(0.003),
  sameModuleLeafGapWoodDivisor: 10,
  sameModuleLeafGapSpanRatioMax: 0.1,
});

export const HINGED_DOOR_HARDWARE_RENDER_POLICY = Object.freeze({
  standardEdgeInsetM: meters(0.1),
  shortDoorInsetRatio: 0.25,

  // Door side: circular concealed cup + one short connector toward the carcass.
  cupCenterFromHingeEdgeM: meters(0.0215),
  cupRadiusM: meters(0.0175),
  cupVisibleDepthM: meters(0.0045),
  cupRadialSegments: 20,
  cupCollarRadiusM: meters(0.0205),
  cupCollarDepthM: meters(0.0022),
  doorConnectorCenterFromPivotM: meters(0.01825),
  doorConnectorLengthM: meters(0.0065),
  doorConnectorHeightM: meters(0.0095),
  doorConnectorDepthM: meters(0.012),

  // Carcass side: vertical mounting plate, two raised links and a short tongue
  // that overlaps the door connector by about 1 mm in the closed position.
  carcassPlateCenterFromPivotM: meters(0.011),
  carcassPlateThicknessM: meters(0.0032),
  carcassPlateHeightM: meters(0.047),
  carcassPlateDepthM: meters(0.03),
  carcassLinkBlockCenterFromPivotM: meters(0.0065),
  carcassLinkBlockWidthM: meters(0.011),
  carcassLinkBlockHeightM: meters(0.007),
  carcassLinkBlockDepthM: meters(0.014),
  carcassLinkBlockCenterYOffsetM: meters(0.006),
  carcassConnectorCenterFromPivotM: meters(0.01375),
  carcassConnectorLengthM: meters(0.0045),
  carcassConnectorHeightM: meters(0.0065),
  carcassConnectorDepthM: meters(0.012),

  // Calibrated nickel finish, aligned with the project's existing nickel hardware palette.
  metalColorHex: 0xe5e9ef,
  accentColorHex: 0xc8ced7,
  metalEmissiveHex: 0x20242b,
  accentEmissiveHex: 0x171b21,
  metalEmissiveIntensity: 0.16,
  accentEmissiveIntensity: 0.1,
  metalness: 0.28,
  roughness: 0.2,
});

export const HINGED_DOOR_SPLIT_GEOMETRY_POLICY = Object.freeze({
  minSegmentHeightM: meters(0.12),
  renderMinSegmentHeightM: meters(0.1),
  splitGapM: meters(0.006),
  duplicateCutToleranceMinM: meters(0.004),
  duplicateCutToleranceMaxM: meters(0.02),
  duplicateCutToleranceHeightRatio: 0.01,
  storageLiftM: meters(0.5),
  bottomClampOffsetM: meters(0.08),
  topClampOffsetM: meters(0.12),
  minHeightForSplitM: meters(0.2),
});

export const HINGED_DOOR_SPLIT_AUTHORING_POLICY = Object.freeze({
  hoverMinDoorHeightM: meters(0.05),
  hoverDefaultDoorWidthM: meters(0.45),
  hoverRegionMinHeightM: meters(0.05),
  hoverStandardLineMinHeightM: meters(0.014),
  hoverStandardLineMaxHeightM: meters(0.026),
  hoverStandardLineHeightRatio: 0.018,
  hoverCustomEdgePadM: meters(0.12),
  hoverCustomRemoveToleranceMinM: meters(0.03),
  hoverCustomRemoveToleranceMaxM: meters(0.08),
  hoverCustomRemoveToleranceRatio: 0.06,
  hoverCustomMarkerMinHeightM: meters(0.02),
  hoverCustomMarkerMaxHeightM: meters(0.06),
  hoverCustomMarkerHeightRatio: 0.03,
  hoverCustomAlignmentToleranceMinM: meters(0.002),
  hoverCustomAlignmentToleranceMaxM: meters(0.008),
  hoverCustomAlignmentToleranceHeightRatio: 0.003,
  hoverMarkerZOffsetM: meters(0.02),
  hoverMarkerScaleMinM: meters(0.01),
  hoverMarkerWidthClearanceM: meters(0.01),
  hoverMarkerHeightClearanceM: meters(0.001),
});

export const HINGED_DOOR_SPLIT_POLICY = Object.freeze({
  minSegmentHeightM: HINGED_DOOR_SPLIT_GEOMETRY_POLICY.minSegmentHeightM,
  renderMinSegmentHeightM: HINGED_DOOR_SPLIT_GEOMETRY_POLICY.renderMinSegmentHeightM,
  splitGapM: HINGED_DOOR_SPLIT_GEOMETRY_POLICY.splitGapM,
  duplicateCutToleranceMinM: HINGED_DOOR_SPLIT_GEOMETRY_POLICY.duplicateCutToleranceMinM,
  duplicateCutToleranceMaxM: HINGED_DOOR_SPLIT_GEOMETRY_POLICY.duplicateCutToleranceMaxM,
  duplicateCutToleranceHeightRatio: HINGED_DOOR_SPLIT_GEOMETRY_POLICY.duplicateCutToleranceHeightRatio,
  storageLiftM: HINGED_DOOR_SPLIT_GEOMETRY_POLICY.storageLiftM,
  bottomClampOffsetM: HINGED_DOOR_SPLIT_GEOMETRY_POLICY.bottomClampOffsetM,
  topClampOffsetM: HINGED_DOOR_SPLIT_GEOMETRY_POLICY.topClampOffsetM,
  minHeightForSplitM: HINGED_DOOR_SPLIT_GEOMETRY_POLICY.minHeightForSplitM,
  hoverMinDoorHeightM: HINGED_DOOR_SPLIT_AUTHORING_POLICY.hoverMinDoorHeightM,
  hoverDefaultDoorWidthM: HINGED_DOOR_SPLIT_AUTHORING_POLICY.hoverDefaultDoorWidthM,
  hoverRegionMinHeightM: HINGED_DOOR_SPLIT_AUTHORING_POLICY.hoverRegionMinHeightM,
  hoverStandardLineMinHeightM: HINGED_DOOR_SPLIT_AUTHORING_POLICY.hoverStandardLineMinHeightM,
  hoverStandardLineMaxHeightM: HINGED_DOOR_SPLIT_AUTHORING_POLICY.hoverStandardLineMaxHeightM,
  hoverStandardLineHeightRatio: HINGED_DOOR_SPLIT_AUTHORING_POLICY.hoverStandardLineHeightRatio,
  hoverCustomEdgePadM: HINGED_DOOR_SPLIT_AUTHORING_POLICY.hoverCustomEdgePadM,
  hoverCustomRemoveToleranceMinM: HINGED_DOOR_SPLIT_AUTHORING_POLICY.hoverCustomRemoveToleranceMinM,
  hoverCustomRemoveToleranceMaxM: HINGED_DOOR_SPLIT_AUTHORING_POLICY.hoverCustomRemoveToleranceMaxM,
  hoverCustomRemoveToleranceRatio: HINGED_DOOR_SPLIT_AUTHORING_POLICY.hoverCustomRemoveToleranceRatio,
  hoverCustomMarkerMinHeightM: HINGED_DOOR_SPLIT_AUTHORING_POLICY.hoverCustomMarkerMinHeightM,
  hoverCustomMarkerMaxHeightM: HINGED_DOOR_SPLIT_AUTHORING_POLICY.hoverCustomMarkerMaxHeightM,
  hoverCustomMarkerHeightRatio: HINGED_DOOR_SPLIT_AUTHORING_POLICY.hoverCustomMarkerHeightRatio,
  hoverCustomAlignmentToleranceMinM: HINGED_DOOR_SPLIT_AUTHORING_POLICY.hoverCustomAlignmentToleranceMinM,
  hoverCustomAlignmentToleranceMaxM: HINGED_DOOR_SPLIT_AUTHORING_POLICY.hoverCustomAlignmentToleranceMaxM,
  hoverCustomAlignmentToleranceHeightRatio:
    HINGED_DOOR_SPLIT_AUTHORING_POLICY.hoverCustomAlignmentToleranceHeightRatio,
  hoverMarkerZOffsetM: HINGED_DOOR_SPLIT_AUTHORING_POLICY.hoverMarkerZOffsetM,
  hoverMarkerScaleMinM: HINGED_DOOR_SPLIT_AUTHORING_POLICY.hoverMarkerScaleMinM,
  hoverMarkerWidthClearanceM: HINGED_DOOR_SPLIT_AUTHORING_POLICY.hoverMarkerWidthClearanceM,
  hoverMarkerHeightClearanceM: HINGED_DOOR_SPLIT_AUTHORING_POLICY.hoverMarkerHeightClearanceM,
});

export const HINGED_DOOR_SYSTEM_POLICY = Object.freeze({
  visualWidthClearanceM: HINGED_DOOR_RENDER_POLICY.visualWidthClearanceM,
  visualHeightClearanceM: HINGED_DOOR_RENDER_POLICY.visualHeightClearanceM,
  visualThicknessM: HINGED_DOOR_RENDER_POLICY.visualThicknessM,
  insetFrameThicknessM: HINGED_DOOR_MOUNT_POLICY.insetFrameThicknessM,
  insetRevealM: HINGED_DOOR_MOUNT_POLICY.insetRevealM,
  frontTrimZOffsetM: HINGED_DOOR_RENDER_POLICY.frontTrimZOffsetM,
  opFrontZOffsetM: HINGED_DOOR_RENDER_POLICY.opFrontZOffsetM,
  sameModuleLeafGapMaxM: HINGED_DOOR_MOUNT_POLICY.sameModuleLeafGapMaxM,
  sameModuleLeafGapWoodDivisor: HINGED_DOOR_MOUNT_POLICY.sameModuleLeafGapWoodDivisor,
  sameModuleLeafGapSpanRatioMax: HINGED_DOOR_MOUNT_POLICY.sameModuleLeafGapSpanRatioMax,
  hardware: HINGED_DOOR_HARDWARE_RENDER_POLICY,
  split: HINGED_DOOR_SPLIT_POLICY,
});

export const SLIDING_DOOR_CONSTRUCTION_POLICY = Object.freeze({
  defaultDoorsCount: WARDROBE_DEFAULTS.byType.sliding.doorsCount,
  overlapM: meters(0.03),
  railHeightM: meters(0.04),
  railDepthM: meters(0.075),
  railBackInsetM: meters(0.002),
  shellClearanceMinM: meters(0.0006),
  shellClearanceMaxM: meters(0.002),
  shellClearanceWoodDivisor: 6,
  doorTopOverlapMaxM: meters(0.015),
  doorTopOverlapRailInsetM: meters(0.004),
  doorHeightMinM: meters(0.05),
  railLineOffsetYExtraM: meters(0.001),
  railTrackLaneDivisor: 4,
  trackOuterOffsetM: meters(0.012),
  trackInnerLaneGapM: meters(0.03),
  visualThicknessM: meters(0.022),
  trimFrontZM: meters(0.014),
});

export const SLIDING_DOOR_HANDLE_RENDER_POLICY = Object.freeze({
  handleProfileZOffsetM: meters(0.024),
  standardHandleProfileWidthM: meters(0.025),
  standardHandleProfileDepthM: meters(0.025),
  standardHandleProfileInsetM: meters(0.0125),
  standardHandleProfileFrontZM: meters(0.025),
  edgeHandleWidthM: meters(0.01),
  edgeHandleDepthM: meters(0.03),
  edgeHandleInsetM: meters(0.005),
});

export const SLIDING_DOOR_MOTION_POLICY = Object.freeze({
  runtimeOpenEpsilonXM: meters(0.002),
  runtimeStackZStepDefaultM: meters(0.055),
  runtimeStackZStepMinM: meters(0.03),
  runtimeStackZStepGapM: meters(0.006),
});

export const SLIDING_DOOR_SYSTEM_POLICY = Object.freeze({
  defaultDoorsCount: SLIDING_DOOR_CONSTRUCTION_POLICY.defaultDoorsCount,
  overlapM: SLIDING_DOOR_CONSTRUCTION_POLICY.overlapM,
  railHeightM: SLIDING_DOOR_CONSTRUCTION_POLICY.railHeightM,
  railDepthM: SLIDING_DOOR_CONSTRUCTION_POLICY.railDepthM,
  railBackInsetM: SLIDING_DOOR_CONSTRUCTION_POLICY.railBackInsetM,
  shellClearanceMinM: SLIDING_DOOR_CONSTRUCTION_POLICY.shellClearanceMinM,
  shellClearanceMaxM: SLIDING_DOOR_CONSTRUCTION_POLICY.shellClearanceMaxM,
  shellClearanceWoodDivisor: SLIDING_DOOR_CONSTRUCTION_POLICY.shellClearanceWoodDivisor,
  doorTopOverlapMaxM: SLIDING_DOOR_CONSTRUCTION_POLICY.doorTopOverlapMaxM,
  doorTopOverlapRailInsetM: SLIDING_DOOR_CONSTRUCTION_POLICY.doorTopOverlapRailInsetM,
  doorHeightMinM: SLIDING_DOOR_CONSTRUCTION_POLICY.doorHeightMinM,
  railLineOffsetYExtraM: SLIDING_DOOR_CONSTRUCTION_POLICY.railLineOffsetYExtraM,
  railTrackLaneDivisor: SLIDING_DOOR_CONSTRUCTION_POLICY.railTrackLaneDivisor,
  trackOuterOffsetM: SLIDING_DOOR_CONSTRUCTION_POLICY.trackOuterOffsetM,
  trackInnerLaneGapM: SLIDING_DOOR_CONSTRUCTION_POLICY.trackInnerLaneGapM,
  visualThicknessM: SLIDING_DOOR_CONSTRUCTION_POLICY.visualThicknessM,
  trimFrontZM: SLIDING_DOOR_CONSTRUCTION_POLICY.trimFrontZM,
  handleProfileZOffsetM: SLIDING_DOOR_HANDLE_RENDER_POLICY.handleProfileZOffsetM,
  standardHandleProfileWidthM: SLIDING_DOOR_HANDLE_RENDER_POLICY.standardHandleProfileWidthM,
  standardHandleProfileDepthM: SLIDING_DOOR_HANDLE_RENDER_POLICY.standardHandleProfileDepthM,
  standardHandleProfileInsetM: SLIDING_DOOR_HANDLE_RENDER_POLICY.standardHandleProfileInsetM,
  standardHandleProfileFrontZM: SLIDING_DOOR_HANDLE_RENDER_POLICY.standardHandleProfileFrontZM,
  edgeHandleWidthM: SLIDING_DOOR_HANDLE_RENDER_POLICY.edgeHandleWidthM,
  edgeHandleDepthM: SLIDING_DOOR_HANDLE_RENDER_POLICY.edgeHandleDepthM,
  edgeHandleInsetM: SLIDING_DOOR_HANDLE_RENDER_POLICY.edgeHandleInsetM,
  runtimeOpenEpsilonXM: SLIDING_DOOR_MOTION_POLICY.runtimeOpenEpsilonXM,
  runtimeStackZStepDefaultM: SLIDING_DOOR_MOTION_POLICY.runtimeStackZStepDefaultM,
  runtimeStackZStepMinM: SLIDING_DOOR_MOTION_POLICY.runtimeStackZStepMinM,
  runtimeStackZStepGapM: SLIDING_DOOR_MOTION_POLICY.runtimeStackZStepGapM,
});

export const DOOR_SYSTEM_DIMENSIONS = Object.freeze({
  hinged: HINGED_DOOR_SYSTEM_POLICY,
  sliding: SLIDING_DOOR_SYSTEM_POLICY,
});
