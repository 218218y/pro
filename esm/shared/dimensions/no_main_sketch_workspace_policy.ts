import { NO_MAIN_SKETCH_POLICY } from './no_main_sketch_policy.js';
import { cmToM, mToCm } from './units.js';
import { DEFAULT_HEIGHT, DEFAULT_WIDTH, HINGED_DEFAULT_DEPTH } from './wardrobe_defaults.js';

export const NO_MAIN_SKETCH_WORKSPACE_POLICY = Object.freeze({
  noMainSketch: NO_MAIN_SKETCH_POLICY,
  fallbackDimensionsCm: Object.freeze({
    widthCm: DEFAULT_WIDTH,
    heightCm: DEFAULT_HEIGHT,
    depthCm: HINGED_DEFAULT_DEPTH,
  }),
  cmToM,
  mToCm,
});
