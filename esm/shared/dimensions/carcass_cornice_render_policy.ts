import type {
  CorniceDimensionOverridesCm,
  CorniceDimensionsCm,
  CorniceType,
} from '../../../types/cornice_type.js';
import { MATERIAL_THICKNESS_POLICY } from './material_thickness_policy.js';
import { meters } from './units.js';

export const CARCASS_CORNICE_ANGLE_POLICY = Object.freeze({
  thetaClampRad: 0.01,
});

export const CARCASS_CORNICE_COMMON_POLICY = Object.freeze({
  epsilonM: meters(0.000001),
  yLiftM: meters(0.0006),
  frontOverhangM: meters(0.02),
  minSegmentLengthM: meters(0.02),
  minBoxDimensionM: meters(0.001),
  thetaClampM: CARCASS_CORNICE_ANGLE_POLICY.thetaClampRad,
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

export const CARCASS_CORNICE_STRAIGHT_POLICY = Object.freeze({
  heightM: meters(0.03),
  depthM: meters(0.1),
  overhangM: meters(0.02),
});

export const CARCASS_CORNICE_RENDER_POLICY = Object.freeze({
  common: CARCASS_CORNICE_COMMON_POLICY,
  wave: CARCASS_CORNICE_WAVE_POLICY,
  profile: CARCASS_CORNICE_PROFILE_POLICY,
  straight: CARCASS_CORNICE_STRAIGHT_POLICY,
});

export const CORNICE_DIMENSION_MIN_CM = { sideCm: 0, frontCm: 0, heightCm: 1 } as const;
export const CORNICE_DIMENSION_MAX_CM = 20;

export function isCorniceDimensionsCm(value: unknown): value is CorniceDimensionsCm {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([key, dimension]) => {
    if (key !== 'sideCm' && key !== 'frontCm' && key !== 'heightCm') return false;
    return readCorniceDimensionCm(key, dimension) !== null;
  });
}

export function readCorniceDimensionCm(key: keyof CorniceDimensionsCm, value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= CORNICE_DIMENSION_MIN_CM[key] &&
    value <= CORNICE_DIMENSION_MAX_CM
    ? value
    : null;
}

export function readCorniceDimensionOverrides(value: unknown): CorniceDimensionOverridesCm {
  const record =
    value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    sideCm: readCorniceDimensionCm('sideCm', record.sideCm),
    frontCm: readCorniceDimensionCm('frontCm', record.frontCm),
    heightCm: readCorniceDimensionCm('heightCm', record.heightCm),
  };
}

export function resolveCorniceDimensionsM(type: CorniceType, dimensions?: CorniceDimensionOverridesCm) {
  const { common, wave, profile, straight } = CARCASS_CORNICE_RENDER_POLICY;
  const sideM = type === 'classic' ? profile.overhangXM : type === 'straight' ? straight.overhangM : 0;
  const heightM =
    type === 'classic' ? profile.heightM : type === 'straight' ? straight.heightM : wave.maxHeightM;
  const { sideCm, frontCm, heightCm } = readCorniceDimensionOverrides(dimensions);
  return {
    sideM: sideCm === null ? sideM : sideCm / 100,
    frontM: frontCm === null ? common.frontOverhangM : frontCm / 100,
    heightM: heightCm === null ? heightM : heightCm / 100,
  };
}

export function captureCorniceDimensions(value: unknown): { corniceDimensions?: CorniceDimensionsCm } {
  const { sideCm, frontCm, heightCm } = readCorniceDimensionOverrides(value);
  if (sideCm === null && frontCm === null && heightCm === null) return {};
  return {
    corniceDimensions: {
      ...(sideCm === null ? {} : { sideCm }),
      ...(frontCm === null ? {} : { frontCm }),
      ...(heightCm === null ? {} : { heightCm }),
    },
  };
}
