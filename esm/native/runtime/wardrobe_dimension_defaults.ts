// Canonical wardrobe dimension defaults (centimeters).
//
// Keep wardrobe dimension defaults here so runtime state, build sanitizing, platform
// helpers, and exports cannot silently drift apart.

export const DEFAULT_WIDTH = 160;
export const DEFAULT_HEIGHT = 240;

export const HINGED_DEFAULT_DEPTH = 55;
export const SLIDING_DEFAULT_DEPTH = 60;

export const DEFAULT_HINGED_DOORS = 4;
export const DEFAULT_SLIDING_DOORS = 2;

export const HINGED_DEFAULT_PER_DOOR_WIDTH = 40;
export const SLIDING_DEFAULT_PER_DOOR_WIDTH = 80;

export type WardrobeDimensionDefaultType = 'hinged' | 'sliding';

export function normalizeWardrobeDimensionDefaultType(value: unknown): WardrobeDimensionDefaultType {
  return value === 'sliding' ? 'sliding' : 'hinged';
}

export function getDefaultDepthForWardrobeType(value: unknown): number {
  return normalizeWardrobeDimensionDefaultType(value) === 'sliding'
    ? SLIDING_DEFAULT_DEPTH
    : HINGED_DEFAULT_DEPTH;
}

export function getDefaultDoorsForWardrobeType(value: unknown): number {
  return normalizeWardrobeDimensionDefaultType(value) === 'sliding'
    ? DEFAULT_SLIDING_DOORS
    : DEFAULT_HINGED_DOORS;
}

export function getDefaultPerDoorWidthForWardrobeType(value: unknown): number {
  return normalizeWardrobeDimensionDefaultType(value) === 'sliding'
    ? SLIDING_DEFAULT_PER_DOOR_WIDTH
    : HINGED_DEFAULT_PER_DOOR_WIDTH;
}

export function getDefaultWidthForWardrobeType(value: unknown): number {
  return getDefaultDoorsForWardrobeType(value) * getDefaultPerDoorWidthForWardrobeType(value);
}
