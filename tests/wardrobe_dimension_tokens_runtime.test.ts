import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BASE_LEG_DIMENSIONS,
  DOOR_TRIM_DIMENSIONS,
  DRAWER_DIMENSIONS,
  MATERIAL_DIMENSIONS,
  WARDROBE_DEFAULTS,
  resolveExternalDrawerGeometry,
} from '../esm/shared/wardrobe_dimension_tokens_shared.ts';
import {
  DEFAULT_HINGED_DOORS,
  DEFAULT_SLIDING_DOORS,
  DEFAULT_STACK_SPLIT_LOWER_HEIGHT,
  DEFAULT_WIDTH,
  HINGED_DEFAULT_DEPTH,
  SLIDING_DEFAULT_DEPTH,
  getDefaultDepthForWardrobeType,
  getDefaultDoorsForWardrobeType,
  getDefaultWidthForWardrobeType,
} from '../esm/shared/wardrobe_dimension_tokens_shared.ts';
import {
  DEFAULT_BASE_LEG_HEIGHT_CM,
  DEFAULT_TAPERED_BASE_LEG_WIDTH_CM,
} from '../esm/native/features/base_leg_support.ts';
import {
  DEFAULT_DOOR_TRIM_CROSS_SIZE_CM,
  DEFAULT_DOOR_TRIM_THICKNESS_M,
} from '../esm/native/features/door_trim_shared.ts';
import {
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM,
  SKETCH_EXTERNAL_DRAWER_COUNT_MAX,
} from '../esm/native/features/sketch_drawer_sizing.ts';
import { computeExternalDrawersOpsForModule } from '../esm/native/builder/core_storage_compute_external_drawers.ts';

test('wardrobe default tokens preserve hinged and sliding business defaults', () => {
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

test('feature facades read physical dimensions from the shared token source', () => {
  assert.equal(DEFAULT_BASE_LEG_HEIGHT_CM, BASE_LEG_DIMENSIONS.defaults.heightCm);
  assert.equal(DEFAULT_TAPERED_BASE_LEG_WIDTH_CM, BASE_LEG_DIMENSIONS.defaults.taperedWidthCm);
  assert.equal(DEFAULT_DOOR_TRIM_THICKNESS_M, DOOR_TRIM_DIMENSIONS.defaults.thicknessM);
  assert.equal(DEFAULT_DOOR_TRIM_CROSS_SIZE_CM, DOOR_TRIM_DIMENSIONS.defaults.crossSizeCm);
  assert.equal(DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM, DRAWER_DIMENSIONS.sketch.externalDefaultHeightCm);
  assert.equal(SKETCH_EXTERNAL_DRAWER_COUNT_MAX, DRAWER_DIMENSIONS.sketch.externalCountMax);
  assert.equal(MATERIAL_DIMENSIONS.wood.thicknessM, 0.018);
  assert.equal(MATERIAL_DIMENSIONS.glassShelf.thicknessM, 0.018);
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
