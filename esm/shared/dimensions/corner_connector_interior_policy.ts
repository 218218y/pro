import { centimeters, meters, millimeters } from './units.js';

export const CORNER_CONNECTOR_SPECIAL_POST_POLICY = Object.freeze({
  depthDefaultCm: centimeters(55),
  heightDefaultCm: centimeters(180),
  topCellHeightDefaultCm: centimeters(30),
  depthMinM: meters(0.05),
  postInsetClearanceM: meters(0.02),
  panelGapEpsilonM: meters(0.0006),
  minAvailableHeightM: meters(0.35),
  postHeightMinM: meters(0.2),
  postOffsetNormMin: 0.05,
  postOffsetNormMax: 0.95,
  postClampEdgeInsetM: meters(0.03),
  shelfSpanMinM: meters(0.35),
  shelfNetMinM: meters(0.12),
  shelfTopClearanceM: meters(0.002),
  panelMinLengthM: meters(0.01),
  shelfPlanMinDimensionM: meters(0.05),
  shelfCeilingClearanceM: meters(0.005),
  shelfFitToleranceM: meters(0.002),
});

export const CORNER_CONNECTOR_ATTACH_ROD_POLICY = Object.freeze({
  heightDefaultCm: centimeters(150),
  endInsetDefaultCm: centimeters(2),
  radiusDefaultMm: millimeters(15),
  verticalClearanceM: meters(0.05),
  minRodLengthM: meters(0.08),
  contentsWidthClearanceM: meters(0.06),
  contentsWidthMinM: meters(0.08),
  contentsBottomClearanceM: meters(0.02),
  contentsHeightMinM: meters(0.55),
  contentsDepthHintM: meters(0.32),
  wallBackClearanceM: meters(0.08),
});

export const CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY = Object.freeze({
  leftWidthMinM: meters(0.28),
  leftDepthMinM: meters(0.18),
  surfaceHeightClearanceM: meters(0.02),
  surfaceMinHeightM: meters(0.08),
  surfaceYOffsetM: meters(0.002),
  widthMinM: meters(0.2),
  widthClearanceM: meters(0.06),
  maxHeightMinM: meters(0.12),
  maxHeightMaxM: meters(0.65),
  pentagonSafeZMinM: meters(0.14),
  pentagonSafeZRatio: 0.35,
  pentagonSafeZEndClearanceM: meters(0.18),
  pentagonSafeWidthMinM: meters(0.35),
  pentagonSafeWidthRatio: 0.85,
  pentagonSafeWidthMaxM: meters(0.9),
  pentagonSafeDepthMinM: meters(0.22),
  pentagonSafeDepthMaxM: meters(0.34),
  pentagonSafeDepthEndClearanceM: meters(0.12),
});

export const CORNER_CONNECTOR_INTERIOR_POLICY = Object.freeze({
  specialPost: CORNER_CONNECTOR_SPECIAL_POST_POLICY,
  attachRod: CORNER_CONNECTOR_ATTACH_ROD_POLICY,
  foldedContents: CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY,
});
