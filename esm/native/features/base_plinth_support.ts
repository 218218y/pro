import {
  BASE_PLINTH_POLICY,
  basePlinthCentimetersToMeters,
  basePlinthMetersToCentimeters,
} from '../../shared/dimensions/base_plinth_policy.js';

export const DEFAULT_BASE_PLINTH_HEIGHT_CM: number = basePlinthMetersToCentimeters(
  BASE_PLINTH_POLICY.heightM
);
export const BASE_PLINTH_HEIGHT_MIN_CM: number = BASE_PLINTH_POLICY.heightMinCm;
export const BASE_PLINTH_HEIGHT_MAX_CM: number = BASE_PLINTH_POLICY.heightMaxCm;

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
  return roundToSingleDecimal(Math.max(BASE_PLINTH_HEIGHT_MIN_CM, Math.min(BASE_PLINTH_HEIGHT_MAX_CM, raw)));
}

export function getBasePlinthHeightM(value: unknown, defaultValue?: number): number {
  return basePlinthCentimetersToMeters(normalizeBasePlinthHeightCm(value, defaultValue));
}
