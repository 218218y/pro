import { centimeters, meters } from './units.js';

export const DOOR_VISUAL_COMMON_POLICY = Object.freeze({
  minPanelDimensionM: meters(0.02),
  minDoorDimensionForAccentM: meters(0.04),
  minStripThicknessM: meters(0.001),
  frontSurfaceNudgeM: meters(0.0009),
});

export const DOOR_ACCENT_RENDER_POLICY = Object.freeze({
  defaultInsetM: meters(0.01),
  defaultLineThicknessM: meters(0.0022),
  defaultOpacity: 0.18,
  sketchOpacityExtra: 0.08,
  sketchOpacityMax: 0.35,
  safeInsetEdgeM: meters(0.01),
  minLineThicknessM: meters(0.0014),
  stripDepthM: meters(0.001),
  renderOrder: 3,
});

export const DOOR_GROOVE_RENDER_POLICY = Object.freeze({
  stripWidthM: meters(0.005),
  heightClearanceM: meters(0.04),
  stripDepthM: meters(0.002),
  surfaceOffsetM: meters(0.001),
});

export const DOOR_GLASS_RENDER_POLICY = Object.freeze({
  paneDepthM: meters(0.005),
  paneRenderOrder: 2,
  curtainRenderOrder: 1,
  curtainSegments: 256,
  curtainWaveAmplitudeM: meters(0.008),
  curtainWaveFrequency: 120,
  curtainDefaultGapM: meters(0.015),
  curtainForcedGapM: meters(0.012),
  curtainForcedEmissiveIntensity: 0.12,
  flatInsetMinM: meters(0.002),
  flatInsetMaxM: meters(0.006),
  flatInsetRatio: 0.01,
  opacity: 0.16,
  curtainOpacity: 0.72,
});

export const DOOR_PROFILE_RENDER_POLICY = Object.freeze({
  outerFrameWidthM: meters(0.03),
  innerFrameWidthM: meters(0.027),
  outerFrameMinM: meters(0.015),
  innerFrameMinM: meters(0.012),
  frameEdgeClearanceM: meters(0.03),
  innerFrameEdgeClearanceM: meters(0.015),
  centerDepthMinM: meters(0.01),
  centerDepthMaxM: meters(0.02),
  centerDepthThicknessClearanceM: meters(0.004),
  stepDepthMinM: meters(0.002),
  stepDepthMaxM: meters(0.004),
  roundBulgeScale: 0.94,
  roundInsetMinM: meters(0.003),
  roundInsetMaxM: meters(0.012),
  roundInsetOuterFrameRatio: 0.24,
  centerPanelDepthMinM: meters(0.002),
  outerAccentInsetFrameRatio: 0.2,
  outerAccentInsetMaxM: meters(0.01),
  outerAccentLineThicknessM: meters(0.0018),
  innerAccentInsetFrameRatio: 0.28,
  innerAccentInsetMaxM: meters(0.012),
  innerAccentLineThicknessM: meters(0.0016),
  grooveDensityOverride: 12,
});

export const DOOR_MITER_RENDER_POLICY = Object.freeze({
  bandMinM: meters(0.001),
  bandEdgeClearanceM: meters(0.006),
  seamInsetMinM: meters(0.0018),
  seamInsetBackoffM: meters(0.00025),
  seamZOffsetM: meters(0.0014),
  capSurfaceOffsetM: meters(0.0008),
  roundedBeadDepthMinM: meters(0.003),
  roundedBeadThicknessRatio: 0.96,
  roundedBeadScaleBase: 0.62,
  roundedBeadScaleBulgeRatio: 0.42,
  roundedBevelSizeMinM: meters(0.0014),
  roundedBevelSizeBandRatio: 0.49,
  roundedBevelSizeDepthRatio: 0.98,
  roundedBevelSizeEdgeBackoffM: meters(0.00045),
  roundedBevelThicknessMinM: meters(0.0012),
  roundedBevelThicknessBaseRatio: 0.46,
  roundedBevelThicknessBulgeRatio: 0.08,
  roundedBevelThicknessDepthBackoffM: meters(0.00025),
  roundedBevelOffsetMaxM: meters(0.0006),
  roundedBevelOffsetBandRatio: 0.03,
  roundedOuterFaceZMinM: meters(0.0016),
  roundedOuterFaceZBevelRatio: 1.35,
  roundedOuterFaceZDepthRatio: 0.42,
});

export const DOOR_DOUBLE_PROFILE_RENDER_POLICY = Object.freeze({
  frameWidthM: meters(0.045),
  frameMinM: meters(0.02),
  frameEdgeClearanceM: meters(0.02),
  recessDepthMinM: meters(0.008),
  recessDepthMaxM: meters(0.014),
  recessDepthThicknessClearanceM: meters(0.004),
  innerRaisedInsetMinM: meters(0.006),
  innerRaisedInsetMaxM: meters(0.014),
  innerRaisedInsetFrameRatio: 0.22,
  innerRaisedBandMinM: meters(0.006),
  innerRaisedBandFrameRatio: 0.24,
  innerRaisedBandEdgeClearanceM: meters(0.012),
  innerRaisedZMinM: meters(0.0022),
  innerRaisedZMaxM: meters(0.0042),
  innerRaisedZThicknessRatio: 0.24,
  innerRaisedZFrameRatio: 0.08,
  accentInsetFrameRatio: 0.18,
  accentInsetMaxM: meters(0.012),
  accentLineThicknessM: meters(0.0022),
  accentOpacity: 0.16,
});

export const DOOR_MIRROR_RENDER_POLICY = Object.freeze({
  doorThicknessMinM: meters(0.002),
  mirrorThicknessMinM: meters(0.002),
  mirrorThicknessMaxM: meters(0.004),
  mirrorThicknessDoorRatio: 0.35,
  adhesiveGapMinM: meters(0.0006),
  adhesiveGapMaxM: meters(0.0012),
  adhesiveGapMirrorRatio: 0.3,
});

export const DOOR_MIRROR_LAYOUT_POLICY = Object.freeze({
  layoutFullInsetM: meters(0.002),
  layoutMinSizeM: meters(0.02),
  layoutCenterSnapNormThreshold: 0.04,
  layoutRemoveToleranceDefaultM: meters(0.03),
  layoutRemoveToleranceMaxM: meters(0.06),
  layoutRemoveToleranceSizeRatio: 0.18,
  layoutCenterEpsilon: 0.0001,
  layoutSizeEpsilonCm: centimeters(0.001),
});

export const DOOR_MIRROR_POLICY = Object.freeze({
  doorThicknessMinM: DOOR_MIRROR_RENDER_POLICY.doorThicknessMinM,
  mirrorThicknessMinM: DOOR_MIRROR_RENDER_POLICY.mirrorThicknessMinM,
  mirrorThicknessMaxM: DOOR_MIRROR_RENDER_POLICY.mirrorThicknessMaxM,
  mirrorThicknessDoorRatio: DOOR_MIRROR_RENDER_POLICY.mirrorThicknessDoorRatio,
  adhesiveGapMinM: DOOR_MIRROR_RENDER_POLICY.adhesiveGapMinM,
  adhesiveGapMaxM: DOOR_MIRROR_RENDER_POLICY.adhesiveGapMaxM,
  adhesiveGapMirrorRatio: DOOR_MIRROR_RENDER_POLICY.adhesiveGapMirrorRatio,
  layoutFullInsetM: DOOR_MIRROR_LAYOUT_POLICY.layoutFullInsetM,
  layoutMinSizeM: DOOR_MIRROR_LAYOUT_POLICY.layoutMinSizeM,
  layoutCenterSnapNormThreshold: DOOR_MIRROR_LAYOUT_POLICY.layoutCenterSnapNormThreshold,
  layoutRemoveToleranceDefaultM: DOOR_MIRROR_LAYOUT_POLICY.layoutRemoveToleranceDefaultM,
  layoutRemoveToleranceMaxM: DOOR_MIRROR_LAYOUT_POLICY.layoutRemoveToleranceMaxM,
  layoutRemoveToleranceSizeRatio: DOOR_MIRROR_LAYOUT_POLICY.layoutRemoveToleranceSizeRatio,
  layoutCenterEpsilon: DOOR_MIRROR_LAYOUT_POLICY.layoutCenterEpsilon,
  layoutSizeEpsilonCm: DOOR_MIRROR_LAYOUT_POLICY.layoutSizeEpsilonCm,
});

export const DOOR_VISUAL_DIMENSIONS = Object.freeze({
  common: DOOR_VISUAL_COMMON_POLICY,
  accent: DOOR_ACCENT_RENDER_POLICY,
  grooves: DOOR_GROOVE_RENDER_POLICY,
  glass: DOOR_GLASS_RENDER_POLICY,
  profile: DOOR_PROFILE_RENDER_POLICY,
  miter: DOOR_MITER_RENDER_POLICY,
  doubleProfile: DOOR_DOUBLE_PROFILE_RENDER_POLICY,
  mirror: DOOR_MIRROR_POLICY,
});
