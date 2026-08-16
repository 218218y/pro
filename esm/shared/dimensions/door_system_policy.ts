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

export const HINGED_DOOR_SHARED_PIVOT_DIMENSION_POLICY = Object.freeze({
  sharedPivotMatchToleranceM: meters(0.0015),
  verticalOverlapToleranceM: meters(0.001),
  pairClearanceM: meters(0.002),
  lateralThrowPerLeafM: (HINGED_DOOR_RENDER_POLICY.visualThicknessM + meters(0.002)) / 2,
});

export const HINGED_DOOR_HARDWARE_RENDER_POLICY = Object.freeze({
  standardEdgeInsetM: meters(0.1),
  shortDoorInsetRatio: 0.25,

  // Door side: only the 35 mm cup and its visible collar move with the leaf.
  // The fixed carcass connector is aimed at the near cup edge at the real open angle.
  cupCenterFromHingeEdgeM: meters(0.0215),
  cupRadiusM: meters(0.0175),
  cupVisibleDepthM: meters(0.0045),
  cupRadialSegments: 20,
  cupCollarRadiusM: meters(0.0205),
  cupCollarDepthM: meters(0.0022),
  carcassConnectorCupOverlapM: meters(0.002),
  carcassConnectorOpenAngleRad: Math.PI / 2.1,

  // Carcass side: the plate sits directly on the side-panel face. Two raised
  // link blocks sit on top of it; the fixed connector points outward/front toward
  // the door cup's near edge at the normal open angle.
  nominalCarcassMountFaceFromPivotM: meters(0.009),
  carcassPlateThicknessM: meters(0.0032),
  carcassPlateHeightM: meters(0.047),
  carcassPlateDepthM: meters(0.03),
  carcassPlateFrontInsetM: meters(0.0015),
  carcassLinkBlockWidthM: meters(0.006),
  carcassLinkBlockHeightM: meters(0.009),
  carcassLinkBlockDepthM: meters(0.014),
  carcassLinkBlockCenterYOffsetM: meters(0.005),
  carcassLinkFrontInsetM: meters(0.0025),
  carcassConnectorBlockOverlapM: meters(0.0015),
  carcassConnectorHeightM: meters(0.0065),
  carcassConnectorDepthM: meters(0.007),

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
