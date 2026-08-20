import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CARCASS_BACK_INSET_Z,
  CARCASS_FRONT_INSET_Z,
  prepareCarcassInput,
} from '../esm/native/builder/core_carcass_shared.ts';
import { BASE_LEG_LAYOUT_POLICY } from '../esm/shared/dimensions/base_leg_policy.ts';
import { BASE_PLATFORM_RENDER_POLICY } from '../esm/shared/dimensions/base_platform_render_policy.ts';
import { BASE_PLINTH_POLICY } from '../esm/shared/dimensions/base_plinth_policy.ts';
import { CARCASS_SHELL_DIMENSIONS } from '../esm/shared/dimensions/carcass_shell_policy.ts';
import { MATERIAL_THICKNESS_POLICY } from '../esm/shared/dimensions/material_thickness_policy.ts';

type UnknownRecord = Record<string, unknown>;

function requireRecord(value: unknown): UnknownRecord {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value));
  return value as UnknownRecord;
}

function requireRecordArray(value: unknown): UnknownRecord[] {
  assert.ok(Array.isArray(value));
  return value.map(requireRecord);
}

function pickXZ(value: UnknownRecord): { x: number; z: number } {
  assert.equal(typeof value.x, 'number');
  assert.equal(typeof value.z, 'number');
  return { x: value.x, z: value.z };
}

function assertClose(actual: unknown, expected: number): void {
  assert.equal(typeof actual, 'number');
  assert.ok(Math.abs(actual - expected) <= 1e-12, `${actual} must equal ${expected} within tolerance`);
}

test('Core Carcass Shared preserves shell constants, Material fallback, module floors, and return shape', () => {
  assert.equal(CARCASS_BACK_INSET_Z, CARCASS_SHELL_DIMENSIONS.backInsetZM);
  assert.equal(CARCASS_FRONT_INSET_Z, CARCASS_SHELL_DIMENSIONS.frontInsetZM);

  const defaults = prepareCarcassInput({ totalW: 1, D: 0.6, H: 2.4 });
  const numericString = prepareCarcassInput({
    totalW: 1,
    D: 0.6,
    H: 2.4,
    woodThick: String(MATERIAL_THICKNESS_POLICY.wood.thicknessM),
  });
  assert.equal(defaults.woodThick, MATERIAL_THICKNESS_POLICY.wood.thicknessM);
  assert.equal(numericString.woodThick, MATERIAL_THICKNESS_POLICY.wood.thicknessM);
  assert.deepEqual(Object.keys(defaults), [
    'totalW',
    'D',
    'H',
    'woodThick',
    'baseType',
    'doorsCount',
    'hasCornice',
    'corniceType',
    'baseHeight',
    'startY',
    'cabinetBodyHeight',
    'base',
    'baseLegPlatformMode',
    'baseLegPlatformSideMode',
    'baseLegPlatformSideOverhangM',
    'baseLegPlatformFrontOverhangM',
    'baseLegTopPlatformOnly',
    'baseLegSuppressTopPlatform',
    'baseLegBottomPlatformHeight',
    'baseLegTopPlatformHeight',
    'moduleWidths',
    'moduleHeightsRaw',
    'moduleDepths',
    'moduleConfigs',
    'hasStepData',
    'hasDepthData',
    'isStepped',
    'isDepthStepped',
    'removedFrameSidePlan',
    'stackSplitDividerY',
  ]);

  const stepped = prepareCarcassInput({
    totalW: 1,
    D: 0.6,
    H: 2.4,
    woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
    moduleInternalWidths: [0.464, 0.464],
    moduleHeightsTotal: [2.4, 2.2],
    moduleDepthsTotal: [0.6, 0.001],
    moduleCfgList: [{ id: 'left' }, 'invalid'],
  });
  assert.deepEqual(stepped.moduleWidths, [0.464, 0.464]);
  assert.deepEqual(stepped.moduleHeightsRaw, [2.4, 2.2]);
  assert.deepEqual(stepped.moduleDepths, [0.6, MATERIAL_THICKNESS_POLICY.wood.thicknessM]);
  assert.deepEqual(stepped.moduleConfigs, [{ id: 'left' }, null]);
  assert.equal(stepped.hasStepData, true);
  assert.equal(stepped.hasDepthData, true);
  assert.equal(stepped.isStepped, true);
  assert.equal(stepped.isDepthStepped, true);

  const mismatchedConfigs = prepareCarcassInput({
    totalW: 1,
    D: 0.6,
    H: 2.4,
    moduleInternalWidths: [0.464, 0.464],
    moduleCfgList: [{ id: 'only-one' }],
  });
  assert.equal(mismatchedConfigs.moduleConfigs, null);
});

test('Core Carcass Shared preserves plinth geometry, cabinet height, and part identity', () => {
  const totalW = 1.6;
  const depth = 0.55;
  const height = 2.4;
  const baseHeight = 12.5 / 100;
  const result = prepareCarcassInput({
    totalW,
    D: depth,
    H: height,
    baseType: 'plinth',
    basePlinthHeightCm: 12.5,
  });
  const base = requireRecord(result.base);

  assert.deepEqual(base, {
    kind: 'plinth',
    width: totalW - BASE_PLINTH_POLICY.widthClearanceM,
    height: baseHeight,
    depth: depth - BASE_PLINTH_POLICY.depthClearanceM,
    x: 0,
    y: baseHeight / 2,
    z: -BASE_PLINTH_POLICY.frontInsetM,
    partId: 'plinth_color',
  });
  assert.equal(result.baseHeight, baseHeight);
  assert.equal(result.startY, baseHeight);
  assert.equal(result.cabinetBodyHeight, height - baseHeight);
});

test('Core Carcass Shared preserves four corner legs and center-support threshold routing', () => {
  const totalW = 1.6;
  const depth = 0.55;
  const inset = BASE_LEG_LAYOUT_POLICY.cornerInsetM;
  const prepare = (doorsCount: number) =>
    prepareCarcassInput({
      totalW,
      D: depth,
      H: 2.4,
      baseType: 'legs',
      baseLegPlatformMode: 'plain',
      doorsCount,
    });
  const positions = (doorsCount: number) =>
    requireRecordArray(requireRecord(prepare(doorsCount).base).positions).map(pickXZ);
  const corners = [
    { x: -totalW / 2 + inset, z: depth / 2 - inset },
    { x: totalW / 2 - inset, z: depth / 2 - inset },
    { x: -totalW / 2 + inset, z: -depth / 2 + inset },
    { x: totalW / 2 - inset, z: -depth / 2 + inset },
  ];
  const centers = [
    { x: 0, z: depth / 2 - inset },
    { x: 0, z: -depth / 2 + inset },
  ];

  assert.deepEqual(positions(BASE_LEG_LAYOUT_POLICY.centerSupportDoorsThreshold - 1), corners);
  assert.deepEqual(positions(BASE_LEG_LAYOUT_POLICY.centerSupportDoorsThreshold), [...corners, ...centers]);
  assert.deepEqual(positions(BASE_LEG_LAYOUT_POLICY.centerSupportDoorsThreshold + 1), [
    ...corners,
    ...centers,
  ]);
});

test('Core Carcass Shared preserves staged, suppressed, top-only, overhang, flush, and minimum platforms', () => {
  const totalW = 1.6;
  const depth = 0.55;
  const height = 2.4;
  const legHeight = 12 / 100;
  const sideOverhang = 4 / 100;
  const frontOverhang = 6 / 100;
  const platformHeight = BASE_PLATFORM_RENDER_POLICY.heightM;
  const platformDepth = Math.max(BASE_PLATFORM_RENDER_POLICY.minDepthM, depth + frontOverhang);
  const stage = prepareCarcassInput({
    totalW,
    D: depth,
    H: height,
    baseType: 'legs',
    baseLegHeightCm: 12,
    baseLegPlatformMode: 'stage',
    baseLegPlatformSideMode: 'overhang',
    baseLegPlatformSideOverhangCm: 4,
    baseLegPlatformFrontOverhangCm: 6,
  });
  const stagePlatforms = requireRecordArray(requireRecord(stage.base).platforms);

  assert.equal(stage.baseLegBottomPlatformHeight, platformHeight);
  assert.equal(stage.baseLegTopPlatformHeight, platformHeight);
  assert.equal(stage.baseHeight, legHeight + platformHeight);
  assert.deepEqual(stagePlatforms, [
    {
      kind: 'leg_platform',
      width: Math.max(BASE_PLATFORM_RENDER_POLICY.minWidthM, totalW + sideOverhang * 2),
      height: platformHeight,
      depth: platformDepth,
      x: 0,
      y: legHeight + platformHeight / 2,
      z: -depth / 2 + platformDepth / 2,
      partId: 'base_leg_platform_bottom',
    },
    {
      kind: 'leg_platform',
      width: Math.max(BASE_PLATFORM_RENDER_POLICY.minWidthM, totalW + sideOverhang * 2),
      height: platformHeight,
      depth: platformDepth,
      x: 0,
      y: height + platformHeight / 2,
      z: -depth / 2 + platformDepth / 2,
      partId: 'base_leg_platform_top',
    },
  ]);

  const suppressed = prepareCarcassInput({
    totalW,
    D: depth,
    H: height,
    baseType: 'legs',
    baseLegPlatformMode: 'stage',
    baseLegSuppressTopPlatform: true,
  });
  const suppressedPlatforms = requireRecordArray(requireRecord(suppressed.base).platforms);
  assert.equal(suppressed.baseLegSuppressTopPlatform, true);
  assert.equal(suppressed.baseLegTopPlatformHeight, 0);
  assert.deepEqual(
    suppressedPlatforms.map(platform => platform.partId),
    ['base_leg_platform_bottom']
  );

  const topOnly = prepareCarcassInput({
    totalW,
    D: depth,
    H: height,
    baseType: '',
    baseLegTopPlatformOnly: true,
  });
  const topOnlyBase = requireRecord(topOnly.base);
  const topOnlyPlatforms = requireRecordArray(topOnlyBase.platforms);
  assert.equal(topOnlyBase.kind, 'leg_platforms');
  assert.equal(topOnly.baseHeight, 0);
  assert.equal(topOnly.cabinetBodyHeight, height);
  assert.equal(topOnly.baseLegTopPlatformOnly, true);
  assert.deepEqual(
    topOnlyPlatforms.map(platform => platform.partId),
    ['base_leg_platform_top']
  );

  const flushMinimum = prepareCarcassInput({
    totalW: 0.05,
    D: 0.01,
    H: 0.4,
    baseType: 'legs',
    baseLegPlatformMode: 'stage',
    baseLegPlatformSideMode: 'flush',
    baseLegPlatformSideOverhangCm: 0,
    baseLegPlatformFrontOverhangCm: 0,
  });
  const minimumBottom = requireRecordArray(requireRecord(flushMinimum.base).platforms)[0];
  assert.equal(minimumBottom.width, BASE_PLATFORM_RENDER_POLICY.minWidthM);
  assert.equal(minimumBottom.depth, BASE_PLATFORM_RENDER_POLICY.minDepthM);
  assert.equal(minimumBottom.z, -0.01 / 2 + BASE_PLATFORM_RENDER_POLICY.minDepthM / 2);
});

test('Core Carcass Shared preserves depth-stepped plinth segmentation and ordering', () => {
  const totalW = 1;
  const depth = 0.6;
  const woodThick = MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const result = prepareCarcassInput({
    totalW,
    D: depth,
    H: 2.4,
    woodThick,
    baseType: 'plinth',
    moduleInternalWidths: [0.464, 0.464],
    moduleDepthsTotal: [0.5, 0.001],
  });
  const base = requireRecord(result.base);
  const segments = requireRecordArray(base.segments);
  const halfSegmentSpan = totalW / 2;
  const segmentWidth = Math.max(
    BASE_PLINTH_POLICY.segmentWidthEpsilonM,
    halfSegmentSpan - BASE_PLINTH_POLICY.segmentWidthEpsilonM
  );
  const firstDepth = Math.max(
    BASE_PLINTH_POLICY.steppedMinSegmentDepthM,
    0.5 - BASE_PLINTH_POLICY.depthClearanceM
  );
  const secondDepth = Math.max(
    BASE_PLINTH_POLICY.steppedMinSegmentDepthM,
    woodThick - BASE_PLINTH_POLICY.depthClearanceM
  );

  assert.equal(result.isDepthStepped, true);
  assert.deepEqual(result.moduleDepths, [0.5, woodThick]);
  assert.equal(base.partId, 'plinth_color');
  assert.deepEqual(
    segments.map(segment => ({ kind: segment.kind, keys: Object.keys(segment) })),
    [
      {
        kind: 'plinth',
        keys: ['kind', 'width', 'height', 'depth', 'x', 'y', 'z'],
      },
      {
        kind: 'plinth',
        keys: ['kind', 'width', 'height', 'depth', 'x', 'y', 'z'],
      },
    ]
  );
  for (const segment of segments) {
    assertClose(segment.width, segmentWidth);
    assertClose(segment.height, BASE_PLINTH_POLICY.heightM);
    assertClose(segment.y, BASE_PLINTH_POLICY.heightM / 2);
  }
  assertClose(segments[0].depth, firstDepth);
  assertClose(segments[0].x, -totalW / 4);
  assertClose(segments[0].z, -depth / 2 + BASE_PLINTH_POLICY.steppedBackInsetM + firstDepth / 2);
  assertClose(segments[1].depth, secondDepth);
  assertClose(segments[1].x, totalW / 4);
  assertClose(segments[1].z, -depth / 2 + BASE_PLINTH_POLICY.steppedBackInsetM + secondDepth / 2);
});

test('Core Carcass Shared preserves depth-stepped front-leg adjustment and minimum back gap', () => {
  const totalW = 1;
  const depth = 0.6;
  const inset = BASE_LEG_LAYOUT_POLICY.cornerInsetM;
  const backZ = -depth / 2 + inset;
  const result = prepareCarcassInput({
    totalW,
    D: depth,
    H: 2.4,
    woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
    baseType: 'legs',
    baseLegPlatformMode: 'plain',
    doorsCount: BASE_LEG_LAYOUT_POLICY.centerSupportDoorsThreshold - 1,
    moduleInternalWidths: [0.464, 0.464],
    moduleDepthsTotal: [0.001, 0.5],
  });
  const positions = requireRecordArray(requireRecord(result.base).positions).map(pickXZ);

  assert.deepEqual(positions, [
    {
      x: -totalW / 2 + inset,
      z: backZ + BASE_LEG_LAYOUT_POLICY.depthSteppedMinFrontBackGapM,
    },
    {
      x: totalW / 2 - inset,
      z: -depth / 2 + 0.5 - inset,
    },
    { x: -totalW / 2 + inset, z: backZ },
    { x: totalW / 2 - inset, z: backZ },
  ]);
  assert.equal(positions[0].z - positions[2].z, BASE_LEG_LAYOUT_POLICY.depthSteppedMinFrontBackGapM);
});
