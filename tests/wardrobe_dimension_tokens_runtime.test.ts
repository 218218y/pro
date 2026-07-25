import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BASE_LEG_DIMENSIONS as FACADE_BASE_LEG_DIMENSIONS,
  CARCASS_BASE_DIMENSIONS as FACADE_CARCASS_BASE_DIMENSIONS,
  CARCASS_CORNICE_DIMENSIONS as FACADE_CARCASS_CORNICE_DIMENSIONS,
  CARCASS_INTERIOR_DIMENSIONS as FACADE_CARCASS_INTERIOR_DIMENSIONS,
  CARCASS_SHELL_DIMENSIONS as FACADE_CARCASS_SHELL_DIMENSIONS,
  CHEST_MODE_DIMENSIONS as FACADE_CHEST_MODE_DIMENSIONS,
  CONTENT_VISUAL_DIMENSIONS as FACADE_CONTENT_VISUAL_DIMENSIONS,
  DOOR_MOUNT_THICKNESS_CONFIG_KEYS as FACADE_DOOR_MOUNT_THICKNESS_CONFIG_KEYS,
  DOOR_MOUNT_THICKNESS_DIMENSIONS as FACADE_DOOR_MOUNT_THICKNESS_DIMENSIONS,
  DOOR_VISUAL_DIMENSIONS as FACADE_DOOR_VISUAL_DIMENSIONS,
  DOOR_SYSTEM_DIMENSIONS,
  DOOR_TRIM_DIMENSIONS as FACADE_DOOR_TRIM_DIMENSIONS,
  DRAWER_DIMENSIONS,
  FRONT_REVEAL_FRAME_DIMENSIONS as FACADE_FRONT_REVEAL_FRAME_DIMENSIONS,
  HANDLE_DIMENSIONS as FACADE_HANDLE_DIMENSIONS,
  INTERIOR_FITTINGS_DIMENSIONS,
  MATERIAL_DIMENSIONS,
  WARDROBE_LAYOUT_DIMENSIONS,
  WARDROBE_DEFAULTS as FACADE_WARDROBE_DEFAULTS,
  resolveExternalDrawerGeometry,
} from '../esm/shared/wardrobe_dimension_tokens_shared.ts';
import { CARCASS_SHELL_DIMENSIONS } from '../esm/shared/dimensions/carcass_shell_policy.ts';
import { CARCASS_INTERIOR_DIMENSIONS } from '../esm/shared/dimensions/carcass_interior_policy.ts';
import { CARCASS_INTERIOR_GRID_POLICY } from '../esm/shared/dimensions/carcass_interior_grid_policy.ts';
import { BASE_PLINTH_POLICY } from '../esm/shared/dimensions/base_plinth_policy.ts';
import { BASE_LEG_DIMENSIONS, BASE_LEG_LAYOUT_POLICY } from '../esm/shared/dimensions/base_leg_policy.ts';
import { BASE_PLATFORM_RENDER_POLICY } from '../esm/shared/dimensions/base_platform_render_policy.ts';
import {
  CHEST_CASTER_RENDER_POLICY,
  CHEST_CONNECTOR_POLICY,
  CHEST_DRAWER_GEOMETRY_POLICY,
  CHEST_MOTION_POLICY,
  CHEST_SHELL_POLICY,
  CHEST_STRUCTURAL_DIMENSIONS,
} from '../esm/shared/dimensions/chest_structural_policy.ts';
import { MATERIAL_THICKNESS_POLICY } from '../esm/shared/dimensions/material_thickness_policy.ts';
import {
  CARCASS_CORNICE_ANGLE_POLICY,
  CARCASS_CORNICE_COMMON_POLICY,
  CARCASS_CORNICE_PROFILE_POLICY,
  CARCASS_CORNICE_RENDER_POLICY,
  CARCASS_CORNICE_WAVE_POLICY,
} from '../esm/shared/dimensions/carcass_cornice_render_policy.ts';
import {
  CHEST_MODE_ACTIVE_DEFAULTS_POLICY,
  CHEST_MODE_COMMODE_CONSTRAINTS_POLICY,
  CHEST_MODE_COMMODE_RENDER_POLICY,
  CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY,
  CHEST_MODE_DIMENSIONS,
  CHEST_MODE_DRAWER_BOX_RENDER_POLICY,
} from '../esm/shared/dimensions/chest_mode_policy.ts';
import {
  DOOR_SYSTEM_DIMENSIONS as OWNER_DOOR_SYSTEM_DIMENSIONS,
  HINGED_DOOR_MOUNT_POLICY,
  HINGED_DOOR_RENDER_POLICY,
  HINGED_DOOR_SPLIT_AUTHORING_POLICY,
  HINGED_DOOR_SPLIT_GEOMETRY_POLICY,
  HINGED_DOOR_SPLIT_POLICY,
  HINGED_DOOR_SYSTEM_POLICY,
  SLIDING_DOOR_CONSTRUCTION_POLICY,
  SLIDING_DOOR_HANDLE_RENDER_POLICY,
  SLIDING_DOOR_MOTION_POLICY,
  SLIDING_DOOR_SYSTEM_POLICY,
} from '../esm/shared/dimensions/door_system_policy.ts';
import {
  DOOR_MOUNT_THICKNESS_CONFIG_KEYS,
  DOOR_MOUNT_THICKNESS_DIMENSIONS,
  getDefaultDoorMountThicknessCm,
  getDefaultDoorMountThicknessM,
  getDoorMountThicknessConfigKey,
  normalizeDoorMountThicknessCm,
  resolveDoorMountThicknessesFromConfig as resolveDoorMountThicknessesFromOwner,
} from '../esm/shared/dimensions/door_mount_thickness_policy.ts';
import {
  DOOR_ACCENT_RENDER_POLICY,
  DOOR_DOUBLE_PROFILE_RENDER_POLICY,
  DOOR_GLASS_RENDER_POLICY,
  DOOR_GROOVE_RENDER_POLICY,
  DOOR_MIRROR_LAYOUT_POLICY,
  DOOR_MIRROR_POLICY,
  DOOR_MIRROR_RENDER_POLICY,
  DOOR_MITER_RENDER_POLICY,
  DOOR_PROFILE_RENDER_POLICY,
  DOOR_VISUAL_COMMON_POLICY,
  DOOR_VISUAL_DIMENSIONS as OWNER_DOOR_VISUAL_DIMENSIONS,
} from '../esm/shared/dimensions/door_visual_policy.ts';
import {
  DOOR_TRIM_AUTHORING_DEFAULTS_POLICY,
  DOOR_TRIM_DEFAULTS_POLICY,
  DOOR_TRIM_DIMENSIONS,
  DOOR_TRIM_LIMITS_POLICY,
  DOOR_TRIM_NORMALIZATION_POLICY,
  DOOR_TRIM_REMOVE_TOLERANCE_POLICY,
  DOOR_TRIM_RENDER_POLICY,
  DOOR_TRIM_SNAP_POLICY,
} from '../esm/shared/dimensions/door_trim_policy.ts';
import {
  EXTERNAL_DRAWER_BOX_POLICY,
  EXTERNAL_DRAWER_CONNECTOR_POLICY,
  EXTERNAL_DRAWER_CONTENTS_POLICY,
  EXTERNAL_DRAWER_FRONT_RENDER_POLICY,
  EXTERNAL_DRAWER_MOTION_POLICY,
  EXTERNAL_DRAWER_POLICY,
  EXTERNAL_DRAWER_SEPARATOR_POLICY,
  EXTERNAL_DRAWER_SIZE_POLICY,
  resolveExternalDrawerGeometry as resolveExternalDrawerGeometryFromOwner,
} from '../esm/shared/dimensions/external_drawer_policy.ts';
import {
  INTERNAL_DRAWER_CONTENTS_POLICY,
  INTERNAL_DRAWER_LAYOUT_POLICY,
  INTERNAL_DRAWER_MOTION_POLICY,
  INTERNAL_DRAWER_POLICY,
} from '../esm/shared/dimensions/internal_drawer_policy.ts';
import {
  INTERIOR_STORAGE_BARRIER_POLICY,
  INTERIOR_STORAGE_CLAMP_POLICY,
  INTERIOR_STORAGE_DEFAULTS_POLICY,
  INTERIOR_STORAGE_GRID_POLICY,
  INTERIOR_STORAGE_LAYOUT_POLICY,
  INTERIOR_STORAGE_POLICY,
  INTERIOR_STORAGE_PREVIEW_POLICY,
} from '../esm/shared/dimensions/interior_storage_policy.ts';
import {
  INTERIOR_FITTINGS_POLICY,
  INTERIOR_PRESET_POLICY,
  INTERIOR_PRESET_ROD_FACTORS_POLICY,
  INTERIOR_PRESET_SHELF_ROWS_POLICY,
  INTERIOR_ROD_CONTENT_CLEARANCE_POLICY,
  INTERIOR_ROD_DEPTH_CLEARANCE_POLICY,
  INTERIOR_ROD_PLACEMENT_POLICY,
  INTERIOR_ROD_POLICY,
  INTERIOR_ROD_RENDER_POLICY,
  INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY,
  INTERIOR_SHELF_GEOMETRY_POLICY,
  INTERIOR_SHELF_PIN_RENDER_POLICY,
  INTERIOR_SHELF_POLICY,
  INTERIOR_SHELF_ROUNDED_RENDER_POLICY,
} from '../esm/shared/dimensions/interior_fittings_policy.ts';
import {
  DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY,
  DRAWER_SKETCH_DOOR_CUT_POLICY,
  DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY,
  DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY,
  DRAWER_SKETCH_POLICY,
  DRAWER_SKETCH_PREVIEW_RENDER_POLICY,
  DRAWER_SKETCH_SIZING_POLICY,
} from '../esm/shared/dimensions/drawer_sketch_policy.ts';
import {
  FRONT_REVEAL_FRAME_POLICY,
  FRONT_REVEAL_GEOMETRY_POLICY,
  FRONT_REVEAL_PRESENCE_POLICY,
  FRONT_REVEAL_THICKNESS_POLICY,
} from '../esm/shared/dimensions/front_reveal_frame_policy.ts';
import {
  DRAWER_HANDLE_PLACEMENT_POLICY,
  EDGE_HANDLE_PROFILE_RENDER_POLICY,
  EDGE_HANDLE_SIZE_POLICY,
  EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY,
  HANDLE_POLICY,
  STANDARD_HANDLE_RENDER_POLICY,
} from '../esm/shared/dimensions/handle_policy.ts';
import {
  BOOK_CONTENT_VISUAL_POLICY,
  CONTENT_VISUAL_POLICY,
  FOLDED_CLOTHES_VISUAL_POLICY,
  HANGER_VISUAL_POLICY,
  HANGING_CLOTHES_VISUAL_POLICY,
} from '../esm/shared/dimensions/content_visual_policy.ts';
import {
  SKETCH_BOX_CLASSIC_ACCENT_POLICY,
  SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY,
  SKETCH_BOX_CLASSIC_GROOVE_POLICY,
} from '../esm/shared/dimensions/sketch_box_classic_door_visual_policy.ts';
import {
  getDefaultDepthForWardrobeType,
  getDefaultDoorsForWardrobeType,
  getDefaultWidthForWardrobeType,
  isAutoWidthForDoors,
  resolveDoorMountThicknessesFromConfig,
} from '../esm/shared/wardrobe_dimension_tokens_shared.ts';
import {
  CELL_DIMENSION_MATCH_POLICY,
  CELL_DIMENSION_PREVIEW_POLICY,
} from '../esm/shared/dimensions/cell_dimension_policy.ts';
import { WARDROBE_LAYOUT_COMPARISON_POLICY } from '../esm/shared/dimensions/wardrobe_layout_comparison_policy.ts';
import { WARDROBE_MODULE_LAYOUT_POLICY } from '../esm/shared/dimensions/wardrobe_layout_policy.ts';
import {
  DEFAULT_HINGED_DOORS,
  DEFAULT_SLIDING_DOORS,
  DEFAULT_WIDTH,
  HINGED_DEFAULT_DEPTH,
  SLIDING_DEFAULT_DEPTH,
  WARDROBE_DEFAULTS,
} from '../esm/shared/dimensions/wardrobe_defaults.ts';
import { WARDROBE_LIMITS } from '../esm/shared/dimensions/product_limits.ts';
import {
  DEFAULT_STACK_SPLIT_LOWER_HEIGHT,
  STACK_SPLIT_POLICY,
} from '../esm/shared/dimensions/stack_split_policy.ts';
import {
  DEFAULT_STACK_SPLIT_DECORATIVE_SEPARATOR_FRONT_OVERHANG_CM,
  DEFAULT_STACK_SPLIT_DECORATIVE_SEPARATOR_SIDE_OVERHANG_CM,
  STACK_SPLIT_RENDER_POLICY,
  stackSplitCentimetersToMeters,
} from '../esm/shared/dimensions/stack_split_render_policy.ts';
import {
  cmToM,
  centimeters,
  centimetersToMeters,
  metersToWorldUnits,
  millimeters,
  millimetersToCentimeters,
  pixels,
  worldUnitsToMeters,
} from '../esm/shared/dimensions/units.ts';
import {
  DEFAULT_BASE_LEG_HEIGHT_CM,
  DEFAULT_TAPERED_BASE_LEG_WIDTH_CM,
} from '../esm/native/features/base_leg_support.ts';
import { DEFAULT_DOOR_TRIM_CROSS_SIZE_CM } from '../esm/native/features/door_authoring/api.ts';
import {
  DEFAULT_MODULE_CELL_COUNT,
  createDefaultModuleCustomData,
} from '../esm/native/features/modules_configuration/module_defaults.ts';
import {
  createDefaultLowerModuleConfig,
  createDefaultTopModuleConfig as createDefaultStackTopModuleConfig,
} from '../esm/native/features/stack_split/module_config.ts';
import {
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM,
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M,
  DEFAULT_SKETCH_INTERNAL_DRAWER_GAP_M,
  DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM,
  DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M,
  createSketchExternalDrawersTool,
  createSketchInternalDrawersTool,
  normalizeSketchDrawerHeightCm,
  normalizeSketchDrawerHeightM,
  parseSketchExternalDrawersTool,
  parseSketchInternalDrawersTool,
  readSketchDrawerHeightMFromItem,
  resolveSketchExternalDrawerMetrics,
  resolveSketchInternalDrawerMetrics,
  sketchStackFitsAvailableHeight,
  SKETCH_DRAWER_HEIGHT_MAX_CM,
  SKETCH_DRAWER_HEIGHT_MIN_CM,
  SKETCH_EXTERNAL_DRAWER_COUNT_MIN,
  SKETCH_EXTERNAL_DRAWER_COUNT_MAX,
  SKETCH_INTERNAL_DRAWER_STACK_COUNT,
} from '../esm/native/features/sketch_drawer_sizing.ts';
import {
  resolveSketchInternalDrawerCassetteDrawerWidth,
  resolveSketchInternalDrawerCassetteFrameOuterWidth,
  resolveSketchInternalDrawerCassetteRange,
  resolveSketchInternalDrawerCassetteSideFillerWidth,
  resolveSketchInternalDrawerCassetteWoodThick,
  SKETCH_INTERNAL_DRAWER_CASSETTE_TOUCH_EPSILON_M,
  verticalRangesTouchOrOverlap,
} from '../esm/native/features/sketch_internal_drawer_cassette.ts';
import { computeExternalDrawersOpsForModule } from '../esm/native/builder/core_storage_compute_external_drawers.ts';

test('wardrobe default tokens preserve hinged and sliding business defaults', () => {
  assert.notEqual(FACADE_WARDROBE_DEFAULTS, WARDROBE_DEFAULTS);
  assert.equal(FACADE_WARDROBE_DEFAULTS.widthCm, WARDROBE_DEFAULTS.widthCm);
  assert.equal(FACADE_WARDROBE_DEFAULTS.byType, WARDROBE_DEFAULTS.byType);
  assert.equal(DEFAULT_WIDTH, WARDROBE_DEFAULTS.widthCm);
  assert.equal(HINGED_DEFAULT_DEPTH, 55);
  assert.equal(SLIDING_DEFAULT_DEPTH, 60);
  assert.equal(DEFAULT_HINGED_DOORS, 4);
  assert.equal(DEFAULT_SLIDING_DOORS, 2);
  assert.equal(DEFAULT_STACK_SPLIT_LOWER_HEIGHT, 60);

  assert.equal(getDefaultDepthForWardrobeType('hinged'), 55);
  assert.equal(getDefaultDepthForWardrobeType('sliding'), 60);
  assert.equal(getDefaultDoorsForWardrobeType('hinged'), 4);
  assert.equal(getDefaultDoorsForWardrobeType('sliding'), 2);
  assert.equal(getDefaultWidthForWardrobeType('hinged'), 160);
  assert.equal(getDefaultWidthForWardrobeType('sliding'), 160);
});

test('Wardrobe Layout compatibility projection preserves focused-owner identity and comparison semantics', () => {
  const expectedKeys = [
    'minSegmentWidthCm',
    'boundaryFullThicknessMultiplier',
    'boundarySharedThicknessMultiplier',
    'autoWidthMatchToleranceCm',
    'valueEqualityToleranceCm',
    'cellDimsMatchToleranceCm',
    'cellDimsPreview',
  ];
  assert.deepEqual(Object.keys(WARDROBE_LAYOUT_DIMENSIONS), expectedKeys);
  assert.equal(WARDROBE_LAYOUT_DIMENSIONS.minSegmentWidthCm, WARDROBE_MODULE_LAYOUT_POLICY.minSegmentWidthCm);
  assert.equal(
    WARDROBE_LAYOUT_DIMENSIONS.boundaryFullThicknessMultiplier,
    WARDROBE_MODULE_LAYOUT_POLICY.boundaryFullThicknessMultiplier
  );
  assert.equal(
    WARDROBE_LAYOUT_DIMENSIONS.boundarySharedThicknessMultiplier,
    WARDROBE_MODULE_LAYOUT_POLICY.boundarySharedThicknessMultiplier
  );
  assert.equal(WARDROBE_LAYOUT_DIMENSIONS.cellDimsPreview, CELL_DIMENSION_PREVIEW_POLICY);
  assert.equal(WARDROBE_LAYOUT_DIMENSIONS.cellDimsMatchToleranceCm, CELL_DIMENSION_MATCH_POLICY.toleranceCm);
  assert.equal(
    WARDROBE_LAYOUT_DIMENSIONS.autoWidthMatchToleranceCm,
    WARDROBE_LAYOUT_COMPARISON_POLICY.autoWidthMatchToleranceCm
  );
  assert.equal(
    WARDROBE_LAYOUT_DIMENSIONS.valueEqualityToleranceCm,
    WARDROBE_LAYOUT_COMPARISON_POLICY.valueEqualityToleranceCm
  );
  assert.equal(Object.isFrozen(WARDROBE_LAYOUT_DIMENSIONS), true);
  assert.equal(Object.isFrozen(CELL_DIMENSION_MATCH_POLICY), true);
  assert.equal(Object.isFrozen(CELL_DIMENSION_PREVIEW_POLICY), true);
  assert.equal(Object.isFrozen(WARDROBE_MODULE_LAYOUT_POLICY), true);
  assert.equal(Object.isFrozen(WARDROBE_LAYOUT_COMPARISON_POLICY), true);

  const serialized = JSON.stringify(WARDROBE_LAYOUT_DIMENSIONS);
  assert.equal(typeof serialized, 'string');
  const roundTrip = JSON.parse(serialized);
  assert.deepEqual(Object.keys(roundTrip), expectedKeys);
  assert.deepEqual(roundTrip, WARDROBE_LAYOUT_DIMENSIONS);

  const expectedWidthCm = 160;
  const toleranceCm = WARDROBE_LAYOUT_COMPARISON_POLICY.autoWidthMatchToleranceCm;
  assert.equal(isAutoWidthForDoors('hinged', expectedWidthCm + toleranceCm / 2, 4), true);
  assert.equal(Math.abs(toleranceCm - 0), toleranceCm);
  assert.equal(isAutoWidthForDoors('hinged', toleranceCm, 0), false);
  assert.equal(isAutoWidthForDoors('hinged', expectedWidthCm + toleranceCm + 0.001, 4), false);
});

test('stack split policy preserves business limits, defaults, facade parity, and render geometry', () => {
  assert.deepEqual(STACK_SPLIT_POLICY.defaults, {
    lowerHeightCm: 60,
    lowerWidthCm: 50,
    lowerDoorsCount: 4,
  });
  assert.deepEqual(STACK_SPLIT_POLICY.limits, {
    minTopHeightCm: 40,
    minLowerHeightCm: 20,
    lowerDepthMinCm: 20,
    lowerDepthMaxCm: 150,
    lowerWidthMinCm: 30,
    lowerWidthMaxCm: 800,
    lowerDoorsMin: 0,
    lowerDoorsMax: 20,
  });
  assert.deepEqual(STACK_SPLIT_POLICY.seam, { gapM: 0.002 });
  assert.deepEqual(WARDROBE_LIMITS.stackSplit, {
    minTopHeightCm: 40,
    minLowerHeightCm: 20,
    lowerDepthMinCm: 20,
    lowerDepthMaxCm: 150,
    lowerWidthMinCm: 30,
    lowerWidthMaxCm: 800,
    lowerDoorsMin: 0,
    lowerDoorsMax: 20,
  });
  assert.deepEqual(STACK_SPLIT_RENDER_POLICY.decorativeSeparator, {
    visibleHeightM: 0.039,
    apronDepthM: 0.014,
    frontOverhangM: 0.02,
    sideOverhangM: 0.015,
    minWidthM: 0.2,
    minDepthM: 0.12,
    seamCoverDropM: 0.012,
    zFightLiftM: 0.001,
  });
  assert.equal(DEFAULT_STACK_SPLIT_DECORATIVE_SEPARATOR_SIDE_OVERHANG_CM, 1.5);
  assert.equal(DEFAULT_STACK_SPLIT_DECORATIVE_SEPARATOR_FRONT_OVERHANG_CM, 2);
  assert.equal(stackSplitCentimetersToMeters(55), 0.55);

  assert.deepEqual(FACADE_WARDROBE_DEFAULTS.stackSplit, {
    lowerHeightCm: 60,
    minTopHeightCm: 40,
    minLowerHeightCm: 20,
    seamGapM: 0.002,
    lowerWidthDefaultCm: 50,
    decorativeSeparator: STACK_SPLIT_RENDER_POLICY.decorativeSeparator,
  });
});

test('dimension foundation uses explicit unit constructors and conversions without changing scale', () => {
  assert.equal(millimetersToCentimeters(millimeters(180)), 18);
  assert.equal(centimetersToMeters(centimeters(240)), 2.4);
  assert.equal(worldUnitsToMeters(metersToWorldUnits(centimetersToMeters(centimeters(55)))), 0.55);
  assert.equal(pixels(320), 320);
  assert.throws(() => centimeters(Number.NaN), /finite number/);
});

test('carcass shell and interior policies preserve facade identity and every migrated value', () => {
  assert.equal(FACADE_CARCASS_SHELL_DIMENSIONS, CARCASS_SHELL_DIMENSIONS);
  assert.equal(FACADE_CARCASS_INTERIOR_DIMENSIONS, CARCASS_INTERIOR_DIMENSIONS);
  assert.deepEqual(CARCASS_SHELL_DIMENSIONS, {
    frontInsetZM: 0.005,
    backInsetZM: 0.0078,
    boardMinDimensionM: 0.001,
    boardMinDepthM: 0.02,
    bodyMinDepthM: 0.05,
    bodyMinHeightM: 0.05,
    floorCeilWidthClearanceM: 0.001,
    backPanelWidthClearanceM: 0.002,
    backPanelSegmentWidthClearanceM: 0.002,
    backPanelThicknessM: 0.005,
    backPanelZM: 0.005,
    sideDepthClearanceM: 0.0078,
    sideZOffsetM: 0.0039,
    internalBackInsetM: 0.005,
    drawerGridDivisions: 6,
    drawerSplitGridLineIndex: 4,
  });
  assert.deepEqual(CARCASS_INTERIOR_DIMENSIONS, {
    minTopBodyHeightM: 0.05,
    slidingDepthReductionM: 0.12,
    hingedDepthReductionM: 0.03,
    internalBackInsetM: 0.005,
  });
  assert.equal(CARCASS_INTERIOR_DIMENSIONS.minTopBodyHeightM, CARCASS_SHELL_DIMENSIONS.bodyMinHeightM);
  assert.equal(CARCASS_INTERIOR_DIMENSIONS.internalBackInsetM, CARCASS_SHELL_DIMENSIONS.internalBackInsetM);
  assert.deepEqual(CARCASS_INTERIOR_GRID_POLICY, {
    divisions: 6,
    drawerSplitLineIndex: 4,
  });
  assert.equal(CARCASS_SHELL_DIMENSIONS.drawerGridDivisions, CARCASS_INTERIOR_GRID_POLICY.divisions);
  assert.equal(
    CARCASS_SHELL_DIMENSIONS.drawerSplitGridLineIndex,
    CARCASS_INTERIOR_GRID_POLICY.drawerSplitLineIndex
  );
});

test('Base Support policies preserve every value and facade nested-object identity', () => {
  assert.equal(FACADE_CARCASS_BASE_DIMENSIONS.plinth, BASE_PLINTH_POLICY);
  assert.equal(FACADE_CARCASS_BASE_DIMENSIONS.legs, BASE_LEG_LAYOUT_POLICY);
  assert.equal(FACADE_CARCASS_BASE_DIMENSIONS.legs.platform, BASE_PLATFORM_RENDER_POLICY);
  assert.equal(FACADE_BASE_LEG_DIMENSIONS, BASE_LEG_DIMENSIONS);

  assert.deepEqual(BASE_PLINTH_POLICY, {
    heightM: 0.08,
    heightMinCm: 1,
    heightMaxCm: 60,
    widthClearanceM: 0.04,
    fallbackWidthClearanceM: 0.02,
    depthClearanceM: 0.05,
    frontInsetM: 0.015,
    minSegmentWidthM: 0.05,
    minSegmentDepthM: 0.05,
    segmentWidthEpsilonM: 0.001,
    steppedMinSegmentDepthM: 0.02,
    steppedBackInsetM: 0.01,
    connectorShapeInsetM: 0.04,
    connectorMaxToeRatio: 0.35,
    connectorToeEndTrimMaxM: 0.03,
    connectorWallInsetM: 0.01,
    connectorTinyEpsilonM: 0.0005,
  });
  assert.deepEqual(BASE_LEG_LAYOUT_POLICY, {
    cornerInsetM: 0.05,
    centerSupportDoorsThreshold: 5,
    chestCenterSupportWidthThresholdM: 1.2,
    connectorInsetM: 0.06,
    connectorBackInsetM: 0.01,
    depthSteppedMinFrontBackGapM: 0.03,
    platform: BASE_PLATFORM_RENDER_POLICY,
  });
  assert.deepEqual(BASE_PLATFORM_RENDER_POLICY, {
    heightM: 0.028,
    apronDepthM: 0.014,
    frontOverhangM: 0.02,
    sideOverhangM: 0.015,
    minWidthM: 0.2,
    minDepthM: 0.12,
    zFightLiftM: 0.001,
  });
  assert.deepEqual(BASE_LEG_DIMENSIONS, {
    defaults: {
      style: 'tapered',
      color: 'black',
      heightCm: 12,
      widthCm: 3.5,
      taperedWidthCm: 4,
      wheelWidthCm: 5,
    },
    limits: {
      heightMinCm: 1,
      heightMaxCm: 60,
      widthMinCm: 1,
      widthMaxCm: 30,
    },
  });
});

test('Chest Structural policy preserves every value, aggregate reference, and facade identity', () => {
  assert.equal(FACADE_CARCASS_BASE_DIMENSIONS.chest, CHEST_STRUCTURAL_DIMENSIONS);
  assert.equal(CHEST_STRUCTURAL_DIMENSIONS.wheels, CHEST_CASTER_RENDER_POLICY);

  assert.deepEqual(CHEST_SHELL_POLICY, {
    backThicknessM: 0.005,
    backInsetM: 0.005,
    backPanelWidthClearanceM: 0.002,
    backPanelHeightClearanceM: 0.002,
  });
  assert.deepEqual(CHEST_DRAWER_GEOMETRY_POLICY, {
    drawerGapM: 0.004,
    drawerWidthClearanceM: 0.004,
    drawerFrontThicknessM: 0.018,
    drawerShadowLineThicknessM: 0.001,
    drawerBoxWidthClearanceM: 0.03,
    drawerBoxHeightClearanceM: 0.05,
    drawerBoxDepthClearanceM: 0.05,
  });
  assert.deepEqual(CHEST_CONNECTOR_POLICY, {
    connectorDepthM: 0.02,
    connectorBackInsetM: 0.003,
    connectorWidthClearanceM: 0.08,
    connectorHeightClearanceM: 0.02,
  });
  assert.deepEqual(CHEST_MOTION_POLICY, { openOffsetZM: 0.35 });
  assert.deepEqual(CHEST_CASTER_RENDER_POLICY, {
    heightM: 0.07,
    radiusM: 0.025,
    thicknessM: 0.018,
    plateWidthM: 0.06,
    plateHeightM: 0.006,
    plateDepthM: 0.05,
    forkWidthM: 0.008,
    forkHeightM: 0.032,
    forkDepthM: 0.006,
  });
  assert.deepEqual(CHEST_STRUCTURAL_DIMENSIONS, {
    ...CHEST_SHELL_POLICY,
    ...CHEST_DRAWER_GEOMETRY_POLICY,
    ...CHEST_CONNECTOR_POLICY,
    ...CHEST_MOTION_POLICY,
    wheels: CHEST_CASTER_RENDER_POLICY,
  });
});

test('Material Thickness and Cornice render policies preserve values, references, and facade identity', () => {
  assert.equal(MATERIAL_DIMENSIONS, MATERIAL_THICKNESS_POLICY);
  assert.deepEqual(Object.keys(MATERIAL_DIMENSIONS), ['wood', 'glassShelf']);
  assert.equal(Object.isFrozen(MATERIAL_DIMENSIONS), true);
  assert.equal(Object.isFrozen(MATERIAL_DIMENSIONS.wood), true);
  assert.equal(Object.isFrozen(MATERIAL_DIMENSIONS.glassShelf), true);
  const serializedMaterialDimensions = JSON.stringify(MATERIAL_DIMENSIONS);
  assert.equal(typeof serializedMaterialDimensions, 'string');
  assert.ok(serializedMaterialDimensions);
  const materialRoundTrip: unknown = JSON.parse(serializedMaterialDimensions);
  assert.deepEqual(materialRoundTrip, {
    wood: { thicknessM: MATERIAL_THICKNESS_POLICY.wood.thicknessM },
    glassShelf: { thicknessM: MATERIAL_THICKNESS_POLICY.glassShelf.thicknessM },
  });
  assert.equal(MATERIAL_DIMENSIONS.wood.thicknessM, MATERIAL_DIMENSIONS.glassShelf.thicknessM);
  assert.equal(FACADE_CARCASS_CORNICE_DIMENSIONS, CARCASS_CORNICE_RENDER_POLICY);
  assert.equal(CARCASS_CORNICE_RENDER_POLICY.common, CARCASS_CORNICE_COMMON_POLICY);
  assert.equal(CARCASS_CORNICE_RENDER_POLICY.wave, CARCASS_CORNICE_WAVE_POLICY);
  assert.equal(CARCASS_CORNICE_RENDER_POLICY.profile, CARCASS_CORNICE_PROFILE_POLICY);
  assert.equal(CARCASS_CORNICE_WAVE_POLICY.fallbackWoodThicknessM, MATERIAL_THICKNESS_POLICY.wood.thicknessM);
  assert.deepEqual(CARCASS_CORNICE_ANGLE_POLICY, { thetaClampRad: 0.01 });

  assert.deepEqual(MATERIAL_THICKNESS_POLICY, {
    wood: { thicknessM: 0.018 },
    glassShelf: { thicknessM: 0.018 },
  });
  assert.equal(MATERIAL_THICKNESS_POLICY.glassShelf.thicknessM, MATERIAL_THICKNESS_POLICY.wood.thicknessM);
  assert.deepEqual(CARCASS_CORNICE_COMMON_POLICY, {
    epsilonM: 0.000001,
    yLiftM: 0.0006,
    minSegmentLengthM: 0.02,
    minBoxDimensionM: 0.001,
    thetaClampM: 0.01,
  });
  assert.deepEqual(CARCASS_CORNICE_WAVE_POLICY, {
    maxHeightM: 0.095,
    cycles: 2,
    frameThicknessMinM: 0.01,
    frameThicknessMaxM: 0.028,
    fallbackWoodThicknessM: 0.018,
    amplitudeRatio: 0.03,
    amplitudeMinM: 0.03,
    amplitudeMaxM: 0.06,
    sampleSpacingM: 0.02,
    sampleCountMin: 24,
    sampleCountMax: 180,
    connectorInsetM: 0.0004,
    minInteriorNormalLengthSq: 0.000001,
  });
  assert.deepEqual(CARCASS_CORNICE_PROFILE_POLICY, {
    heightM: 0.08,
    overhangXM: 0.06,
    overhangZM: 0.04,
    insetOnRoofM: 0.03,
    backStepM: 0.02,
    seamEpsilonM: 0,
    baseHeightM: 0.022,
    step1OutM: 0.006,
    slopeHeightM: 0.03,
    slopeOutM: 0.018,
    step2OutM: 0.006,
    capRiseM: 0.012,
    capOutM: 0.004,
    topLipOutM: 0.003,
    minOverhangM: 0.001,
    xMaxDefaultM: 1,
    baseHeightRatio: 0.6,
    slopeHeightRatio: 0.92,
    capHeightRatio: 0.96,
    miterEpsilonZM: 0.0005,
    baseSealEpsilonM: 0.003,
    baseBandEpsilonM: 0.000001,
  });
  assert.deepEqual(CARCASS_CORNICE_RENDER_POLICY, {
    common: CARCASS_CORNICE_COMMON_POLICY,
    wave: CARCASS_CORNICE_WAVE_POLICY,
    profile: CARCASS_CORNICE_PROFILE_POLICY,
  });
});

test('Chest Mode policy preserves every default, render value, nested reference, and facade identity', () => {
  assert.equal(FACADE_CHEST_MODE_DIMENSIONS, CHEST_MODE_DIMENSIONS);
  assert.equal(CHEST_MODE_DIMENSIONS.activeDefaults, CHEST_MODE_ACTIVE_DEFAULTS_POLICY);
  assert.equal(CHEST_MODE_DIMENSIONS.drawerBox, CHEST_MODE_DRAWER_BOX_RENDER_POLICY);
  assert.equal(
    CHEST_MODE_DIMENSIONS.dimensionGuideSideOffsetM,
    CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY.sideOffsetM
  );
  assert.equal(
    CHEST_MODE_DIMENSIONS.dimensionGuideTopOffsetM,
    CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY.topOffsetM
  );
  assert.equal(
    CHEST_MODE_DIMENSIONS.dimensionGuideTextScale,
    CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY.textScale
  );

  assert.deepEqual(CHEST_MODE_ACTIVE_DEFAULTS_POLICY, {
    doorsCount: 0,
    widthCm: 50,
    heightCm: 50,
    depthCm: 40,
    drawersCount: 2,
    baseType: 'legs',
  });
  assert.deepEqual(CHEST_MODE_COMMODE_CONSTRAINTS_POLICY, {
    defaultMirrorHeightCm: 70,
    minMirrorHeightCm: 30,
    maxMirrorHeightCm: 180,
    minMirrorWidthCm: 20,
    maxMirrorWidthCm: 560,
  });
  assert.deepEqual(CHEST_MODE_COMMODE_RENDER_POLICY, {
    backPanelThicknessM: 0.018,
    mirrorThicknessM: 0.003,
    mirrorInsetM: 0.03,
    backPanelYOffsetM: 0.002,
    mirrorSurfaceLiftM: 0.0015,
  });
  assert.deepEqual(CHEST_MODE_DRAWER_BOX_RENDER_POLICY, {
    panelThicknessM: 0.015,
    accentZOffsetM: 0.0008,
    accentMinWidthM: 0.12,
    accentMinHeightM: 0.08,
    accentThicknessMinM: 0.0022,
    accentThicknessMaxM: 0.004,
    accentThicknessRatio: 0.035,
    accentStripDepthM: 0.001,
    accentRenderOrder: 2,
    handleWidthM: 0.12,
    handleHeightM: 0.02,
    handleDepthM: 0.015,
    handleFrontOffsetM: 0.005,
  });
  assert.deepEqual(CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY, {
    sideOffsetM: 0.15,
    topOffsetM: 0.1,
    textScale: {
      total: { scale: 0.66, styleKey: 'compactTotal' },
      segment: 0.6,
    },
  });
  assert.deepEqual(CHEST_MODE_DIMENSIONS, {
    activeDefaults: CHEST_MODE_ACTIVE_DEFAULTS_POLICY,
    commode: {
      ...CHEST_MODE_COMMODE_CONSTRAINTS_POLICY,
      ...CHEST_MODE_COMMODE_RENDER_POLICY,
    },
    drawerBox: CHEST_MODE_DRAWER_BOX_RENDER_POLICY,
    dimensionGuideSideOffsetM: 0.15,
    dimensionGuideTopOffsetM: 0.1,
    dimensionGuideTextScale: CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY.textScale,
  });
});

test('Door System policy preserves every value, dependency reference, object shape, and facade identity', () => {
  assert.deepEqual(Object.keys(DOOR_SYSTEM_DIMENSIONS), ['hinged', 'sliding']);
  assert.equal(DOOR_SYSTEM_DIMENSIONS, OWNER_DOOR_SYSTEM_DIMENSIONS);
  assert.equal(OWNER_DOOR_SYSTEM_DIMENSIONS.hinged, HINGED_DOOR_SYSTEM_POLICY);
  assert.equal(OWNER_DOOR_SYSTEM_DIMENSIONS.sliding, SLIDING_DOOR_SYSTEM_POLICY);
  assert.equal(HINGED_DOOR_SYSTEM_POLICY.split, HINGED_DOOR_SPLIT_POLICY);
  for (const policy of [
    DOOR_SYSTEM_DIMENSIONS,
    HINGED_DOOR_SYSTEM_POLICY,
    SLIDING_DOOR_SYSTEM_POLICY,
    HINGED_DOOR_SPLIT_POLICY,
  ]) {
    assert.equal(Object.isFrozen(policy), true);
  }
  const serializedDoorSystem = JSON.stringify(DOOR_SYSTEM_DIMENSIONS);
  assert.equal(typeof serializedDoorSystem, 'string');
  const roundTrippedDoorSystem = JSON.parse(serializedDoorSystem);
  assert.deepEqual(Object.keys(roundTrippedDoorSystem), ['hinged', 'sliding']);
  assert.deepEqual(roundTrippedDoorSystem.hinged, DOOR_SYSTEM_DIMENSIONS.hinged);
  assert.deepEqual(roundTrippedDoorSystem.sliding, DOOR_SYSTEM_DIMENSIONS.sliding);
  assert.equal(HINGED_DOOR_RENDER_POLICY.visualThicknessM, MATERIAL_THICKNESS_POLICY.wood.thicknessM);
  assert.equal(
    SLIDING_DOOR_CONSTRUCTION_POLICY.defaultDoorsCount,
    WARDROBE_DEFAULTS.byType.sliding.doorsCount
  );

  assert.deepEqual(HINGED_DOOR_RENDER_POLICY, {
    visualWidthClearanceM: 0.004,
    visualHeightClearanceM: 0.004,
    visualThicknessM: 0.018,
    frontTrimZOffsetM: 0.011,
    opFrontZOffsetM: 0.01,
  });
  assert.deepEqual(HINGED_DOOR_MOUNT_POLICY, {
    insetFrameThicknessM: 0.036,
    insetRevealM: 0.003,
    sameModuleLeafGapMaxM: 0.003,
    sameModuleLeafGapWoodDivisor: 10,
    sameModuleLeafGapSpanRatioMax: 0.1,
  });
  assert.deepEqual(HINGED_DOOR_SPLIT_GEOMETRY_POLICY, {
    minSegmentHeightM: 0.12,
    renderMinSegmentHeightM: 0.1,
    splitGapM: 0.006,
    duplicateCutToleranceMinM: 0.004,
    duplicateCutToleranceMaxM: 0.02,
    duplicateCutToleranceHeightRatio: 0.01,
    storageLiftM: 0.5,
    bottomClampOffsetM: 0.08,
    topClampOffsetM: 0.12,
    minHeightForSplitM: 0.2,
  });
  assert.deepEqual(HINGED_DOOR_SPLIT_AUTHORING_POLICY, {
    hoverMinDoorHeightM: 0.05,
    hoverDefaultDoorWidthM: 0.45,
    hoverRegionMinHeightM: 0.05,
    hoverStandardLineMinHeightM: 0.014,
    hoverStandardLineMaxHeightM: 0.026,
    hoverStandardLineHeightRatio: 0.018,
    hoverCustomEdgePadM: 0.12,
    hoverCustomRemoveToleranceMinM: 0.03,
    hoverCustomRemoveToleranceMaxM: 0.08,
    hoverCustomRemoveToleranceRatio: 0.06,
    hoverCustomMarkerMinHeightM: 0.02,
    hoverCustomMarkerMaxHeightM: 0.06,
    hoverCustomMarkerHeightRatio: 0.03,
    hoverCustomAlignmentToleranceMinM: 0.002,
    hoverCustomAlignmentToleranceMaxM: 0.008,
    hoverCustomAlignmentToleranceHeightRatio: 0.003,
    hoverMarkerZOffsetM: 0.02,
    hoverMarkerScaleMinM: 0.01,
    hoverMarkerWidthClearanceM: 0.01,
    hoverMarkerHeightClearanceM: 0.001,
  });
  assert.deepEqual(SLIDING_DOOR_CONSTRUCTION_POLICY, {
    defaultDoorsCount: WARDROBE_DEFAULTS.byType.sliding.doorsCount,
    overlapM: 0.03,
    railHeightM: 0.04,
    railDepthM: 0.075,
    railBackInsetM: 0.002,
    shellClearanceMinM: 0.0006,
    shellClearanceMaxM: 0.002,
    shellClearanceWoodDivisor: 6,
    doorTopOverlapMaxM: 0.015,
    doorTopOverlapRailInsetM: 0.004,
    doorHeightMinM: 0.05,
    railLineOffsetYExtraM: 0.001,
    railTrackLaneDivisor: 4,
    trackOuterOffsetM: 0.012,
    trackInnerLaneGapM: 0.03,
    visualThicknessM: 0.022,
    trimFrontZM: 0.014,
  });
  assert.deepEqual(SLIDING_DOOR_HANDLE_RENDER_POLICY, {
    handleProfileZOffsetM: 0.024,
    standardHandleProfileWidthM: 0.025,
    standardHandleProfileDepthM: 0.025,
    standardHandleProfileInsetM: 0.0125,
    standardHandleProfileFrontZM: 0.025,
    edgeHandleWidthM: 0.01,
    edgeHandleDepthM: 0.03,
    edgeHandleInsetM: 0.005,
  });
  assert.deepEqual(SLIDING_DOOR_MOTION_POLICY, {
    runtimeOpenEpsilonXM: 0.002,
    runtimeStackZStepDefaultM: 0.055,
    runtimeStackZStepMinM: 0.03,
    runtimeStackZStepGapM: 0.006,
  });
  assert.deepEqual(OWNER_DOOR_SYSTEM_DIMENSIONS, {
    hinged: {
      ...HINGED_DOOR_RENDER_POLICY,
      ...HINGED_DOOR_MOUNT_POLICY,
      split: {
        ...HINGED_DOOR_SPLIT_GEOMETRY_POLICY,
        ...HINGED_DOOR_SPLIT_AUTHORING_POLICY,
      },
    },
    sliding: {
      ...SLIDING_DOOR_CONSTRUCTION_POLICY,
      ...SLIDING_DOOR_HANDLE_RENDER_POLICY,
      ...SLIDING_DOOR_MOTION_POLICY,
    },
  });
});

test('Door Visual policy preserves every value, section reference, and facade identity', () => {
  assert.equal(FACADE_DOOR_VISUAL_DIMENSIONS, OWNER_DOOR_VISUAL_DIMENSIONS);
  assert.equal(OWNER_DOOR_VISUAL_DIMENSIONS.common, DOOR_VISUAL_COMMON_POLICY);
  assert.equal(OWNER_DOOR_VISUAL_DIMENSIONS.accent, DOOR_ACCENT_RENDER_POLICY);
  assert.equal(OWNER_DOOR_VISUAL_DIMENSIONS.grooves, DOOR_GROOVE_RENDER_POLICY);
  assert.equal(OWNER_DOOR_VISUAL_DIMENSIONS.glass, DOOR_GLASS_RENDER_POLICY);
  assert.equal(OWNER_DOOR_VISUAL_DIMENSIONS.profile, DOOR_PROFILE_RENDER_POLICY);
  assert.equal(OWNER_DOOR_VISUAL_DIMENSIONS.miter, DOOR_MITER_RENDER_POLICY);
  assert.equal(OWNER_DOOR_VISUAL_DIMENSIONS.doubleProfile, DOOR_DOUBLE_PROFILE_RENDER_POLICY);
  assert.equal(OWNER_DOOR_VISUAL_DIMENSIONS.mirror, DOOR_MIRROR_POLICY);
  for (const policy of [
    DOOR_VISUAL_COMMON_POLICY,
    DOOR_ACCENT_RENDER_POLICY,
    DOOR_GROOVE_RENDER_POLICY,
    DOOR_GLASS_RENDER_POLICY,
    DOOR_PROFILE_RENDER_POLICY,
    DOOR_MITER_RENDER_POLICY,
    DOOR_DOUBLE_PROFILE_RENDER_POLICY,
    DOOR_MIRROR_RENDER_POLICY,
    DOOR_MIRROR_LAYOUT_POLICY,
    DOOR_MIRROR_POLICY,
    OWNER_DOOR_VISUAL_DIMENSIONS,
  ]) {
    assert.equal(Object.isFrozen(policy), true);
  }

  assert.deepEqual(OWNER_DOOR_VISUAL_DIMENSIONS, {
    common: {
      minPanelDimensionM: 0.02,
      minDoorDimensionForAccentM: 0.04,
      minStripThicknessM: 0.001,
      frontSurfaceNudgeM: 0.0009,
    },
    accent: {
      defaultInsetM: 0.01,
      defaultLineThicknessM: 0.0022,
      defaultOpacity: 0.18,
      sketchOpacityExtra: 0.08,
      sketchOpacityMax: 0.35,
      safeInsetEdgeM: 0.01,
      minLineThicknessM: 0.0014,
      stripDepthM: 0.001,
      renderOrder: 3,
    },
    grooves: {
      stripWidthM: 0.005,
      heightClearanceM: 0.04,
      stripDepthM: 0.002,
      surfaceOffsetM: 0.001,
    },
    glass: {
      paneDepthM: 0.005,
      paneRenderOrder: 2,
      curtainRenderOrder: 1,
      curtainSegments: 256,
      curtainWaveAmplitudeM: 0.008,
      curtainWaveFrequency: 120,
      curtainDefaultGapM: 0.015,
      curtainForcedGapM: 0.012,
      curtainForcedEmissiveIntensity: 0.12,
      flatInsetMinM: 0.002,
      flatInsetMaxM: 0.006,
      flatInsetRatio: 0.01,
      opacity: 0.16,
      curtainOpacity: 0.72,
    },
    profile: {
      outerFrameWidthM: 0.03,
      innerFrameWidthM: 0.027,
      outerFrameMinM: 0.015,
      innerFrameMinM: 0.012,
      frameEdgeClearanceM: 0.03,
      innerFrameEdgeClearanceM: 0.015,
      centerDepthMinM: 0.01,
      centerDepthMaxM: 0.02,
      centerDepthThicknessClearanceM: 0.004,
      stepDepthMinM: 0.002,
      stepDepthMaxM: 0.004,
      roundBulgeScale: 0.94,
      roundInsetMinM: 0.003,
      roundInsetMaxM: 0.012,
      roundInsetOuterFrameRatio: 0.24,
      centerPanelDepthMinM: 0.002,
      outerAccentInsetFrameRatio: 0.2,
      outerAccentInsetMaxM: 0.01,
      outerAccentLineThicknessM: 0.0018,
      innerAccentInsetFrameRatio: 0.28,
      innerAccentInsetMaxM: 0.012,
      innerAccentLineThicknessM: 0.0016,
      grooveDensityOverride: 12,
    },
    miter: {
      bandMinM: 0.001,
      bandEdgeClearanceM: 0.006,
      seamInsetMinM: 0.0018,
      seamInsetBackoffM: 0.00025,
      seamZOffsetM: 0.0014,
      capSurfaceOffsetM: 0.0008,
      roundedBeadDepthMinM: 0.003,
      roundedBeadThicknessRatio: 0.96,
      roundedBeadScaleBase: 0.62,
      roundedBeadScaleBulgeRatio: 0.42,
      roundedBevelSizeMinM: 0.0014,
      roundedBevelSizeBandRatio: 0.49,
      roundedBevelSizeDepthRatio: 0.98,
      roundedBevelSizeEdgeBackoffM: 0.00045,
      roundedBevelThicknessMinM: 0.0012,
      roundedBevelThicknessBaseRatio: 0.46,
      roundedBevelThicknessBulgeRatio: 0.08,
      roundedBevelThicknessDepthBackoffM: 0.00025,
      roundedBevelOffsetMaxM: 0.0006,
      roundedBevelOffsetBandRatio: 0.03,
      roundedOuterFaceZMinM: 0.0016,
      roundedOuterFaceZBevelRatio: 1.35,
      roundedOuterFaceZDepthRatio: 0.42,
    },
    doubleProfile: {
      frameWidthM: 0.045,
      frameMinM: 0.02,
      frameEdgeClearanceM: 0.02,
      recessDepthMinM: 0.008,
      recessDepthMaxM: 0.014,
      recessDepthThicknessClearanceM: 0.004,
      innerRaisedInsetMinM: 0.006,
      innerRaisedInsetMaxM: 0.014,
      innerRaisedInsetFrameRatio: 0.22,
      innerRaisedBandMinM: 0.006,
      innerRaisedBandFrameRatio: 0.24,
      innerRaisedBandEdgeClearanceM: 0.012,
      innerRaisedZMinM: 0.0022,
      innerRaisedZMaxM: 0.0042,
      innerRaisedZThicknessRatio: 0.24,
      innerRaisedZFrameRatio: 0.08,
      accentInsetFrameRatio: 0.18,
      accentInsetMaxM: 0.012,
      accentLineThicknessM: 0.0022,
      accentOpacity: 0.16,
    },
    mirror: {
      doorThicknessMinM: 0.002,
      mirrorThicknessMinM: 0.002,
      mirrorThicknessMaxM: 0.004,
      mirrorThicknessDoorRatio: 0.35,
      adhesiveGapMinM: 0.0006,
      adhesiveGapMaxM: 0.0012,
      adhesiveGapMirrorRatio: 0.3,
      layoutFullInsetM: 0.002,
      layoutMinSizeM: 0.02,
      layoutCenterSnapNormThreshold: 0.04,
      layoutRemoveToleranceDefaultM: 0.03,
      layoutRemoveToleranceMaxM: 0.06,
      layoutRemoveToleranceSizeRatio: 0.18,
      layoutCenterEpsilon: 0.0001,
      layoutSizeEpsilonCm: 0.001,
    },
  });
});

test('feature facades read physical dimensions from the shared token source', () => {
  assert.equal(DEFAULT_BASE_LEG_HEIGHT_CM, BASE_LEG_DIMENSIONS.defaults.heightCm);
  assert.equal(DEFAULT_TAPERED_BASE_LEG_WIDTH_CM, BASE_LEG_DIMENSIONS.defaults.taperedWidthCm);
  assert.equal(DEFAULT_DOOR_TRIM_CROSS_SIZE_CM, FACADE_DOOR_TRIM_DIMENSIONS.defaults.crossSizeCm);
  assert.equal(DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM, DRAWER_DIMENSIONS.sketch.externalDefaultHeightCm);
  assert.equal(SKETCH_EXTERNAL_DRAWER_COUNT_MAX, DRAWER_DIMENSIONS.sketch.externalCountMax);
  assert.equal(MATERIAL_DIMENSIONS.wood.thicknessM, 0.018);
  assert.equal(MATERIAL_DIMENSIONS.glassShelf.thicknessM, 0.018);
});

test('Door Trim policy preserves every value, nested policy reference, and facade identity', () => {
  assert.equal(FACADE_DOOR_TRIM_DIMENSIONS, DOOR_TRIM_DIMENSIONS);
  assert.equal(DOOR_TRIM_DIMENSIONS.defaults, DOOR_TRIM_DEFAULTS_POLICY);
  assert.equal(DOOR_TRIM_DIMENSIONS.limits, DOOR_TRIM_LIMITS_POLICY);
  assert.equal(DOOR_TRIM_DIMENSIONS.snap, DOOR_TRIM_SNAP_POLICY);
  assert.equal(DOOR_TRIM_DIMENSIONS.normalize, DOOR_TRIM_NORMALIZATION_POLICY);
  assert.equal(DOOR_TRIM_DIMENSIONS.removeTolerance, DOOR_TRIM_REMOVE_TOLERANCE_POLICY);
  assert.equal(DOOR_TRIM_DEFAULTS_POLICY.thicknessM, DOOR_TRIM_RENDER_POLICY.thicknessM);
  assert.equal(DOOR_TRIM_DEFAULTS_POLICY.depthM, DOOR_TRIM_RENDER_POLICY.depthM);
  assert.equal(DOOR_TRIM_DEFAULTS_POLICY.frontZM, DOOR_TRIM_RENDER_POLICY.frontZM);
  assert.equal(DOOR_TRIM_DEFAULTS_POLICY.frontSurfaceNudgeM, DOOR_TRIM_RENDER_POLICY.frontSurfaceNudgeM);
  assert.equal(DOOR_TRIM_DEFAULTS_POLICY.centerNorm, DOOR_TRIM_AUTHORING_DEFAULTS_POLICY.centerNorm);
  assert.equal(DOOR_TRIM_DEFAULTS_POLICY.crossSizeCm, DOOR_TRIM_AUTHORING_DEFAULTS_POLICY.crossSizeCm);
  for (const policy of [
    DOOR_TRIM_RENDER_POLICY,
    DOOR_TRIM_AUTHORING_DEFAULTS_POLICY,
    DOOR_TRIM_LIMITS_POLICY,
    DOOR_TRIM_SNAP_POLICY,
    DOOR_TRIM_NORMALIZATION_POLICY,
    DOOR_TRIM_REMOVE_TOLERANCE_POLICY,
    DOOR_TRIM_DEFAULTS_POLICY,
    DOOR_TRIM_DIMENSIONS,
  ]) {
    assert.equal(Object.isFrozen(policy), true);
  }
  assert.deepEqual(FACADE_DOOR_TRIM_DIMENSIONS, {
    defaults: {
      thicknessM: 0.035,
      depthM: 0.01,
      frontZM: 0.011,
      frontSurfaceNudgeM: 0.0005,
      centerNorm: 0.5,
      crossSizeCm: 3.5,
    },
    limits: {
      minSpanM: 0.04,
      customMinCm: 4,
      customMaxCm: 400,
      crossSizeMinCm: 1,
      crossSizeMaxCm: 120,
    },
    snap: {
      centerNormThreshold: 0.04,
      centerNormThresholdMax: 0.25,
      mirrorZoneM: 0.006,
      mirrorEdgeGapM: 0.0008,
    },
    normalize: {
      centerEpsilonNorm: 0.0001,
      rectSpanMinM: 0.0001,
    },
    removeTolerance: {
      thicknessMultiplier: 1.15,
      maxM: 0.09,
      crossSpanRatio: 0.12,
    },
  });
});

test('External and Internal Drawer policies preserve facade identity, values, and focused owners', () => {
  assert.equal(DRAWER_DIMENSIONS.external, EXTERNAL_DRAWER_POLICY);
  assert.equal(DRAWER_DIMENSIONS.internal, INTERNAL_DRAWER_POLICY);
  assert.equal(EXTERNAL_DRAWER_POLICY.doorTopGapM, STACK_SPLIT_POLICY.seam.gapM);
  assert.deepEqual(EXTERNAL_DRAWER_POLICY, {
    shoeHeightM: 0.2,
    regularHeightM: 0.22,
    frontOffsetZM: 0.01,
    doorTopGapM: 0.002,
    openOffsetZM: 0.35,
    visualWidthClearanceM: 0.004,
    visualThicknessM: 0.02,
    visualHeightClearanceM: 0.008,
    boxWidthClearanceM: 0.044,
    boxHeightClearanceM: 0.04,
    boxDepthBackClearanceM: 0.1,
    boxOffsetZM: 0.005,
    connectorDepthM: 0.03,
    connectorFrontZM: -0.01,
    connectorBackInsetM: 0.003,
    connectorWidthClearanceM: 0.09,
    connectorHeightClearanceM: 0.06,
    separatorBoardWidthClearanceM: 0.025,
    contentsBottomInsetM: 0.015,
    contentsWidthClearanceM: 0.05,
    contentsHeightClearanceM: 0.03,
  });
  assert.deepEqual(INTERNAL_DRAWER_POLICY, {
    defaultGridStepM: 0.25,
    defaultDepthM: 0.5,
    defaultInnerWidthM: 0.6,
    maxSingleDrawerHeightM: 0.35,
    defaultSingleDrawerHeightM: 0.165,
    verticalInsetM: 0.02,
    minDrawerHeightM: 0.01,
    widthClearanceM: 0.03,
    depthClearanceM: 0.02,
    firstDrawerBottomGapM: 0.01,
    betweenDrawersGapM: 0.03,
    stackCount: 2,
    openOffsetZM: 0.25,
    contentsBottomInsetM: 0.015,
    contentsWidthClearanceM: 0.05,
    contentsHeightClearanceM: 0.03,
  });
  for (const policy of [
    EXTERNAL_DRAWER_SIZE_POLICY,
    EXTERNAL_DRAWER_MOTION_POLICY,
    EXTERNAL_DRAWER_FRONT_RENDER_POLICY,
    EXTERNAL_DRAWER_BOX_POLICY,
    EXTERNAL_DRAWER_CONNECTOR_POLICY,
    EXTERNAL_DRAWER_SEPARATOR_POLICY,
    EXTERNAL_DRAWER_CONTENTS_POLICY,
    EXTERNAL_DRAWER_POLICY,
    INTERNAL_DRAWER_LAYOUT_POLICY,
    INTERNAL_DRAWER_MOTION_POLICY,
    INTERNAL_DRAWER_CONTENTS_POLICY,
    INTERNAL_DRAWER_POLICY,
  ]) {
    assert.equal(Object.isFrozen(policy), true);
  }
});

test('Interior Fittings policy preserves every value, section identity, and preset array identity', () => {
  assert.equal(INTERIOR_FITTINGS_DIMENSIONS, INTERIOR_FITTINGS_POLICY);
  assert.equal(INTERIOR_FITTINGS_POLICY.shelves, INTERIOR_SHELF_POLICY);
  assert.equal(INTERIOR_FITTINGS_POLICY.pins, INTERIOR_SHELF_PIN_RENDER_POLICY);
  assert.equal(INTERIOR_FITTINGS_POLICY.rods, INTERIOR_ROD_POLICY);
  assert.equal(INTERIOR_FITTINGS_POLICY.storage, INTERIOR_STORAGE_POLICY);
  assert.equal(INTERIOR_FITTINGS_POLICY.presets, INTERIOR_PRESET_POLICY);

  assert.deepEqual(INTERIOR_SHELF_POLICY, {
    regularDepthM: 0.45,
    regularWidthClearanceM: 0.014,
    braceWidthClearanceM: 0,
    contentsWidthClearanceM: 0.06,
    contentsHeightClearanceM: 0.006,
    spanMinHeightM: 0.05,
    doubleThicknessMultiplier: 2,
    roundedCornerRadiusM: 0.12,
    roundedCornerSegments: 18,
  });
  assert.deepEqual(INTERIOR_SHELF_PIN_RENDER_POLICY, {
    radiusM: 0.0025,
    lengthM: 0.012,
    edgeOffsetDefaultM: 0.04,
    bottomYOffsetM: 0.0005,
    maxDepthSideClearanceM: 0.02,
    minEdgeOffsetM: 0.015,
    radialSegments: 12,
  });
  assert.deepEqual(INTERIOR_ROD_POLICY, {
    radiusM: 0.015,
    widthClearanceM: 0.04,
    radialSegments: 12,
    drawerVerticalGuardM: 0.05,
    minHangingHeightM: 0.75,
    depthBackClearanceM: 0.04,
    doorFrontClearanceM: 0.025,
    storageDepthLimitM: 0.3,
    depthHintMinM: 0.12,
    depthHintMaxM: 0.45,
    contentsWidthClearanceM: 0.06,
    defaultYOffsetM: -0.08,
  });
  assert.deepEqual(INTERIOR_PRESET_POLICY, {
    fullShelfRows: [1, 2, 3, 4, 5],
    hangingShelfRows: [5, 4],
    splitShelfRows: [5, 1],
    mixedRodYFactor: 3.5,
    hangingRodYFactor: 3.8,
    splitUpperRodYFactor: 4.8,
    splitUpperRodLimitFactor: 2.5,
    splitLowerRodYFactor: 2.3,
    splitLowerRodLimitFactor: 1.3,
    storageRodYFactor: 3.8,
    storageRodLimitFactor: 3.8,
  });

  assert.equal(INTERIOR_SHELF_POLICY.regularDepthM, INTERIOR_SHELF_GEOMETRY_POLICY.regularDepthM);
  assert.equal(
    INTERIOR_SHELF_POLICY.contentsWidthClearanceM,
    INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsWidthClearanceM
  );
  assert.equal(
    INTERIOR_SHELF_POLICY.roundedCornerRadiusM,
    INTERIOR_SHELF_ROUNDED_RENDER_POLICY.roundedCornerRadiusM
  );
  assert.equal(INTERIOR_ROD_POLICY.radiusM, INTERIOR_ROD_RENDER_POLICY.radiusM);
  assert.equal(INTERIOR_ROD_POLICY.defaultYOffsetM, INTERIOR_ROD_PLACEMENT_POLICY.defaultYOffsetM);
  assert.equal(INTERIOR_ROD_POLICY.depthHintMinM, INTERIOR_ROD_DEPTH_CLEARANCE_POLICY.depthHintMinM);
  assert.equal(
    INTERIOR_ROD_POLICY.contentsWidthClearanceM,
    INTERIOR_ROD_CONTENT_CLEARANCE_POLICY.contentsWidthClearanceM
  );

  assert.equal(INTERIOR_PRESET_POLICY.fullShelfRows, INTERIOR_PRESET_SHELF_ROWS_POLICY.fullShelfRows);
  assert.equal(INTERIOR_PRESET_POLICY.hangingShelfRows, INTERIOR_PRESET_SHELF_ROWS_POLICY.hangingShelfRows);
  assert.equal(INTERIOR_PRESET_POLICY.splitShelfRows, INTERIOR_PRESET_SHELF_ROWS_POLICY.splitShelfRows);
  assert.equal(INTERIOR_PRESET_POLICY.mixedRodYFactor, INTERIOR_PRESET_ROD_FACTORS_POLICY.mixedRodYFactor);
  assert.equal(Object.isFrozen(INTERIOR_PRESET_POLICY.fullShelfRows), true);
  assert.equal(Object.isFrozen(INTERIOR_PRESET_POLICY.hangingShelfRows), true);
  assert.equal(Object.isFrozen(INTERIOR_PRESET_POLICY.splitShelfRows), true);

  for (const policy of [
    INTERIOR_SHELF_GEOMETRY_POLICY,
    INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY,
    INTERIOR_SHELF_ROUNDED_RENDER_POLICY,
    INTERIOR_SHELF_POLICY,
    INTERIOR_SHELF_PIN_RENDER_POLICY,
    INTERIOR_ROD_RENDER_POLICY,
    INTERIOR_ROD_PLACEMENT_POLICY,
    INTERIOR_ROD_DEPTH_CLEARANCE_POLICY,
    INTERIOR_ROD_CONTENT_CLEARANCE_POLICY,
    INTERIOR_ROD_POLICY,
    INTERIOR_PRESET_SHELF_ROWS_POLICY,
    INTERIOR_PRESET_ROD_FACTORS_POLICY,
    INTERIOR_PRESET_POLICY,
    INTERIOR_FITTINGS_POLICY,
  ]) {
    assert.equal(Object.isFrozen(policy), true);
  }
});

test('Interior Storage policy preserves facade identity, values, frozen defaults, and drawer grid parity', () => {
  assert.equal(INTERIOR_FITTINGS_DIMENSIONS.storage, INTERIOR_STORAGE_POLICY);
  assert.equal(
    INTERIOR_STORAGE_POLICY.defaultLowerShelfSlots,
    INTERIOR_STORAGE_DEFAULTS_POLICY.defaultLowerShelfSlots
  );
  assert.equal(
    INTERIOR_FITTINGS_DIMENSIONS.storage.defaultLowerShelfSlots,
    INTERIOR_STORAGE_DEFAULTS_POLICY.defaultLowerShelfSlots
  );
  assert.equal(
    DRAWER_DIMENSIONS.sketch.internalPreviewGridDivisionsDefault,
    INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault
  );
  assert.deepEqual(INTERIOR_STORAGE_POLICY, {
    gridDivisionsDefault: 6,
    barrierHeightM: 0.5,
    barrierHeightMinM: 0.05,
    barrierHeightMaxM: 1.2,
    barrierFrontZOffsetM: -0.06,
    barrierWidthMinM: 0.05,
    barrierWidthClearanceM: 0.025,
    previewThicknessMinM: 0.0001,
    clampPadMinM: 0.001,
    clampPadMaxM: 0.006,
    clampPadWoodRatio: 0.2,
    minHeightExtraM: 0.02,
    minHeightWoodMultiplier: 2,
    defaultLowerShelfSlots: [false, true, false, true, false, false],
  });
  for (const policy of [
    INTERIOR_STORAGE_GRID_POLICY,
    INTERIOR_STORAGE_BARRIER_POLICY,
    INTERIOR_STORAGE_PREVIEW_POLICY,
    INTERIOR_STORAGE_CLAMP_POLICY,
    INTERIOR_STORAGE_LAYOUT_POLICY,
    INTERIOR_STORAGE_DEFAULTS_POLICY,
    INTERIOR_STORAGE_DEFAULTS_POLICY.defaultLowerShelfSlots,
    INTERIOR_STORAGE_POLICY,
  ]) {
    assert.equal(Object.isFrozen(policy), true);
  }
});

test('Drawer Sketch policy preserves facade identity, every value, focused owners, and frozen policies', () => {
  assert.equal(DRAWER_DIMENSIONS.sketch, DRAWER_SKETCH_POLICY);
  assert.equal(
    DRAWER_SKETCH_SIZING_POLICY.externalDefaultHeightCm,
    EXTERNAL_DRAWER_SIZE_POLICY.regularHeightM * 100
  );
  assert.equal(
    DRAWER_SKETCH_SIZING_POLICY.internalDefaultHeightCm,
    INTERNAL_DRAWER_LAYOUT_POLICY.defaultSingleDrawerHeightM * 100
  );
  assert.equal(DRAWER_SKETCH_SIZING_POLICY.minRenderHeightM, INTERNAL_DRAWER_LAYOUT_POLICY.minDrawerHeightM);
  assert.equal(DRAWER_SKETCH_SIZING_POLICY.internalGapM, INTERNAL_DRAWER_LAYOUT_POLICY.betweenDrawersGapM);
  assert.equal(DRAWER_SKETCH_SIZING_POLICY.internalStackCount, INTERNAL_DRAWER_LAYOUT_POLICY.stackCount);
  assert.equal(
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalWidthClearanceM,
    INTERNAL_DRAWER_LAYOUT_POLICY.widthClearanceM
  );
  assert.equal(
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalDepthClearanceM,
    INTERNAL_DRAWER_LAYOUT_POLICY.depthClearanceM
  );
  assert.equal(
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalOpenOffsetZM,
    INTERNAL_DRAWER_MOTION_POLICY.openOffsetZM
  );
  assert.equal(
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalClampPadMinM,
    INTERIOR_STORAGE_CLAMP_POLICY.clampPadMinM
  );
  assert.equal(
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalClampPadMaxM,
    INTERIOR_STORAGE_CLAMP_POLICY.clampPadMaxM
  );
  assert.equal(
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalClampPadWoodRatio,
    INTERIOR_STORAGE_CLAMP_POLICY.clampPadWoodRatio
  );
  assert.equal(
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewGridDivisionsDefault,
    INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault
  );
  assert.deepEqual(DRAWER_SKETCH_POLICY, {
    heightMinCm: 5,
    heightMaxCm: 120,
    externalDefaultHeightCm: 22,
    internalDefaultHeightCm: 16.5,
    heightTokenEpsilonCm: 0.0001,
    externalCountMin: 1,
    externalCountMax: 5,
    externalPreviewDefaultCount: 3,
    minRenderHeightM: 0.01,
    internalGapM: 0.03,
    internalStackCount: 2,
    previewDrawerBottomLiftM: 0.01,
    previewStackExtraHeightM: 0.02,
    previewExternalDefaultHeightM: 0.08,
    previewOverlayThicknessMinM: 0.004,
    previewOverlayThicknessMaxM: 0.02,
    previewDividerMinM: 0.003,
    previewDividerMaxM: 0.012,
    previewDividerWidthRatio: 0.04,
    previewDividerDepthExtraM: 0.002,
    externalDoorCutFrontInsetM: 0.004,
    externalDoorCutSurroundingGapM: 0.006,
    externalPreviewMinWidthM: 0.08,
    externalPreviewMinDepthM: 0.1,
    externalPreviewDepthClearanceM: 0.05,
    externalPreviewCenterZInsetM: 0.025,
    externalPreviewFrontZOffsetM: 0.001,
    externalPreviewVisualMinWidthM: 0.05,
    externalPreviewVisualMinHeightM: 0.05,
    externalPreviewVisualMinDepthM: 0.005,
    externalPreviewBoxMinDimensionM: 0.05,
    externalPreviewMeasurementZOffsetMinM: 0.004,
    externalPreviewMeasurementZOffsetThicknessRatio: 0.25,
    internalPreviewMinWidthM: 0.05,
    internalPreviewMinDepthM: 0.05,
    internalPreviewWidthClearanceM: 0.03,
    internalPreviewDepthClearanceM: 0.02,
    internalPreviewMeasurementZOffsetMinM: 0.004,
    internalPreviewMeasurementZOffsetDepthRatio: 0.08,
    internalPreviewGridDivisionsMin: 2,
    internalPreviewGridDivisionsMax: 12,
    internalPreviewGridDivisionsDefault: 6,
    internalPreviewGridHeadClearanceM: 0.02,
    internalPreviewSingleDrawerGapM: 0.02,
    internalPreviewDefaultSingleHeightM: 0.11,
    internalPreviewRemovalHalfExtraM: 0.01,
    internalPreviewRemovalToleranceMinM: 0.045,
    internalPreviewRemovalToleranceMaxM: 0.14,
    internalPreviewRemovalToleranceExtraM: 0.02,
    internalClampPadMinM: 0.001,
    internalClampPadMaxM: 0.006,
    internalClampPadWoodRatio: 0.2,
    internalWidthMinM: 0.05,
    internalDepthMinM: 0.05,
    internalWidthClearanceM: 0.03,
    internalDepthClearanceM: 0.02,
    internalSideFillerWidthM: 0.05,
    internalSideFillerFrontInsetM: 0.03,
    internalOpenOffsetZM: 0.25,
    internalBottomLiftMaxM: 0.002,
    internalBottomLiftWoodRatio: 0.15,
    verticalStackCollisionGapM: 0.008,
    doorCutHorizontalOverlapMinM: 0.005,
    doorCutNoOpToleranceM: 0.002,
    doorCutIntervalMinHeightM: 0.01,
    doorCutIntervalMergeGapM: 0.002,
    doorCutVisibleSegmentMinHeightM: 0.012,
    rebuiltSegmentMinHeightForHandleM: 0.12,
    rebuiltSegmentHandleMinHeightM: 0.02,
    rebuiltSegmentHandlePaddingMinM: 0.02,
    rebuiltSegmentHandlePaddingMaxM: 0.1,
    rebuiltSegmentHandlePaddingHeightRatio: 0.2,
    rebuiltSegmentRestoreTargetMinDimensionM: 0.02,
    rebuiltSegmentRestoreTargetMinThicknessM: 0.002,
    rebuiltSegmentDefaultHandlePaddingM: 0.01,
    rebuiltSegmentVisualMinDimensionM: 0.02,
    rebuiltSegmentVisualWidthClearanceM: 0.004,
    faceVerticalAlignmentEpsilonM: 0.003,
    faceVerticalAlignmentMinHeightM: 0.012,
  });

  for (const policy of [
    DRAWER_SKETCH_SIZING_POLICY,
    DRAWER_SKETCH_PREVIEW_RENDER_POLICY,
    DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY,
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY,
    DRAWER_SKETCH_DOOR_CUT_POLICY,
    DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY,
    DRAWER_SKETCH_POLICY,
  ]) {
    assert.equal(Object.isFrozen(policy), true);
  }
});

test('Front Reveal Frame policy preserves facade identity, values, and thickness owner references', () => {
  assert.equal(FACADE_FRONT_REVEAL_FRAME_DIMENSIONS, FRONT_REVEAL_FRAME_POLICY);
  assert.equal(
    FRONT_REVEAL_THICKNESS_POLICY.slidingFrontThicknessM,
    SLIDING_DOOR_CONSTRUCTION_POLICY.visualThicknessM
  );
  assert.equal(
    FRONT_REVEAL_THICKNESS_POLICY.hingedFrontThicknessM,
    MATERIAL_THICKNESS_POLICY.wood.thicknessM
  );
  assert.equal(
    FRONT_REVEAL_THICKNESS_POLICY.drawerFrontThicknessM,
    EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM
  );
  assert.deepEqual(FRONT_REVEAL_FRAME_POLICY, {
    zNudgeM: 0.0008,
    localLineInsetM: 0.0015,
    dualOuterZOffsetM: 0.00008,
    dualInnerInsetM: 0.0011,
    dualInnerZOffsetM: 0.00016,
    frontZPresenceEpsilonM: 0.000001,
    slidingFrontThicknessM: 0.022,
    hingedFrontThicknessM: 0.018,
    drawerFrontThicknessM: 0.02,
  });

  for (const policy of [
    FRONT_REVEAL_GEOMETRY_POLICY,
    FRONT_REVEAL_PRESENCE_POLICY,
    FRONT_REVEAL_THICKNESS_POLICY,
    FRONT_REVEAL_FRAME_POLICY,
  ]) {
    assert.equal(Object.isFrozen(policy), true);
  }
});

test('Handle policy preserves facade identity, every value, focused sections, and drawer owner reference', () => {
  assert.equal(FACADE_HANDLE_DIMENSIONS, HANDLE_POLICY);
  assert.equal(HANDLE_POLICY.standard, STANDARD_HANDLE_RENDER_POLICY);
  assert.equal(HANDLE_POLICY.placement, DRAWER_HANDLE_PLACEMENT_POLICY);
  assert.equal(DRAWER_HANDLE_PLACEMENT_POLICY.drawerDefaultHeightM, EXTERNAL_DRAWER_SIZE_POLICY.shoeHeightM);
  assert.deepEqual(HANDLE_POLICY, {
    edge: {
      shortLengthM: 0.2,
      longLengthM: 0.4,
      minLengthM: 0.1,
      drawerWidthClearanceM: 0.04,
      doorAnchorOffsetM: 0.002,
      renderPrimitiveDoorAnchorInsetM: 0.0025,
      mountThicknessM: 0.0045,
      mountDepthM: 0.014,
      mountFrontZM: 0.006,
      returnThicknessM: 0.012,
      returnDepthM: 0.008,
      returnFrontZM: 0.022,
      returnInsetM: 0.0115,
      bridgeThicknessM: 0.007,
      bridgeOverlapM: 0.004,
      drawerReturnDropM: 0.0135,
      defaultGlobalAbsYM: 1.05,
      drawerLiftThresholdYM: 0.9,
      drawerLiftClearanceM: 0.15,
      longLiftDrawerCountThreshold: 4,
      longLiftExtraM: 0.1,
      shortClampPaddingM: 0.1,
      longClampPaddingM: 0.2,
    },
    standard: {
      drawerWidthM: 0.16,
      drawerHeightM: 0.01,
      drawerDepthM: 0.02,
      doorWidthM: 0.01,
      doorHeightM: 0.16,
      doorDepthM: 0.02,
      doorOffsetM: 0.05,
      frontZM: 0.02,
    },
    placement: {
      drawerDefaultWidthM: 0.4,
      drawerDefaultHeightM: 0.2,
      frontZDefaultM: 0.02,
      zPositionEpsilonM: 0.0005,
      maxTrustedLocalZM: 2,
      drawerEdgeVisibleProtrusionM: 0.0135,
      shortDrawerStandardYOffsetM: 0.02,
      shortDrawerHeightThresholdM: 0.21,
      absYClampMinHeightM: 0.05,
      absYClampPaddingMinM: 0.02,
      absYClampPaddingMaxM: 0.1,
      absYClampPaddingHeightRatio: 0.2,
    },
  });

  for (const policy of [
    EDGE_HANDLE_SIZE_POLICY,
    EDGE_HANDLE_PROFILE_RENDER_POLICY,
    EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY,
    STANDARD_HANDLE_RENDER_POLICY,
    DRAWER_HANDLE_PLACEMENT_POLICY,
    HANDLE_POLICY.edge,
    HANDLE_POLICY,
  ]) {
    assert.equal(Object.isFrozen(policy), true);
  }
});

test('Content Visual policies preserve exhaustive facade parity and section identity', () => {
  assert.notEqual(FACADE_CONTENT_VISUAL_DIMENSIONS, CONTENT_VISUAL_POLICY);
  assert.equal(FACADE_CONTENT_VISUAL_DIMENSIONS.books, BOOK_CONTENT_VISUAL_POLICY);
  assert.equal(FACADE_CONTENT_VISUAL_DIMENSIONS.foldedClothes, FOLDED_CLOTHES_VISUAL_POLICY);
  assert.equal(FACADE_CONTENT_VISUAL_DIMENSIONS.hanger, HANGER_VISUAL_POLICY);
  assert.equal(FACADE_CONTENT_VISUAL_DIMENSIONS.hangingClothes, HANGING_CLOTHES_VISUAL_POLICY);
  assert.equal(FACADE_CONTENT_VISUAL_DIMENSIONS.sketchBoxClassic, SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY);
  assert.deepEqual(BOOK_CONTENT_VISUAL_POLICY, {
    depthMarginM: 0.018,
    sideMarginM: 0.035,
    topSafetyM: 0.014,
    minHeightM: 0.07,
    minStackHeightM: 0.04,
    defaultMaxDepthM: 0.38,
    depthMaxM: 0.32,
    depthMinM: 0.12,
    depthRandomTrimRangeM: 0.045,
    depthViabilityMinM: 0.06,
    cursorEndGapM: 0.018,
    maxCount: 96,
    widthBaseM: 0.022,
    widthRandomRangeM: 0.026,
    setWidthBaseM: 0.026,
    setWidthRandomRangeM: 0.012,
    talmudSetWidthBaseM: 0.032,
    talmudSetWidthRandomRangeM: 0.01,
    narrowSetWidthBaseM: 0.019,
    narrowSetWidthRandomRangeM: 0.009,
    gapBaseM: 0.003,
    gapRandomRangeM: 0.006,
    setGapBaseM: 0.0016,
    setGapRandomRangeM: 0.0022,
    setTrailingGapM: 0.007,
    tiltZRangeRad: 0.045,
    setTiltZRangeRad: 0.018,
    edgeTiltZRangeRad: 0.04,
    angleCosMin: 0.001,
    heightBaseM: 0.16,
    heightRandomRangeM: 0.18,
    alignedHeightRatioBase: 0.78,
    alignedHeightRatioRange: 0.15,
    setHeightVariationM: 0.012,
    edgeHeightVariationM: 0.028,
    talmudHeightBoostM: 0.028,
    narrowSetHeightTrimM: 0.018,
    edgeZoneRatio: 0.14,
    edgeZoneMaxM: 0.13,
    setChance: 0.76,
    talmudSetChance: 0.34,
    narrowSetChance: 0.28,
    setMinVolumes: 5,
    setMaxVolumes: 14,
    shortRunMinVolumes: 2,
    shortRunMaxVolumes: 5,
    widthMinM: 0.01,
    spineBandChance: 0.82,
    spineBandHeightM: 0.008,
    spineBandThicknessM: 0.003,
    spineBandWidthInsetRatio: 0.18,
    spineBandYOffsetRatioA: 0.22,
    spineBandYOffsetRatioB: -0.18,
    stackChance: 0.08,
    stackLookaheadM: 0.04,
    stackMaxItems: 2,
    stackWidthBaseM: 0.07,
    stackWidthRandomRangeM: 0.035,
    stackTrailingGapM: 0.012,
    stackWidthMinM: 0.035,
    stackHeightBaseM: 0.04,
    stackHeightRandomRangeM: 0.018,
    stackDepthScaleBase: 0.92,
    stackDepthScaleRange: 0.08,
    stackXOffsetM: 0.014,
    stackCursorAdvanceM: 0.035,
    stackTiltYRangeRad: 0.04,
  });
  assert.deepEqual(FOLDED_CLOTHES_VISUAL_POLICY, {
    defaultMaxHeightM: 0.5,
    baseItemDepthM: 0.36,
    depthMarginM: 0.015,
    minItemDepthM: 0.12,
    zSpreadMaxM: 0.015,
    zSpreadRatio: 0.35,
    itemHeightM: 0.025,
    heightHeadroomM: 0.03,
    stackPitchM: 0.3,
    stackXInsetM: 0.15,
    randomItemsRange: 4,
    stackBaseItems: 4,
    minHeightForSingleItemM: 0.06,
    itemWidthM: 0.26,
    cornerRadiusM: 0.008,
    randomOffsetXM: 0.015,
    rotationYRangeRad: 0.08,
  });
  assert.deepEqual(HANGER_VISUAL_POLICY, {
    hookRadiusM: 0.02,
    hookTubeRadiusM: 0.0025,
    hookRadialSegments: 8,
    hookTubularSegments: 16,
    hookArcMultiplier: 1.5,
    hookYOffsetM: 0.045,
    stemRadiusM: 0.0025,
    stemHeightM: 0.04,
    stemYOffsetM: 0.02,
    halfWidthM: 0.22,
    shoulderHeightM: 0.15,
    centerHeightM: 0.015,
    bottomNeckYM: 0.002,
    shoulderCurveLiftM: 0.01,
    shoulderDropM: 0.015,
    bodyDepthM: 0.012,
    bevelThicknessM: 0.002,
    bevelSizeM: 0.002,
    bodyBackOffsetM: 0.006,
    barRadiusM: 0.009,
    barLengthHalfWidthMultiplier: 1.8,
    barYOffsetM: 0.01,
    moduleWidthClearanceM: 0.05,
    rodYOffsetM: 0.055,
    rotationYDivisor: 8,
  });
  assert.deepEqual(HANGING_CLOTHES_VISUAL_POLICY, {
    minAvailableHeightM: 0.5,
    spacingM: 0.04,
    xOffsetM: 0.02,
    defaultDepthM: 0.45,
    framedDoorDepthM: 0.38,
    restrictedDepthMinM: 0.12,
    restrictedDepthDefaultM: 0.3,
    hangerRadiusM: 0.015,
    hangerTubeRadiusM: 0.002,
    hangerRadialSegments: 4,
    hangerTubularSegments: 12,
    hangerYOffsetM: 0.01,
    coatProbabilityThreshold: 0.7,
    coatHeightM: 1.1,
    shirtHeightM: 0.7,
    bottomClearanceM: 0.05,
    minRenderableHeightM: 0.1,
    clothWidthM: 0.03,
    clothYOffsetM: 0.02,
    clothRotationYRangeRad: 0.15,
  });
  assert.deepEqual(SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY, {
    accentInsetMinM: 0.0025,
    accentInsetMaxM: 0.0045,
    accentInsetDoorRatio: 0.015,
    accentLineThicknessMinM: 0.0013,
    accentLineThicknessMaxM: 0.0019,
    accentLineThicknessDoorRatio: 0.0045,
    accentInnerMinM: 0.02,
    accentSurfaceOffsetM: 0.0008,
    accentStripDepthM: 0.001,
    grooveStripWidthM: 0.005,
    grooveHeightMinM: 0.01,
    grooveHeightClearanceM: 0.04,
    grooveDepthM: 0.002,
    grooveSurfaceOffsetM: 0.001,
  });

  for (const policy of [
    BOOK_CONTENT_VISUAL_POLICY,
    FOLDED_CLOTHES_VISUAL_POLICY,
    HANGER_VISUAL_POLICY,
    HANGING_CLOTHES_VISUAL_POLICY,
    CONTENT_VISUAL_POLICY,
    SKETCH_BOX_CLASSIC_ACCENT_POLICY,
    SKETCH_BOX_CLASSIC_GROOVE_POLICY,
    SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY,
    FACADE_CONTENT_VISUAL_DIMENSIONS,
  ]) {
    assert.equal(Object.isFrozen(policy), true);
  }
});

test('module and Stack Split defaults preserve Interior Storage grid and lower-shelf policy', () => {
  assert.equal(DEFAULT_MODULE_CELL_COUNT, INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault);
  assert.deepEqual(createDefaultModuleCustomData(), {
    shelves: [false, false, false, false, false, false],
    rods: [false, false, false, false, false, false],
    storage: false,
  });
  assert.deepEqual(createDefaultStackTopModuleConfig(0).customData, {
    shelves: [false, false, false, false, false, false],
    rods: [false, false, false, false, false, false],
    storage: false,
  });

  const lower = createDefaultLowerModuleConfig(0);
  assert.equal(lower.gridDivisions, INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault);
  assert.deepEqual(lower.customData?.shelves, INTERIOR_STORAGE_DEFAULTS_POLICY.defaultLowerShelfSlots);
  assert.notEqual(
    lower.customData?.shelves,
    INTERIOR_STORAGE_DEFAULTS_POLICY.defaultLowerShelfSlots,
    'mutable module state must clone the frozen policy default'
  );
  assert.deepEqual(lower.customData?.rods, [false, false, false, false, false, false]);
  assert.equal(lower.customData?.storage, false);
});

test('door mount thickness resolver treats sliding wardrobes as overlay construction', () => {
  const resolved = resolveDoorMountThicknessesFromConfig({
    wardrobeType: 'sliding',
    doorMountMode: 'inset',
    overlayFrameThicknessCm: 2.4,
    overlayShelfThicknessCm: 1.2,
    insetFrameThicknessCm: 4.2,
    insetShelfThicknessCm: 2.1,
  });

  assert.equal(resolved.mode, 'overlay');
  assert.equal(resolved.frameKey, 'overlayFrameThicknessCm');
  assert.equal(resolved.shelfKey, 'overlayShelfThicknessCm');
  assert.equal(resolved.frameThicknessCm, 2.4);
  assert.equal(resolved.shelfThicknessCm, 1.2);
});

test('Door Mount Thickness policy preserves facade identity, defaults, keys, normalization, and step rounding', () => {
  assert.equal(FACADE_DOOR_MOUNT_THICKNESS_DIMENSIONS, DOOR_MOUNT_THICKNESS_DIMENSIONS);
  assert.equal(FACADE_DOOR_MOUNT_THICKNESS_CONFIG_KEYS, DOOR_MOUNT_THICKNESS_CONFIG_KEYS);
  assert.equal(resolveDoorMountThicknessesFromConfig, resolveDoorMountThicknessesFromOwner);
  assert.deepEqual(DOOR_MOUNT_THICKNESS_DIMENSIONS, {
    stepCm: 0.1,
    minCm: 0.4,
    maxCm: 8,
  });
  assert.deepEqual(DOOR_MOUNT_THICKNESS_CONFIG_KEYS, {
    overlay: {
      frame: 'overlayFrameThicknessCm',
      shelf: 'overlayShelfThicknessCm',
    },
    inset: {
      frame: 'insetFrameThicknessCm',
      shelf: 'insetShelfThicknessCm',
    },
  });

  assert.equal(getDefaultDoorMountThicknessM('overlay'), MATERIAL_THICKNESS_POLICY.wood.thicknessM);
  assert.equal(getDefaultDoorMountThicknessM('inset'), HINGED_DOOR_MOUNT_POLICY.insetFrameThicknessM);
  assert.equal(getDefaultDoorMountThicknessCm('overlay'), 1.8);
  assert.equal(getDefaultDoorMountThicknessCm('inset'), 3.6);
  assert.equal(getDoorMountThicknessConfigKey('overlay', 'frame'), 'overlayFrameThicknessCm');
  assert.equal(getDoorMountThicknessConfigKey('overlay', 'shelf'), 'overlayShelfThicknessCm');
  assert.equal(getDoorMountThicknessConfigKey('inset', 'frame'), 'insetFrameThicknessCm');
  assert.equal(getDoorMountThicknessConfigKey('inset', 'shelf'), 'insetShelfThicknessCm');

  for (const value of [null, undefined, '', Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(normalizeDoorMountThicknessCm(value), null);
  }
  assert.equal(normalizeDoorMountThicknessCm(0.39), 0.4);
  assert.equal(normalizeDoorMountThicknessCm(0.44), 0.4);
  assert.equal(normalizeDoorMountThicknessCm(0.45), 0.5);
  assert.equal(normalizeDoorMountThicknessCm(0.4499999999999999), 0.4);
  assert.equal(normalizeDoorMountThicknessCm(1.84), 1.8);
  assert.equal(normalizeDoorMountThicknessCm(1.85), 1.9);
  assert.equal(normalizeDoorMountThicknessCm(1.8499999999999996), 1.8);
  assert.equal(normalizeDoorMountThicknessCm(8.1), 8);
  assert.equal(normalizeDoorMountThicknessCm(0.3), 0.4);
  assert.equal(String(normalizeDoorMountThicknessCm(1.85)), '1.9');

  for (let thousandths = 400; thousandths <= 8000; thousandths += 1) {
    const value = thousandths / 1000;
    const legacyRounded = Math.round(value * 10) / 10;
    assert.equal(normalizeDoorMountThicknessCm(value), legacyRounded, `legacy rounding parity for ${value}`);
  }

  const sliding = resolveDoorMountThicknessesFromOwner({
    wardrobeType: 'sliding',
    doorMountMode: 'inset',
  });
  assert.equal(sliding.mode, 'overlay');
  assert.equal(sliding.defaultThicknessCm, 1.8);
  assert.equal(sliding.frameThicknessM, 1.8 / 100);
  assert.equal(sliding.shelfThicknessM, 1.8 / 100);
});

test('external drawer compute and fallback geometry share the same dimensional policy', () => {
  const geom = resolveExternalDrawerGeometry({
    externalWidthM: 0.8,
    depthM: 0.55,
    woodThicknessM: 0.018,
    frontZM: 0.275,
    drawerHeightM: 0.22,
  });
  const result = computeExternalDrawersOpsForModule({
    wardrobeType: 'hinged',
    externalCenterX: 0,
    externalW: 0.8,
    depth: 0.55,
    frontZ: 0.275,
    startY: 0,
    woodThick: 0.018,
    regCount: 1,
    regDrawerHeight: 0.22,
  }) as { drawers: Array<Record<string, number | Record<string, number>>> };

  assert.equal(result.drawers.length, 1);
  const drawer = result.drawers[0] as any;
  assert.equal(drawer.visualW, geom.visualW);
  assert.equal(drawer.visualT, geom.visualT);
  assert.equal(drawer.boxW, geom.boxW);
  assert.equal(drawer.boxD, geom.boxD);
  assert.equal(drawer.boxOffsetZ, geom.boxOffsetZ);
  assert.equal(drawer.connectW, geom.connectW);
  assert.equal(drawer.connectH, geom.connectH);
  assert.equal(drawer.connectD, geom.connectD);
  assert.equal(drawer.connectZ, geom.connectZ);
  assert.equal(drawer.closed.z, geom.zClosed);
  assert.equal(drawer.open.z, geom.zOpen);
});

test('external drawer focused resolver preserves facade identity, defaults, fallbacks, and full geometry', () => {
  assert.equal(resolveExternalDrawerGeometry, resolveExternalDrawerGeometryFromOwner);

  const defaults = resolveExternalDrawerGeometryFromOwner();
  assert.deepEqual(defaults, {
    zClosed: EXTERNAL_DRAWER_FRONT_RENDER_POLICY.frontOffsetZM,
    zOpen: EXTERNAL_DRAWER_MOTION_POLICY.openOffsetZM,
    visualW: -EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualWidthClearanceM,
    visualT: EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM,
    visualH:
      EXTERNAL_DRAWER_SIZE_POLICY.regularHeightM - EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualHeightClearanceM,
    boxW: -EXTERNAL_DRAWER_BOX_POLICY.boxWidthClearanceM,
    boxH: EXTERNAL_DRAWER_SIZE_POLICY.regularHeightM - EXTERNAL_DRAWER_BOX_POLICY.boxHeightClearanceM,
    boxD: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
    boxOffsetZ: EXTERNAL_DRAWER_BOX_POLICY.boxOffsetZM,
    connectW: -EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorWidthClearanceM,
    connectH:
      EXTERNAL_DRAWER_SIZE_POLICY.regularHeightM - EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorHeightClearanceM,
    connectD: EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorDepthM,
    connectZ:
      EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorFrontZM -
      EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorDepthM / 2 -
      EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorBackInsetM,
  });

  const invalid = resolveExternalDrawerGeometryFromOwner({
    externalWidthM: Number.NaN,
    depthM: Number.POSITIVE_INFINITY,
    woodThicknessM: 'not-a-number',
    frontZM: Number.NEGATIVE_INFINITY,
    drawerHeightM: undefined,
  });
  assert.deepEqual(invalid, defaults);

  const args = {
    externalWidthM: 0.93,
    depthM: 0.61,
    woodThicknessM: 0.03,
    frontZM: 0.305,
    drawerHeightM: 0.29,
  };
  const custom = resolveExternalDrawerGeometryFromOwner(args);
  assert.deepEqual(custom, {
    zClosed: args.frontZM + EXTERNAL_DRAWER_FRONT_RENDER_POLICY.frontOffsetZM,
    zOpen: args.frontZM + EXTERNAL_DRAWER_MOTION_POLICY.openOffsetZM,
    visualW: args.externalWidthM - EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualWidthClearanceM,
    visualT: EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM,
    visualH: args.drawerHeightM - EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualHeightClearanceM,
    boxW: args.externalWidthM - EXTERNAL_DRAWER_BOX_POLICY.boxWidthClearanceM,
    boxH: args.drawerHeightM - EXTERNAL_DRAWER_BOX_POLICY.boxHeightClearanceM,
    boxD: Math.max(args.woodThicknessM, args.depthM - EXTERNAL_DRAWER_BOX_POLICY.boxDepthBackClearanceM),
    boxOffsetZ: -args.depthM / 2 + EXTERNAL_DRAWER_BOX_POLICY.boxOffsetZM,
    connectW: args.externalWidthM - EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorWidthClearanceM,
    connectH: args.drawerHeightM - EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorHeightClearanceM,
    connectD: EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorDepthM,
    connectZ:
      EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorFrontZM -
      EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorDepthM / 2 -
      EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorBackInsetM,
  });
  assert.deepEqual(resolveExternalDrawerGeometry(args), custom);
});

test('sketch drawer sizing preserves focused limits, defaults, token parsing, and live-state rejection', () => {
  assert.equal(SKETCH_DRAWER_HEIGHT_MIN_CM, DRAWER_SKETCH_SIZING_POLICY.heightMinCm);
  assert.equal(SKETCH_DRAWER_HEIGHT_MAX_CM, DRAWER_SKETCH_SIZING_POLICY.heightMaxCm);
  assert.equal(SKETCH_EXTERNAL_DRAWER_COUNT_MIN, DRAWER_SKETCH_SIZING_POLICY.externalCountMin);
  assert.equal(SKETCH_EXTERNAL_DRAWER_COUNT_MAX, DRAWER_SKETCH_SIZING_POLICY.externalCountMax);
  assert.equal(DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM, DRAWER_SKETCH_SIZING_POLICY.externalDefaultHeightCm);
  assert.equal(DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM, DRAWER_SKETCH_SIZING_POLICY.internalDefaultHeightCm);
  assert.equal(
    DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M,
    cmToM(DRAWER_SKETCH_SIZING_POLICY.internalDefaultHeightCm)
  );
  assert.equal(DEFAULT_SKETCH_INTERNAL_DRAWER_GAP_M, DRAWER_SKETCH_SIZING_POLICY.internalGapM);
  assert.equal(SKETCH_INTERNAL_DRAWER_STACK_COUNT, DRAWER_SKETCH_SIZING_POLICY.internalStackCount);

  assert.equal(normalizeSketchDrawerHeightCm(-1, 22), DRAWER_SKETCH_SIZING_POLICY.heightMinCm);
  assert.equal(normalizeSketchDrawerHeightCm(999, 22), DRAWER_SKETCH_SIZING_POLICY.heightMaxCm);
  assert.equal(normalizeSketchDrawerHeightCm('24.26', 22), 24.3);
  assert.equal(
    normalizeSketchDrawerHeightM('0.24', DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M),
    DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M
  );

  const parsed = parseSketchExternalDrawersTool('sketch_ext_drawers:3@24.26');
  assert.deepEqual(parsed, {
    count: 3,
    drawerHeightCm: 24.3,
    drawerHeightM: cmToM(24.3),
  });
  assert.equal(
    parseSketchExternalDrawersTool('sketch_ext_drawers:-4')?.count,
    DRAWER_SKETCH_SIZING_POLICY.externalCountMin
  );
  assert.equal(
    parseSketchExternalDrawersTool('sketch_ext_drawers:99')?.count,
    DRAWER_SKETCH_SIZING_POLICY.externalCountMax
  );
  assert.equal(parseSketchInternalDrawersTool('sketch_int_drawers@18.26')?.drawerHeightCm, 18.3);
  assert.equal(
    createSketchExternalDrawersTool('3', DRAWER_SKETCH_SIZING_POLICY.externalDefaultHeightCm),
    'sketch_ext_drawers:3'
  );
  assert.equal(
    createSketchInternalDrawersTool(DRAWER_SKETCH_SIZING_POLICY.internalDefaultHeightCm),
    'sketch_int_drawers'
  );

  const externalMetrics = resolveSketchExternalDrawerMetrics({
    drawerCount: '3',
    drawerHeightM: '0.24',
  } as never);
  assert.equal(externalMetrics.drawerCount, 1);
  assert.equal(externalMetrics.drawerH, DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M);
  assert.equal(
    readSketchDrawerHeightMFromItem({ drawerHeightM: '0.24' }, DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M),
    DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M
  );

  const internalMetrics = resolveSketchInternalDrawerMetrics({
    drawerHeightM: DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M,
  });
  assert.equal(
    internalMetrics.drawerH,
    Math.max(DRAWER_SKETCH_SIZING_POLICY.minRenderHeightM, DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M)
  );
  assert.equal(internalMetrics.drawerGap, DRAWER_SKETCH_SIZING_POLICY.internalGapM);
  assert.equal(
    internalMetrics.stackH,
    DRAWER_SKETCH_SIZING_POLICY.internalStackCount * internalMetrics.drawerH +
      DRAWER_SKETCH_SIZING_POLICY.internalGapM
  );
  assert.equal(sketchStackFitsAvailableHeight(internalMetrics.stackH, internalMetrics.stackH), true);
  assert.equal(sketchStackFitsAvailableHeight(internalMetrics.stackH, internalMetrics.stackH - 2e-9), false);
});

test('sketch internal drawer cassette preserves focused defaults, ranges, touching, and width clamps', () => {
  const defaultWood = MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const clearance = DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalWidthClearanceM;
  const minWidth = DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalWidthMinM;
  const defaultFiller = DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalSideFillerWidthM;

  assert.equal(resolveSketchInternalDrawerCassetteWoodThick(undefined), defaultWood);
  assert.equal(resolveSketchInternalDrawerCassetteWoodThick(0.024), 0.024);
  for (const invalid of ['0.02', 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(resolveSketchInternalDrawerCassetteWoodThick(invalid), defaultWood);
  }

  const range = resolveSketchInternalDrawerCassetteRange({
    baseY: 0.4,
    stackH: 0.32,
  });
  assert.deepEqual(range, {
    minY: 0.4 - defaultWood,
    maxY: 0.4 + 0.32 + defaultWood,
    height: 0.32 + defaultWood * 2,
    woodThick: defaultWood,
  });

  assert.equal(
    verticalRangesTouchOrOverlap({
      minY: 0,
      maxY: 0.3,
      otherMinY: 0.3,
      otherMaxY: 0.6,
    }),
    true
  );
  assert.equal(
    verticalRangesTouchOrOverlap({
      minY: 0,
      maxY: 0.3,
      otherMinY: 0.3 + SKETCH_INTERNAL_DRAWER_CASSETTE_TOUCH_EPSILON_M,
      otherMaxY: 0.6,
    }),
    true
  );
  assert.equal(
    verticalRangesTouchOrOverlap({
      minY: 0,
      maxY: 0.3,
      otherMinY: 0.3 + SKETCH_INTERNAL_DRAWER_CASSETTE_TOUCH_EPSILON_M + 1e-9,
      otherMaxY: 0.6,
    }),
    false
  );

  const outerWidth = 0.8;
  assert.equal(resolveSketchInternalDrawerCassetteSideFillerWidth({ outerWidth }), defaultFiller);
  assert.equal(
    resolveSketchInternalDrawerCassetteSideFillerWidth({
      outerWidth,
      requestedWidthM: 0.07,
    }),
    0.07
  );
  const maxFiller = (outerWidth - (defaultWood * 2 + clearance + minWidth)) / 2;
  assert.equal(
    resolveSketchInternalDrawerCassetteSideFillerWidth({
      outerWidth,
      requestedWidthM: 10,
    }),
    maxFiller
  );
  assert.equal(
    resolveSketchInternalDrawerCassetteSideFillerWidth({
      outerWidth,
      requestedWidthM: '0.08',
    }),
    defaultFiller
  );

  const frameOuterWidth = outerWidth - defaultFiller * 2;
  assert.equal(resolveSketchInternalDrawerCassetteFrameOuterWidth({ outerWidth }), frameOuterWidth);
  assert.equal(
    resolveSketchInternalDrawerCassetteDrawerWidth({ outerWidth }),
    Math.max(minWidth, frameOuterWidth - defaultWood * 2 - clearance)
  );
  const minimumOuterWidth = defaultWood * 2 + clearance + minWidth;
  assert.ok(
    Math.abs(resolveSketchInternalDrawerCassetteDrawerWidth({ outerWidth: minimumOuterWidth }) - minWidth) <=
      1e-12
  );

  for (const invalidOuterWidth of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(
      resolveSketchInternalDrawerCassetteSideFillerWidth({
        outerWidth: invalidOuterWidth,
      }),
      0
    );
    assert.equal(
      resolveSketchInternalDrawerCassetteFrameOuterWidth({
        outerWidth: invalidOuterWidth,
      }),
      0
    );
    assert.equal(
      resolveSketchInternalDrawerCassetteDrawerWidth({
        outerWidth: invalidOuterWidth,
      }),
      minWidth
    );
  }
});

test('inset external drawer geometry places the face inside the front frame', () => {
  const geom = resolveExternalDrawerGeometry({
    externalWidthM: 0.8,
    depthM: 0.55,
    woodThicknessM: DOOR_SYSTEM_DIMENSIONS.hinged.insetFrameThicknessM,
    frontZM: 0.275,
    drawerHeightM: 0.22,
    doorMountMode: 'inset',
  });
  const expectedClosedZ =
    0.275 - EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM / 2 - HINGED_DOOR_MOUNT_POLICY.insetRevealM;

  assert.equal(geom.zClosed, expectedClosedZ);
  assert.equal(geom.zOpen, expectedClosedZ + EXTERNAL_DRAWER_MOTION_POLICY.openOffsetZM);

  const result = computeExternalDrawersOpsForModule({
    wardrobeType: 'hinged',
    externalCenterX: 0,
    externalW: 0.8,
    depth: 0.55,
    frontZ: 0.275,
    startY: 0,
    woodThick: DOOR_SYSTEM_DIMENSIONS.hinged.insetFrameThicknessM,
    doorMountMode: 'inset',
    regCount: 1,
    regDrawerHeight: 0.22,
  }) as { drawers: Array<Record<string, number | Record<string, number>>> };

  const drawer = result.drawers[0] as any;
  assert.equal(drawer.closed.z, expectedClosedZ);
  assert.equal(drawer.open.z, expectedClosedZ + EXTERNAL_DRAWER_MOTION_POLICY.openOffsetZM);
});
