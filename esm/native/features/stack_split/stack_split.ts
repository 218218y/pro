import { WARDROBE_DEFAULTS, WARDROBE_LIMITS } from '../../../shared/wardrobe_dimension_tokens_shared.js';

// Stack Split Feature (stacked wardrobes: lower + upper)
//
// This module centralizes stack-split normalization and a few small helpers used
// across builder/picking/persistence layers.

export type StackKey = 'top' | 'bottom';

type FlagRecord = Record<string, unknown>;

function asFlagRecord(v: unknown): FlagRecord | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  return Object.assign(Object.create(null), v);
}

export type StackSplitNormalized = {
  enabled: boolean;
  active: boolean;

  overallHeightCm: number;
  overallDepthCm: number;

  lowerHeightCm: number;
  lowerDepthCm: number;
  lowerWidthCm: number;
  lowerDoorsCount: number;

  topHeightCm: number;
  topDepthCm: number;

  minTopCm: number;
  minLowerCm: number;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function asFinitePositiveNumber(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function asFiniteInt(v: unknown, fallback: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeStackSplit(args: {
  stackSplitEnabled: boolean;

  overallHeightCm: number;
  overallDepthCm: number;

  // Used only for defaults (lower may differ).
  overallWidthCm?: number;
  overallDoorsCount?: number;

  rawLowerHeightCm: unknown;
  rawLowerDepthCm: unknown;
  rawLowerWidthCm?: unknown;
  rawLowerDoorsCount?: unknown;

  // Linking policy:
  // When manual flag is FALSE, the lower dimension is *linked* to the overall unit and
  // ignores the rawLower* value (raw is kept only as a cached/legacy value).
  // When manual flag is TRUE, rawLower* is respected.
  rawLowerDepthManual?: unknown;
  rawLowerWidthManual?: unknown;
  rawLowerDoorsManual?: unknown;

  defaultLowerHeightCm?: number;
  minTopCm?: number;
  minLowerCm?: number;

  lowerDepthClamp?: { min: number; max: number };
  lowerWidthClamp?: { min: number; max: number };
  lowerDoorsClamp?: { min: number; max: number };
}): StackSplitNormalized {
  const enabled = !!args.stackSplitEnabled;

  const overallHeightCm = Number(args.overallHeightCm);
  const overallDepthCm = Number(args.overallDepthCm);

  // Hard constraint: keep at least 40cm for the upper unit.
  // (We may still *recommend* more in the UI, but we don't block it.)
  const minTopCm =
    typeof args.minTopCm === 'number' && Number.isFinite(args.minTopCm)
      ? args.minTopCm
      : WARDROBE_DEFAULTS.stackSplit.minTopHeightCm;
  const minLowerCm =
    typeof args.minLowerCm === 'number' && Number.isFinite(args.minLowerCm)
      ? args.minLowerCm
      : WARDROBE_DEFAULTS.stackSplit.minLowerHeightCm;

  const defaultLowerHeightCm =
    typeof args.defaultLowerHeightCm === 'number' && Number.isFinite(args.defaultLowerHeightCm)
      ? args.defaultLowerHeightCm
      : WARDROBE_DEFAULTS.stackSplit.lowerHeightCm;

  // Lower height is always its own value.
  let lowerHeightCm = asFinitePositiveNumber(args.rawLowerHeightCm, defaultLowerHeightCm);

  // Depth/Width/Doors can be linked to the overall unit unless explicitly set manual.
  const lowerDepthManual = !!args.rawLowerDepthManual;
  const lowerWidthManual = !!args.rawLowerWidthManual;
  const lowerDoorsManual = !!args.rawLowerDoorsManual;

  let lowerDepthCm = lowerDepthManual
    ? asFinitePositiveNumber(args.rawLowerDepthCm, overallDepthCm)
    : asFinitePositiveNumber(overallDepthCm, overallDepthCm);

  // Lower width/doors may be independent (manual) or linked (default).
  const overallWidthFallback =
    typeof args.overallWidthCm === 'number' && Number.isFinite(args.overallWidthCm) && args.overallWidthCm > 0
      ? args.overallWidthCm
      : 0;
  const overallDoorsFallback =
    typeof args.overallDoorsCount === 'number' &&
    Number.isFinite(args.overallDoorsCount) &&
    args.overallDoorsCount >= 0
      ? Math.max(0, Math.round(args.overallDoorsCount))
      : WARDROBE_DEFAULTS.byType.hinged.doorsCount;

  let lowerWidthCm = lowerWidthManual
    ? asFinitePositiveNumber(
        args.rawLowerWidthCm,
        overallWidthFallback || WARDROBE_DEFAULTS.stackSplit.lowerWidthFallbackCm
      )
    : asFinitePositiveNumber(
        overallWidthFallback || WARDROBE_DEFAULTS.stackSplit.lowerWidthFallbackCm,
        overallWidthFallback || WARDROBE_DEFAULTS.stackSplit.lowerWidthFallbackCm
      );

  let lowerDoorsCount = lowerDoorsManual
    ? asFiniteInt(args.rawLowerDoorsCount, overallDoorsFallback)
    : asFiniteInt(overallDoorsFallback, overallDoorsFallback);

  let active = enabled;

  if (active) {
    const maxLower = Math.max(0, overallHeightCm - minTopCm);
    if (maxLower < minLowerCm) {
      active = false;
    } else {
      lowerHeightCm = clamp(lowerHeightCm, minLowerCm, maxLower);

      const minLowerDepth =
        args.lowerDepthClamp &&
        typeof args.lowerDepthClamp.min === 'number' &&
        Number.isFinite(args.lowerDepthClamp.min)
          ? args.lowerDepthClamp.min
          : WARDROBE_LIMITS.stackSplit.lowerDepthMinCm;
      const maxLowerDepth =
        args.lowerDepthClamp &&
        typeof args.lowerDepthClamp.max === 'number' &&
        Number.isFinite(args.lowerDepthClamp.max)
          ? args.lowerDepthClamp.max
          : WARDROBE_LIMITS.stackSplit.lowerDepthMaxCm;

      lowerDepthCm = clamp(lowerDepthCm, minLowerDepth, maxLowerDepth);

      const minLowerWidth =
        args.lowerWidthClamp &&
        typeof args.lowerWidthClamp.min === 'number' &&
        Number.isFinite(args.lowerWidthClamp.min)
          ? args.lowerWidthClamp.min
          : WARDROBE_LIMITS.stackSplit.lowerWidthMinCm;
      const maxLowerWidth =
        args.lowerWidthClamp &&
        typeof args.lowerWidthClamp.max === 'number' &&
        Number.isFinite(args.lowerWidthClamp.max)
          ? args.lowerWidthClamp.max
          : WARDROBE_LIMITS.stackSplit.lowerWidthMaxCm;

      lowerWidthCm = clamp(lowerWidthCm, minLowerWidth, maxLowerWidth);

      const minLowerDoors =
        args.lowerDoorsClamp &&
        typeof args.lowerDoorsClamp.min === 'number' &&
        Number.isFinite(args.lowerDoorsClamp.min)
          ? args.lowerDoorsClamp.min
          : WARDROBE_LIMITS.stackSplit.lowerDoorsMin;
      const maxLowerDoors =
        args.lowerDoorsClamp &&
        typeof args.lowerDoorsClamp.max === 'number' &&
        Number.isFinite(args.lowerDoorsClamp.max)
          ? args.lowerDoorsClamp.max
          : WARDROBE_LIMITS.stackSplit.lowerDoorsMax;

      lowerDoorsCount = clamp(lowerDoorsCount, minLowerDoors, maxLowerDoors);
    }
  }

  const topHeightCm = active ? overallHeightCm - lowerHeightCm : overallHeightCm;
  const topDepthCm = overallDepthCm;

  return {
    enabled,
    active,
    overallHeightCm,
    overallDepthCm,
    lowerHeightCm,
    lowerDepthCm,
    lowerWidthCm,
    lowerDoorsCount,
    topHeightCm,
    topDepthCm,
    minTopCm,
    minLowerCm,
  };
}

export function getStackKeyFromFlags(flags: unknown): StackKey {
  const f = asFlagRecord(flags);
  const k = f && typeof f.__wpStack === 'string' ? String(f.__wpStack) : 'top';
  return k === 'bottom' ? 'bottom' : 'top';
}

export function getStackSplitFromFlags(flags: unknown): {
  active: boolean;
  lowerHeightCm: number;
  lowerDepthCm: number;
  lowerWidthCm: number;
  lowerDoorsCount: number;
} {
  const f = asFlagRecord(flags);
  const active = !!(f && f.stackSplitActive);

  const bh = active ? Number(f && f.stackSplitLowerHeightCm) : NaN;
  const bd = active ? Number(f && f.stackSplitLowerDepthCm) : NaN;
  const bw = active ? Number(f && f.stackSplitLowerWidthCm) : NaN;
  const bdoors = active ? Math.round(Number(f && f.stackSplitLowerDoorsCount)) : NaN;

  return {
    active,
    lowerHeightCm: Number.isFinite(bh) ? bh : 0,
    lowerDepthCm: Number.isFinite(bd) ? bd : 0,
    lowerWidthCm: Number.isFinite(bw) ? bw : 0,
    lowerDoorsCount: Number.isFinite(bdoors) ? Math.max(0, bdoors) : 0,
  };
}

export function getStackHeightOffsetCm(flags: unknown, stackKey: StackKey): number {
  const sd = getStackSplitFromFlags(flags);
  if (!sd.active) return 0;
  if (stackKey !== 'top') return 0;
  return Number.isFinite(sd.lowerHeightCm) && sd.lowerHeightCm > 0 ? sd.lowerHeightCm : 0;
}

export function subtractOffsetCmIfFinite(valueCm: number, offsetCm: number): number {
  if (!Number.isFinite(valueCm)) return valueCm;
  if (!Number.isFinite(offsetCm) || offsetCm === 0) return valueCm;
  return valueCm - offsetCm;
}

export function addOffsetCmIfFinite(valueCm: number, offsetCm: number): number {
  if (!Number.isFinite(valueCm)) return valueCm;
  if (!Number.isFinite(offsetCm) || offsetCm === 0) return valueCm;
  return valueCm + offsetCm;
}

export function toUpperRelativeHeightCm(absFromFloorCm: number, lowerHeightCm: number): number {
  return subtractOffsetCmIfFinite(absFromFloorCm, lowerHeightCm);
}

export function toAbsHeightFromFloorCm(upperRelativeCm: number, lowerHeightCm: number): number {
  return addOffsetCmIfFinite(upperRelativeCm, lowerHeightCm);
}
