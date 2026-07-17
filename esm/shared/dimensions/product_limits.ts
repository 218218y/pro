import { WARDROBE_DEFAULTS } from './wardrobe_defaults.js';

export const WARDROBE_LIMITS = Object.freeze({
  width: Object.freeze({ minCm: 40, chestMinCm: 20, maxCm: 560 }),
  height: Object.freeze({ minCm: 100, chestMinCm: 20, maxCm: 300 }),
  depth: Object.freeze({ minCm: 20, maxCm: 150 }),
  doors: Object.freeze({ min: 0, slidingMin: 2, max: 14 }),
  chestDrawers: Object.freeze({ min: 2, max: 8 }),
  cell: Object.freeze({
    widthMinCm: 20,
    widthMaxCm: 560,
    heightMinCm: 100,
    heightMaxCm: 300,
    depthMinCm: 20,
    depthMaxCm: 150,
  }),
  stackSplit: Object.freeze({
    lowerDepthMinCm: 20,
    lowerDepthMaxCm: 150,
    lowerWidthMinCm: 30,
    lowerWidthMaxCm: 800,
    lowerDoorsMin: 0,
    lowerDoorsMax: 20,
  }),
});

export const WARDROBE_WIDTH_MIN: number = WARDROBE_LIMITS.width.minCm;
export const WARDROBE_CHEST_WIDTH_MIN: number = WARDROBE_LIMITS.width.chestMinCm;
export const WARDROBE_WIDTH_MAX: number = WARDROBE_LIMITS.width.maxCm;

export const WARDROBE_HEIGHT_MIN: number = WARDROBE_LIMITS.height.minCm;
export const WARDROBE_CHEST_HEIGHT_MIN: number = WARDROBE_LIMITS.height.chestMinCm;
export const WARDROBE_HEIGHT_MAX: number = WARDROBE_LIMITS.height.maxCm;

export const WARDROBE_DEPTH_MIN: number = WARDROBE_LIMITS.depth.minCm;
export const WARDROBE_DEPTH_MAX: number = WARDROBE_LIMITS.depth.maxCm;

export const WARDROBE_DOORS_MIN: number = WARDROBE_LIMITS.doors.min;
export const WARDROBE_SLIDING_DOORS_MIN: number = WARDROBE_LIMITS.doors.slidingMin;
export const WARDROBE_DOORS_MAX: number = WARDROBE_LIMITS.doors.max;

export const WARDROBE_CHEST_DRAWERS_MIN: number = WARDROBE_LIMITS.chestDrawers.min;
export const WARDROBE_CHEST_DRAWERS_MAX: number = WARDROBE_LIMITS.chestDrawers.max;

export const WARDROBE_CELL_DIM_MIN: number = WARDROBE_DEPTH_MIN;

export const WARDROBE_CELL_WIDTH_MIN: number = WARDROBE_LIMITS.cell.widthMinCm;
export const WARDROBE_CELL_WIDTH_MAX: number = WARDROBE_LIMITS.cell.widthMaxCm;
export const WARDROBE_CELL_HEIGHT_MIN: number = WARDROBE_LIMITS.cell.heightMinCm;
export const WARDROBE_CELL_HEIGHT_MAX: number = WARDROBE_LIMITS.cell.heightMaxCm;
export const WARDROBE_CELL_DEPTH_MIN: number = WARDROBE_LIMITS.cell.depthMinCm;
export const WARDROBE_CELL_DEPTH_MAX: number = WARDROBE_LIMITS.cell.depthMaxCm;

export const STACK_SPLIT_LOWER_HEIGHT_MIN: number = WARDROBE_DEFAULTS.stackSplit.minLowerHeightCm;
export const STACK_SPLIT_MIN_TOP_HEIGHT: number = WARDROBE_DEFAULTS.stackSplit.minTopHeightCm;
export const STACK_SPLIT_LOWER_DEPTH_MIN: number = WARDROBE_LIMITS.stackSplit.lowerDepthMinCm;
export const STACK_SPLIT_LOWER_DEPTH_MAX: number = WARDROBE_LIMITS.stackSplit.lowerDepthMaxCm;
export const STACK_SPLIT_LOWER_WIDTH_MIN: number = WARDROBE_LIMITS.stackSplit.lowerWidthMinCm;
export const STACK_SPLIT_LOWER_WIDTH_MAX: number = WARDROBE_LIMITS.stackSplit.lowerWidthMaxCm;
export const STACK_SPLIT_LOWER_DOORS_MIN: number = WARDROBE_LIMITS.stackSplit.lowerDoorsMin;
export const STACK_SPLIT_LOWER_DOORS_MAX: number = WARDROBE_LIMITS.stackSplit.lowerDoorsMax;
