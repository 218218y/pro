function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const ref = value => ({ ref: value });
const object = properties => ({ properties });

export const DIMENSION_STATIC_POLICY_CONTRACTS = deepFreeze([
  {
    id: 'structure-tab-auto-width-policy',
    owner: 'esm/shared/dimensions/structure_tab_auto_width_policy.ts',
    exportName: 'STRUCTURE_TAB_AUTO_WIDTH_POLICY',
    sources: [
      {
        file: 'esm/shared/dimensions/wardrobe_default_resolution_policy.ts',
        symbols: ['isAutoWidthForDoors', 'resolveAutoWidthForDoors'],
      },
    ],
    shape: object({
      resolveAutoWidthForDoors: ref('resolveAutoWidthForDoors'),
      isAutoWidthForDoors: ref('isAutoWidthForDoors'),
    }),
    consumers: [
      {
        file: 'esm/shared/dimensions/structure_tab_dimension_policy.ts',
        syntax: 'static-re-export',
        symbols: ['STRUCTURE_TAB_AUTO_WIDTH_POLICY'],
      },
    ],
  },
  {
    id: 'platform-startup-dimension-defaults-policy',
    owner: 'esm/shared/dimensions/platform_startup_dimension_defaults_policy.ts',
    exportName: 'PLATFORM_STARTUP_DIMENSION_DEFAULTS_POLICY',
    sources: [
      {
        file: 'esm/shared/dimensions/wardrobe_default_resolution_policy.ts',
        symbols: ['getDefaultDepthForWardrobeType'],
      },
      {
        file: 'esm/shared/dimensions/wardrobe_defaults.ts',
        symbols: ['DEFAULT_HEIGHT', 'DEFAULT_WIDTH'],
      },
    ],
    shape: object({
      widthCm: ref('DEFAULT_WIDTH'),
      heightCm: ref('DEFAULT_HEIGHT'),
      resolveDepthCm: ref('getDefaultDepthForWardrobeType'),
    }),
    consumers: [
      {
        file: 'esm/native/platform/platform_services.ts',
        symbols: ['PLATFORM_STARTUP_DIMENSION_DEFAULTS_POLICY'],
        access: 'member-only',
      },
    ],
  },
  {
    id: 'preset-models-dimension-defaults-policy',
    owner: 'esm/shared/dimensions/preset_models_dimension_defaults_policy.ts',
    exportName: 'PRESET_MODELS_DIMENSION_DEFAULTS_POLICY',
    sources: [
      {
        file: 'esm/shared/dimensions/library_preset_policy.ts',
        symbols: ['LIBRARY_PRESET_MODULE_DEFAULTS_POLICY'],
      },
      {
        file: 'esm/shared/dimensions/stack_split_policy.ts',
        symbols: ['DEFAULT_STACK_SPLIT_LOWER_HEIGHT'],
      },
      {
        file: 'esm/shared/dimensions/wardrobe_defaults.ts',
        symbols: ['WARDROBE_DEFAULTS'],
      },
    ],
    shape: object({
      hingedDoorsCount: ref('WARDROBE_DEFAULTS.byType.hinged.doorsCount'),
      hingedDepthCm: ref('WARDROBE_DEFAULTS.byType.hinged.depthCm'),
      hingedPerDoorWidthCm: ref('WARDROBE_DEFAULTS.byType.hinged.perDoorWidthCm'),
      wardrobeHeightCm: ref('WARDROBE_DEFAULTS.heightCm'),
      cornerWidthCm: ref('WARDROBE_DEFAULTS.corner.widthCm'),
      cornerDoorsCount: ref('WARDROBE_DEFAULTS.corner.doorsCount'),
      chestDrawersCount: ref('WARDROBE_DEFAULTS.chestDrawersCount'),
      libraryPresetDoorsCount: ref('LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultDoorsCount'),
      libraryPresetModuleDoorsCount: ref('LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultModuleDoorsCount'),
      stackSplitLowerHeightCm: ref('DEFAULT_STACK_SPLIT_LOWER_HEIGHT'),
    }),
    consumers: [
      {
        file: 'esm/native/data/preset_models_data.ts',
        symbols: ['PRESET_MODELS_DIMENSION_DEFAULTS_POLICY'],
        access: 'member-only',
      },
    ],
  },
  {
    id: 'wardrobe-sanitization-policy',
    owner: 'esm/shared/dimensions/wardrobe_sanitization_policy.ts',
    exportName: 'WARDROBE_SANITIZATION_POLICY',
    sources: [
      {
        file: 'esm/shared/dimensions/wardrobe_default_resolution_policy.ts',
        symbols: ['getDefaultDepthForWardrobeType', 'getDefaultDoorsForWardrobeType'],
      },
      {
        file: 'esm/shared/dimensions/wardrobe_defaults.ts',
        symbols: ['DEFAULT_CHEST_DRAWERS_COUNT', 'DEFAULT_HEIGHT', 'DEFAULT_WIDTH'],
      },
      {
        file: 'esm/shared/dimensions/product_limits.ts',
        symbols: [
          'WARDROBE_CHEST_DRAWERS_MAX',
          'WARDROBE_CHEST_DRAWERS_MIN',
          'WARDROBE_CHEST_HEIGHT_MIN',
          'WARDROBE_CHEST_WIDTH_MIN',
          'WARDROBE_DEPTH_MAX',
          'WARDROBE_DEPTH_MIN',
          'WARDROBE_DOORS_MAX',
          'WARDROBE_DOORS_MIN',
          'WARDROBE_HEIGHT_MAX',
          'WARDROBE_HEIGHT_MIN',
          'WARDROBE_SLIDING_DOORS_MIN',
          'WARDROBE_WIDTH_MAX',
          'WARDROBE_WIDTH_MIN',
        ],
      },
    ],
    shape: object({
      defaults: object({
        widthCm: ref('DEFAULT_WIDTH'),
        heightCm: ref('DEFAULT_HEIGHT'),
        chestDrawersCount: ref('DEFAULT_CHEST_DRAWERS_COUNT'),
      }),
      limits: object({
        width: object({
          minCm: ref('WARDROBE_WIDTH_MIN'),
          chestMinCm: ref('WARDROBE_CHEST_WIDTH_MIN'),
          maxCm: ref('WARDROBE_WIDTH_MAX'),
        }),
        height: object({
          minCm: ref('WARDROBE_HEIGHT_MIN'),
          chestMinCm: ref('WARDROBE_CHEST_HEIGHT_MIN'),
          maxCm: ref('WARDROBE_HEIGHT_MAX'),
        }),
        depth: object({
          minCm: ref('WARDROBE_DEPTH_MIN'),
          maxCm: ref('WARDROBE_DEPTH_MAX'),
        }),
        doors: object({
          min: ref('WARDROBE_DOORS_MIN'),
          slidingMin: ref('WARDROBE_SLIDING_DOORS_MIN'),
          max: ref('WARDROBE_DOORS_MAX'),
        }),
        chestDrawers: object({
          min: ref('WARDROBE_CHEST_DRAWERS_MIN'),
          max: ref('WARDROBE_CHEST_DRAWERS_MAX'),
        }),
      }),
      resolveDepthCm: ref('getDefaultDepthForWardrobeType'),
      resolveDoorsCount: ref('getDefaultDoorsForWardrobeType'),
    }),
    consumers: [
      {
        file: 'esm/native/builder/state_sanitize_pipeline.ts',
        symbols: ['WARDROBE_SANITIZATION_POLICY'],
        access: 'member-only',
      },
    ],
  },
  {
    id: 'wardrobe-module-layout-policy',
    owner: 'esm/shared/dimensions/wardrobe_layout_policy.ts',
    exportName: 'WARDROBE_MODULE_LAYOUT_POLICY',
    sources: [],
    shape: object({
      minSegmentWidthCm: { literal: 1 },
      boundaryFullThicknessMultiplier: { literal: 1 },
      boundarySharedThicknessMultiplier: { literal: 0.5 },
    }),
    consumers: [
      {
        file: 'esm/native/builder/core_layout_compute.ts',
        symbols: ['WARDROBE_MODULE_LAYOUT_POLICY'],
        access: 'member-only',
      },
    ],
  },
]);
