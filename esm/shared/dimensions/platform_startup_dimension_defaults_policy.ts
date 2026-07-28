import { getDefaultDepthForWardrobeType } from './wardrobe_default_resolution_policy.js';
import { DEFAULT_HEIGHT, DEFAULT_WIDTH } from './wardrobe_defaults.js';

export const PLATFORM_STARTUP_DIMENSION_DEFAULTS_POLICY = Object.freeze({
  widthCm: DEFAULT_WIDTH,
  heightCm: DEFAULT_HEIGHT,
  resolveDepthCm: getDefaultDepthForWardrobeType,
});
