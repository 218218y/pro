import { MATERIAL_THICKNESS_POLICY } from './material_thickness_policy.js';
import { meters } from './units.js';

export const CARCASS_CORNICE_COMMON_POLICY = Object.freeze({
  epsilonM: meters(0.000001),
  yLiftM: meters(0.0006),
  minSegmentLengthM: meters(0.02),
  minBoxDimensionM: meters(0.001),
  thetaClampM: meters(0.01),
});

export const CARCASS_CORNICE_WAVE_POLICY = Object.freeze({
  maxHeightM: meters(0.095),
  cycles: 2,
  frameThicknessMinM: meters(0.01),
  frameThicknessMaxM: meters(0.028),
  fallbackWoodThicknessM: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
  amplitudeRatio: 0.03,
  amplitudeMinM: meters(0.03),
  amplitudeMaxM: meters(0.06),
  sampleSpacingM: meters(0.02),
  sampleCountMin: 24,
  sampleCountMax: 180,
  connectorInsetM: meters(0.0004),
  minInteriorNormalLengthSq: 0.000001,
});

export const CARCASS_CORNICE_PROFILE_POLICY = Object.freeze({
  heightM: meters(0.08),
  overhangXM: meters(0.06),
  overhangZM: meters(0.04),
  insetOnRoofM: meters(0.03),
  backStepM: meters(0.02),
  seamEpsilonM: meters(0),
  baseHeightM: meters(0.022),
  step1OutM: meters(0.006),
  slopeHeightM: meters(0.03),
  slopeOutM: meters(0.018),
  step2OutM: meters(0.006),
  capRiseM: meters(0.012),
  capOutM: meters(0.004),
  topLipOutM: meters(0.003),
  minOverhangM: meters(0.001),
  xMaxDefaultM: meters(1),
  baseHeightRatio: 0.6,
  slopeHeightRatio: 0.92,
  capHeightRatio: 0.96,
  miterEpsilonZM: meters(0.0005),
  baseSealEpsilonM: meters(0.003),
  baseBandEpsilonM: meters(0.000001),
});

export const CARCASS_CORNICE_RENDER_POLICY = Object.freeze({
  common: CARCASS_CORNICE_COMMON_POLICY,
  wave: CARCASS_CORNICE_WAVE_POLICY,
  profile: CARCASS_CORNICE_PROFILE_POLICY,
});
