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

export const WARDROBE_WIDTH_MIN = 40;
export const WARDROBE_CHEST_WIDTH_MIN = 20;
export const WARDROBE_WIDTH_MAX = 560;

export const WARDROBE_HEIGHT_MIN = 100;
export const WARDROBE_CHEST_HEIGHT_MIN = 20;
export const WARDROBE_HEIGHT_MAX = 300;

export const WARDROBE_DEPTH_MIN = 20;
export const WARDROBE_DEPTH_MAX = 150;

export const WARDROBE_DOORS_MIN = 0;
export const WARDROBE_SLIDING_DOORS_MIN = 2;
export const WARDROBE_DOORS_MAX = 14;

export const WARDROBE_CHEST_DRAWERS_MIN = 2;
export const WARDROBE_CHEST_DRAWERS_MAX = 8;

export const WARDROBE_CELL_DIM_MIN = WARDROBE_DEPTH_MIN;

export const WARDROBE_CELL_WIDTH_MIN = WARDROBE_WIDTH_MIN;
export const WARDROBE_CELL_WIDTH_MAX = WARDROBE_WIDTH_MAX;
export const WARDROBE_CELL_HEIGHT_MIN = WARDROBE_HEIGHT_MIN;
export const WARDROBE_CELL_HEIGHT_MAX = WARDROBE_HEIGHT_MAX;
export const WARDROBE_CELL_DEPTH_MIN = WARDROBE_DEPTH_MIN;
export const WARDROBE_CELL_DEPTH_MAX = WARDROBE_DEPTH_MAX;

export const STACK_SPLIT_LOWER_HEIGHT_MIN = 20;
export const STACK_SPLIT_MIN_TOP_HEIGHT = 40;
export const STACK_SPLIT_LOWER_DEPTH_MIN = WARDROBE_DEPTH_MIN;
export const STACK_SPLIT_LOWER_DEPTH_MAX = WARDROBE_DEPTH_MAX;
export const STACK_SPLIT_LOWER_WIDTH_MIN = 30;
export const STACK_SPLIT_LOWER_WIDTH_MAX = 800;
export const STACK_SPLIT_LOWER_DOORS_MIN = 0;
export const STACK_SPLIT_LOWER_DOORS_MAX = 20;

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
