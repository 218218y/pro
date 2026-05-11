import {
  CARCASS_BASE_DIMENSIONS,
  CM_PER_METER,
  clampDimension,
  mToCm,
} from '../../shared/wardrobe_dimension_tokens_shared.js';

export const DEFAULT_BASE_PLINTH_HEIGHT_CM: number = mToCm(CARCASS_BASE_DIMENSIONS.plinth.heightM);
export const BASE_PLINTH_HEIGHT_MIN_CM: number = CARCASS_BASE_DIMENSIONS.plinth.heightMinCm;
export const BASE_PLINTH_HEIGHT_MAX_CM: number = CARCASS_BASE_DIMENSIONS.plinth.heightMaxCm;

function parseFiniteNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() === '') return NaN;
  return value != null ? Number(value) : NaN;
}

function roundToSingleDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function normalizeBasePlinthHeightCm(
  value: unknown,
  defaultValue = DEFAULT_BASE_PLINTH_HEIGHT_CM
): number {
  const parsed = parseFiniteNumber(value);
  const defaultParsed = Number.isFinite(defaultValue) ? Number(defaultValue) : DEFAULT_BASE_PLINTH_HEIGHT_CM;
  const raw = Number.isFinite(parsed) ? parsed : defaultParsed;
  return roundToSingleDecimal(clampDimension(raw, BASE_PLINTH_HEIGHT_MIN_CM, BASE_PLINTH_HEIGHT_MAX_CM));
}

export function getBasePlinthHeightM(value: unknown, defaultValue?: number): number {
  return normalizeBasePlinthHeightCm(value, defaultValue) / CM_PER_METER;
}
