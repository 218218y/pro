import { WARDROBE_DEFAULTS, type WardrobeDimensionDefaultType } from './wardrobe_defaults.js';
import { WARDROBE_LAYOUT_COMPARISON_POLICY } from './wardrobe_layout_comparison_policy.js';

function finiteOr(value: unknown, defaultValue: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

export function normalizeWardrobeDimensionDefaultType(value: unknown): WardrobeDimensionDefaultType {
  return value === 'sliding' ? 'sliding' : 'hinged';
}

export function resolveWardrobeTypeDefaults(value: unknown): {
  widthCm: number;
  heightCm: number;
  depthCm: number;
  doorsCount: number;
  perDoorWidthCm: number;
} {
  const type = normalizeWardrobeDimensionDefaultType(value);
  const byType = WARDROBE_DEFAULTS.byType[type];
  return {
    widthCm: WARDROBE_DEFAULTS.widthCm,
    heightCm: WARDROBE_DEFAULTS.heightCm,
    depthCm: byType.depthCm,
    doorsCount: byType.doorsCount,
    perDoorWidthCm: byType.perDoorWidthCm,
  };
}

export function getDefaultDepthForWardrobeType(value: unknown): number {
  return resolveWardrobeTypeDefaults(value).depthCm;
}

export function getDefaultDoorsForWardrobeType(value: unknown): number {
  return resolveWardrobeTypeDefaults(value).doorsCount;
}

export function getDefaultPerDoorWidthForWardrobeType(value: unknown): number {
  return resolveWardrobeTypeDefaults(value).perDoorWidthCm;
}

export function resolveAutoWidthForDoors(value: unknown, doors: unknown): number {
  const n = Math.max(0, Math.round(finiteOr(doors, 0)));
  return n * getDefaultPerDoorWidthForWardrobeType(value);
}

export function isAutoWidthForDoors(value: unknown, widthCm: unknown, doors: unknown): boolean {
  const currentWidthCm = finiteOr(widthCm, 0);
  if (!(currentWidthCm > 0)) return true;
  const expectedWidthCm = resolveAutoWidthForDoors(value, doors);
  return (
    Math.abs(currentWidthCm - expectedWidthCm) < WARDROBE_LAYOUT_COMPARISON_POLICY.autoWidthMatchToleranceCm
  );
}

export function getDefaultWidthForWardrobeType(value: unknown): number {
  const defaults = resolveWardrobeTypeDefaults(value);
  return defaults.doorsCount * defaults.perDoorWidthCm;
}

export function getDefaultHeightForWardrobeType(value: unknown): number {
  return resolveWardrobeTypeDefaults(value).heightCm;
}

export function getDefaultChestDrawersCount(): number {
  return WARDROBE_DEFAULTS.chestDrawersCount;
}

export function resolveDefaultWardrobeDimensions(value: unknown): {
  widthCm: number;
  heightCm: number;
  depthCm: number;
  doorsCount: number;
  perDoorWidthCm: number;
} {
  return resolveWardrobeTypeDefaults(value);
}
