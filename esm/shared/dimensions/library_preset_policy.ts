import {
  STACK_SPLIT_LOWER_DEPTH_MIN,
  STACK_SPLIT_LOWER_HEIGHT_MIN,
  STACK_SPLIT_MIN_TOP_HEIGHT,
} from './stack_split_policy.js';

export const LIBRARY_PRESET_MODULE_DEFAULTS_POLICY = Object.freeze({
  defaultDoorsCount: 6,
  defaultModuleDoorsCount: 2,
  topGridDivisions: 5,
  lowerGridDivisions: 2,
});

export const LIBRARY_PRESET_LAYOUT_POLICY = Object.freeze({
  minWidthCm: 20,
  minLowerDepthCm: STACK_SPLIT_LOWER_DEPTH_MIN,
  minLowerHeightCm: STACK_SPLIT_LOWER_HEIGHT_MIN,
  minTopHeightCm: STACK_SPLIT_MIN_TOP_HEIGHT,
  defaultLowerHeightCm: 80,
  lowerDepthInsetCm: 5,
});

export const LIBRARY_PRESET_POLICY = Object.freeze({
  defaultDoorsCount: LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultDoorsCount,
  defaultModuleDoorsCount: LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultModuleDoorsCount,
  topGridDivisions: LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.topGridDivisions,
  lowerGridDivisions: LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.lowerGridDivisions,
  minWidthCm: LIBRARY_PRESET_LAYOUT_POLICY.minWidthCm,
  minLowerDepthCm: LIBRARY_PRESET_LAYOUT_POLICY.minLowerDepthCm,
  minLowerHeightCm: LIBRARY_PRESET_LAYOUT_POLICY.minLowerHeightCm,
  minTopHeightCm: LIBRARY_PRESET_LAYOUT_POLICY.minTopHeightCm,
  defaultLowerHeightCm: LIBRARY_PRESET_LAYOUT_POLICY.defaultLowerHeightCm,
  lowerDepthInsetCm: LIBRARY_PRESET_LAYOUT_POLICY.lowerDepthInsetCm,
});
