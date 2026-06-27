import { CARCASS_BASE_DIMENSIONS, WARDROBE_DEFAULTS } from '../../shared/wardrobe_dimension_tokens_shared.js';

export const PLATFORM_OVERHANG_MIN_CM = 0;
export const PLATFORM_OVERHANG_MAX_CM = 20;

export const DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM =
  Math.round(CARCASS_BASE_DIMENSIONS.legs.platform.sideOverhangM * 1000) / 10;
export const DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM =
  Math.round(CARCASS_BASE_DIMENSIONS.legs.platform.frontOverhangM * 1000) / 10;

export const DEFAULT_STACK_SPLIT_DECORATIVE_SEPARATOR_SIDE_OVERHANG_CM =
  Math.round(WARDROBE_DEFAULTS.stackSplit.decorativeSeparator.sideOverhangM * 1000) / 10;
export const DEFAULT_STACK_SPLIT_DECORATIVE_SEPARATOR_FRONT_OVERHANG_CM =
  Math.round(WARDROBE_DEFAULTS.stackSplit.decorativeSeparator.frontOverhangM * 1000) / 10;

function parseFiniteNumber(value: unknown): number {
  return typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() === ''
      ? NaN
      : value != null
        ? Number(value)
        : NaN;
}

export function normalizePlatformOverhangCm(value: unknown, defaultValue: number): number {
  const parsed = parseFiniteNumber(value);
  const defaultParsed = Number.isFinite(defaultValue) ? Number(defaultValue) : 0;
  const raw = Number.isFinite(parsed) ? parsed : defaultParsed;
  const clamped = Math.max(PLATFORM_OVERHANG_MIN_CM, Math.min(PLATFORM_OVERHANG_MAX_CM, raw));
  return Math.round(clamped * 10) / 10;
}

export function platformOverhangCmToM(value: unknown, defaultValue: number): number {
  return normalizePlatformOverhangCm(value, defaultValue) / 100;
}

export function normalizeBaseLegPlatformSideOverhangCm(value: unknown): number {
  return normalizePlatformOverhangCm(value, DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM);
}

export function normalizeBaseLegPlatformFrontOverhangCm(value: unknown): number {
  return normalizePlatformOverhangCm(value, DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM);
}

export function normalizeStackSplitDecorativeSeparatorSideOverhangCm(value: unknown): number {
  return normalizePlatformOverhangCm(value, DEFAULT_STACK_SPLIT_DECORATIVE_SEPARATOR_SIDE_OVERHANG_CM);
}

export function normalizeStackSplitDecorativeSeparatorFrontOverhangCm(value: unknown): number {
  return normalizePlatformOverhangCm(value, DEFAULT_STACK_SPLIT_DECORATIVE_SEPARATOR_FRONT_OVERHANG_CM);
}
