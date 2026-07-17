import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BASE_LEG_DIMENSIONS as FACADE_BASE_LEG_DIMENSIONS,
  CARCASS_BASE_DIMENSIONS as FACADE_CARCASS_BASE_DIMENSIONS,
  CARCASS_CORNICE_DIMENSIONS as FACADE_CARCASS_CORNICE_DIMENSIONS,
  CARCASS_INTERIOR_DIMENSIONS as FACADE_CARCASS_INTERIOR_DIMENSIONS,
  CARCASS_SHELL_DIMENSIONS as FACADE_CARCASS_SHELL_DIMENSIONS,
  DOOR_SYSTEM_DIMENSIONS,
  DOOR_TRIM_DIMENSIONS,
  DRAWER_DIMENSIONS,
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
  CARCASS_CORNICE_COMMON_POLICY,
  CARCASS_CORNICE_PROFILE_POLICY,
  CARCASS_CORNICE_RENDER_POLICY,
  CARCASS_CORNICE_WAVE_POLICY,
} from '../esm/shared/dimensions/carcass_cornice_render_policy.ts';
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

test('feature facades read physical dimensions from the shared token source', () => {
  assert.equal(DEFAULT_BASE_LEG_HEIGHT_CM, BASE_LEG_DIMENSIONS.defaults.heightCm);
  assert.equal(DEFAULT_TAPERED_BASE_LEG_WIDTH_CM, BASE_LEG_DIMENSIONS.defaults.taperedWidthCm);
  assert.equal(DEFAULT_DOOR_TRIM_CROSS_SIZE_CM, DOOR_TRIM_DIMENSIONS.defaults.crossSizeCm);
  assert.equal(DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM, DRAWER_DIMENSIONS.sketch.externalDefaultHeightCm);
  assert.equal(SKETCH_EXTERNAL_DRAWER_COUNT_MAX, DRAWER_DIMENSIONS.sketch.externalCountMax);
  assert.equal(MATERIAL_DIMENSIONS.wood.thicknessM, 0.018);
  assert.equal(MATERIAL_DIMENSIONS.glassShelf.thicknessM, 0.018);
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
