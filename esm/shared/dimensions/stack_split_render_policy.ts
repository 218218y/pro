import {
  centimeters,
  centimetersToMeters,
  meters,
  metersToCentimeters,
  type Centimeters,
  type Meters,
} from './units.js';

const DECORATIVE_SEPARATOR_DIMENSIONS = Object.freeze({
  visibleHeightM: meters(0.039),
  apronDepthM: meters(0.014),
  frontOverhangM: meters(0.02),
  sideOverhangM: meters(0.015),
  minWidthM: meters(0.2),
  minDepthM: meters(0.12),
  seamCoverDropM: meters(0.012),
  zFightLiftM: meters(0.001),
});

export const STACK_SPLIT_RENDER_POLICY = Object.freeze({
  decorativeSeparator: DECORATIVE_SEPARATOR_DIMENSIONS,
});

function metersToRoundedTenthsCentimeters(value: Meters): Centimeters {
  return centimeters(Math.round(metersToCentimeters(value) * 10) / 10);
}

export const DEFAULT_STACK_SPLIT_DECORATIVE_SEPARATOR_SIDE_OVERHANG_CM: Centimeters =
  metersToRoundedTenthsCentimeters(DECORATIVE_SEPARATOR_DIMENSIONS.sideOverhangM);
export const DEFAULT_STACK_SPLIT_DECORATIVE_SEPARATOR_FRONT_OVERHANG_CM: Centimeters =
  metersToRoundedTenthsCentimeters(DECORATIVE_SEPARATOR_DIMENSIONS.frontOverhangM);

export function stackSplitCentimetersToMeters(value: number): Meters {
  return centimetersToMeters(centimeters(value));
}
