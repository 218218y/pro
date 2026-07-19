import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BASE_LEG_DIMENSIONS as FACADE_BASE_LEG_DIMENSIONS,
  CARCASS_BASE_DIMENSIONS as FACADE_CARCASS_BASE_DIMENSIONS,
  CARCASS_CORNICE_DIMENSIONS as FACADE_CARCASS_CORNICE_DIMENSIONS,
  CARCASS_INTERIOR_DIMENSIONS as FACADE_CARCASS_INTERIOR_DIMENSIONS,
  CARCASS_SHELL_DIMENSIONS as FACADE_CARCASS_SHELL_DIMENSIONS,
  CHEST_MODE_DIMENSIONS as FACADE_CHEST_MODE_DIMENSIONS,
  DOOR_MOUNT_THICKNESS_CONFIG_KEYS as FACADE_DOOR_MOUNT_THICKNESS_CONFIG_KEYS,
  DOOR_MOUNT_THICKNESS_DIMENSIONS as FACADE_DOOR_MOUNT_THICKNESS_DIMENSIONS,
  DOOR_VISUAL_DIMENSIONS as FACADE_DOOR_VISUAL_DIMENSIONS,
  DOOR_SYSTEM_DIMENSIONS,
  DOOR_TRIM_DIMENSIONS as FACADE_DOOR_TRIM_DIMENSIONS,
  DRAWER_DIMENSIONS,
  INTERIOR_FITTINGS_DIMENSIONS,
  MATERIAL_DIMENSIONS,
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
  getDefaultDepthForWardrobeType,
  getDefaultDoorsForWardrobeType,
  getDefaultWidthForWardrobeType,
  resolveDoorMountThicknessesFromConfig,
} from '../esm/shared/wardrobe_dimension_tokens_shared.ts';
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
  createSketchExternalDrawersTool,
  parseSketchExternalDrawersTool,
  readSketchDrawerHeightMFromItem,
  resolveSketchExternalDrawerMetrics,
  SKETCH_EXTERNAL_DRAWER_COUNT_MAX,
} from '../esm/native/features/sketch_drawer_sizing.ts';
import {
  resolveSketchInternalDrawerCassetteSideFillerWidth,
  resolveSketchInternalDrawerCassetteWoodThick,
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
  assert.equal(DOOR_SYSTEM_DIMENSIONS, OWNER_DOOR_SYSTEM_DIMENSIONS);
  assert.equal(OWNER_DOOR_SYSTEM_DIMENSIONS.hinged, HINGED_DOOR_SYSTEM_POLICY);
  assert.equal(OWNER_DOOR_SYSTEM_DIMENSIONS.sliding, SLIDING_DOOR_SYSTEM_POLICY);
  assert.equal(HINGED_DOOR_SYSTEM_POLICY.split, HINGED_DOOR_SPLIT_POLICY);
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

test('sketch drawer tools parse numeric tokens while live state readers reject numeric strings', () => {
  const parsed = parseSketchExternalDrawersTool('sketch_ext_drawers:3@24');

  assert.equal(parsed?.count, 3);
  assert.equal(parsed?.drawerHeightCm, 24);
  assert.ok(Math.abs((parsed?.drawerHeightM ?? 0) - 0.24) < 1e-9);
  assert.equal(createSketchExternalDrawersTool('3', '24'), 'sketch_ext_drawers:3@24');

  const metrics = resolveSketchExternalDrawerMetrics({
    drawerCount: '3',
    drawerHeightM: '0.24',
  } as any);
  assert.equal(metrics.drawerCount, 1);
  assert.equal(metrics.drawerH, DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M);
  assert.equal(
    readSketchDrawerHeightMFromItem({ drawerHeightM: '0.24' }, DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M),
    DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M
  );
});

test('sketch internal drawer cassette sizing rejects string-encoded live dimensions', () => {
  assert.equal(resolveSketchInternalDrawerCassetteWoodThick('0.02'), MATERIAL_DIMENSIONS.wood.thicknessM);
  assert.equal(
    resolveSketchInternalDrawerCassetteSideFillerWidth({
      outerWidth: 0.8,
      woodThick: 0.02,
      requestedWidthM: '0.08',
    }),
    DRAWER_DIMENSIONS.sketch.internalSideFillerWidthM
  );
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
    0.275 - DRAWER_DIMENSIONS.external.visualThicknessM / 2 - DOOR_SYSTEM_DIMENSIONS.hinged.insetRevealM;

  assert.equal(geom.zClosed, expectedClosedZ);
  assert.equal(geom.zOpen, expectedClosedZ + DRAWER_DIMENSIONS.external.openOffsetZM);

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
  assert.equal(drawer.open.z, expectedClosedZ + DRAWER_DIMENSIONS.external.openOffsetZM);
});
