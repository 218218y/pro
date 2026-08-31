import {
  getDefaultDepthForWardrobeType,
  getDefaultDoorsForWardrobeType,
} from './wardrobe_default_resolution_policy.js';
import { DEFAULT_CHEST_DRAWERS_COUNT, DEFAULT_HEIGHT, DEFAULT_WIDTH } from './wardrobe_defaults.js';
import {
  WARDROBE_CHEST_DRAWERS_MAX,
  WARDROBE_CHEST_DRAWERS_MIN,
  WARDROBE_CHEST_HEIGHT_MIN,
  WARDROBE_CHEST_WIDTH_MIN,
  WARDROBE_DEPTH_MAX,
  WARDROBE_DEPTH_MIN,
  WARDROBE_DOORS_MAX,
  WARDROBE_DOORS_MIN,
  WARDROBE_HEIGHT_MAX,
  WARDROBE_HEIGHT_MIN,
  WARDROBE_HINGED_SINGLE_DOOR_WIDTH_MIN,
  WARDROBE_SLIDING_DOORS_MIN,
  WARDROBE_WIDTH_MAX,
  WARDROBE_WIDTH_MIN,
} from './product_limits.js';

export const WARDROBE_SANITIZATION_POLICY = Object.freeze({
  defaults: Object.freeze({
    widthCm: DEFAULT_WIDTH,
    heightCm: DEFAULT_HEIGHT,
    chestDrawersCount: DEFAULT_CHEST_DRAWERS_COUNT,
  }),
  limits: Object.freeze({
    width: Object.freeze({
      minCm: WARDROBE_WIDTH_MIN,
      hingedSingleDoorMinCm: WARDROBE_HINGED_SINGLE_DOOR_WIDTH_MIN,
      chestMinCm: WARDROBE_CHEST_WIDTH_MIN,
      maxCm: WARDROBE_WIDTH_MAX,
    }),
    height: Object.freeze({
      minCm: WARDROBE_HEIGHT_MIN,
      chestMinCm: WARDROBE_CHEST_HEIGHT_MIN,
      maxCm: WARDROBE_HEIGHT_MAX,
    }),
    depth: Object.freeze({
      minCm: WARDROBE_DEPTH_MIN,
      maxCm: WARDROBE_DEPTH_MAX,
    }),
    doors: Object.freeze({
      min: WARDROBE_DOORS_MIN,
      slidingMin: WARDROBE_SLIDING_DOORS_MIN,
      max: WARDROBE_DOORS_MAX,
    }),
    chestDrawers: Object.freeze({
      min: WARDROBE_CHEST_DRAWERS_MIN,
      max: WARDROBE_CHEST_DRAWERS_MAX,
    }),
  }),
  resolveDepthCm: getDefaultDepthForWardrobeType,
  resolveDoorsCount: getDefaultDoorsForWardrobeType,
});
