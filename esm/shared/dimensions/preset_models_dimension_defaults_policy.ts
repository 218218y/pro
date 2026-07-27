import { LIBRARY_PRESET_MODULE_DEFAULTS_POLICY } from './library_preset_policy.js';
import { DEFAULT_STACK_SPLIT_LOWER_HEIGHT } from './stack_split_policy.js';
import { WARDROBE_DEFAULTS } from './wardrobe_defaults.js';

export const PRESET_MODELS_DIMENSION_DEFAULTS_POLICY = Object.freeze({
  hingedDoorsCount: WARDROBE_DEFAULTS.byType.hinged.doorsCount,
  hingedDepthCm: WARDROBE_DEFAULTS.byType.hinged.depthCm,
  hingedPerDoorWidthCm: WARDROBE_DEFAULTS.byType.hinged.perDoorWidthCm,
  wardrobeHeightCm: WARDROBE_DEFAULTS.heightCm,
  cornerWidthCm: WARDROBE_DEFAULTS.corner.widthCm,
  cornerDoorsCount: WARDROBE_DEFAULTS.corner.doorsCount,
  chestDrawersCount: WARDROBE_DEFAULTS.chestDrawersCount,
  libraryPresetDoorsCount: LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultDoorsCount,
  libraryPresetModuleDoorsCount: LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultModuleDoorsCount,
  stackSplitLowerHeightCm: DEFAULT_STACK_SPLIT_LOWER_HEIGHT,
});
