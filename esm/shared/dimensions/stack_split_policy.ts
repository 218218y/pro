import { centimeters, meters, type Centimeters, type Meters } from './units.js';

const STACK_SPLIT_DEFAULTS = Object.freeze({
  lowerHeightCm: centimeters(60),
  lowerWidthCm: centimeters(50),
  lowerDoorsCount: 4,
});

const STACK_SPLIT_LIMITS = Object.freeze({
  minTopHeightCm: centimeters(40),
  minLowerHeightCm: centimeters(20),
  lowerDepthMinCm: centimeters(20),
  lowerDepthMaxCm: centimeters(150),
  lowerWidthMinCm: centimeters(30),
  lowerWidthMaxCm: centimeters(800),
  lowerDoorsMin: 0,
  lowerDoorsMax: 20,
});

const STACK_SPLIT_SEAM_POLICY = Object.freeze({
  gapM: meters(0.002),
});

export const STACK_SPLIT_POLICY = Object.freeze({
  defaults: STACK_SPLIT_DEFAULTS,
  limits: STACK_SPLIT_LIMITS,
  seam: STACK_SPLIT_SEAM_POLICY,
});

export const DEFAULT_STACK_SPLIT_LOWER_HEIGHT: Centimeters = STACK_SPLIT_DEFAULTS.lowerHeightCm;
export const DEFAULT_STACK_SPLIT_LOWER_WIDTH: Centimeters = STACK_SPLIT_DEFAULTS.lowerWidthCm;
export const STACK_SPLIT_SEAM_GAP_M: Meters = STACK_SPLIT_SEAM_POLICY.gapM;

export const STACK_SPLIT_LOWER_HEIGHT_MIN: Centimeters = STACK_SPLIT_LIMITS.minLowerHeightCm;
export const STACK_SPLIT_MIN_TOP_HEIGHT: Centimeters = STACK_SPLIT_LIMITS.minTopHeightCm;
export const STACK_SPLIT_LOWER_DEPTH_MIN: Centimeters = STACK_SPLIT_LIMITS.lowerDepthMinCm;
export const STACK_SPLIT_LOWER_DEPTH_MAX: Centimeters = STACK_SPLIT_LIMITS.lowerDepthMaxCm;
export const STACK_SPLIT_LOWER_WIDTH_MIN: Centimeters = STACK_SPLIT_LIMITS.lowerWidthMinCm;
export const STACK_SPLIT_LOWER_WIDTH_MAX: Centimeters = STACK_SPLIT_LIMITS.lowerWidthMaxCm;
export const STACK_SPLIT_LOWER_DOORS_MIN: number = STACK_SPLIT_LIMITS.lowerDoorsMin;
export const STACK_SPLIT_LOWER_DOORS_MAX: number = STACK_SPLIT_LIMITS.lowerDoorsMax;

export function stackSplitCentimeters(value: number): Centimeters {
  return centimeters(value);
}
