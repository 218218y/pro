import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCarcassOps } from '../esm/native/builder/core_pure_compute.ts';
import { CARCASS_BASE_DIMENSIONS } from '../esm/shared/wardrobe_dimension_tokens_shared.ts';
import { parseSketchBoxBaseToolSpec } from '../esm/native/services/canvas_picking_sketch_box_dividers.ts';

test('carcass leg support keeps the tapered default and supports round and square legs', () => {
  const defaultOps = computeCarcassOps({
    totalW: 1.6,
    D: 0.55,
    H: 2.4,
    woodThick: 0.018,
    baseType: 'legs',
    doorsCount: 4,
  }) as any;

  assert.equal(defaultOps.baseHeight, 0.12);
  assert.equal(defaultOps.base.kind, 'legs');
  assert.equal(defaultOps.base.style, 'tapered');
  assert.deepEqual(defaultOps.base.geo, {
    shape: 'round',
    topRadius: 0.02,
    bottomRadius: 0.01,
    radialSegments: 16,
  });

  const roundOps = computeCarcassOps({
    totalW: 1.6,
    D: 0.55,
    H: 2.4,
    woodThick: 0.018,
    baseType: 'legs',
    baseLegStyle: 'round',
    baseLegHeightCm: 18,
    baseLegWidthCm: 7,
    doorsCount: 4,
  }) as any;

  assert.equal(roundOps.baseHeight, 0.18);
  assert.equal(roundOps.base.style, 'round');
  assert.equal(roundOps.base.geo.topRadius, roundOps.base.geo.bottomRadius);
  assert.equal(roundOps.base.geo.topRadius, 0.035);

  const squareOps = computeCarcassOps({
    totalW: 1.6,
    D: 0.55,
    H: 2.4,
    woodThick: 0.018,
    baseType: 'legs',
    baseLegStyle: 'square',
    baseLegWidthCm: 5.5,
    doorsCount: 4,
  }) as any;

  assert.equal(squareOps.base.style, 'square');
  assert.deepEqual(squareOps.base.geo, { shape: 'square', width: 0.055, depth: 0.055 });
});

test('carcass leg platform mode adds bottom and top stages without changing leg height', () => {
  const platformH = CARCASS_BASE_DIMENSIONS.legs.platform.heightM;
  const stageOps = computeCarcassOps({
    totalW: 1.6,
    D: 0.55,
    H: 2.4,
    woodThick: 0.018,
    baseType: 'legs',
    baseLegPlatformMode: 'stage',
    baseLegHeightCm: 12,
    doorsCount: 4,
    hasCornice: true,
  }) as any;

  assert.equal(stageOps.baseHeight, 0.12 + platformH);
  assert.equal(stageOps.startY, 0.12 + platformH);
  assert.equal(stageOps.base.height, 0.12);
  assert.equal(stageOps.base.platforms.length, 2);

  const bottom = stageOps.base.platforms[0];
  const top = stageOps.base.platforms[1];
  assert.equal(bottom.partId, 'base_leg_platform_bottom');
  assert.equal(top.partId, 'base_leg_platform_top');
  assert.equal(bottom.y, 0.12 + platformH / 2);
  assert.equal(top.y, 2.4 + platformH / 2);
  assert.ok(bottom.width > 1.6, 'bottom stage should protrude at the sides');
  assert.ok(bottom.depth > 0.55, 'bottom stage should protrude at the front');
  assert.equal(bottom.z - bottom.depth / 2, -0.55 / 2, 'bottom stage should not protrude backward');
  assert.equal(top.z - top.depth / 2, -0.55 / 2, 'top stage should not protrude backward');
  assert.ok(stageOps.cornice.segments[0].y > 2.4, 'cornice should move above the top stage');

  const flushOps = computeCarcassOps({
    totalW: 1.6,
    D: 0.55,
    H: 2.4,
    woodThick: 0.018,
    baseType: 'legs',
    baseLegPlatformMode: 'stage',
    baseLegPlatformSideMode: 'flush',
    baseLegHeightCm: 12,
    doorsCount: 4,
  }) as any;
  assert.equal(flushOps.base.platforms[0].width, 1.6, 'flush stage should end at the side panels');
  assert.equal(flushOps.base.platforms[1].width, 1.6, 'top flush stage should end at the side panels');
  assert.ok(flushOps.base.platforms[0].depth > 0.55, 'flush stage should still protrude at the front');

  const plainOps = computeCarcassOps({
    totalW: 1.6,
    D: 0.55,
    H: 2.4,
    woodThick: 0.018,
    baseType: 'legs',
    baseLegPlatformMode: 'plain',
    baseLegHeightCm: 12,
    doorsCount: 4,
  }) as any;
  assert.equal(plainOps.baseHeight, 0.12);
  assert.equal(plainOps.base.platforms, undefined);
});

test('carcass leg platform uses custom side/front overhang values and keeps flush side at zero', () => {
  const customOps = computeCarcassOps({
    totalW: 1.6,
    D: 0.55,
    H: 2.4,
    woodThick: 0.018,
    baseType: 'legs',
    baseLegPlatformMode: 'stage',
    baseLegPlatformSideMode: 'overhang',
    baseLegPlatformSideOverhangCm: 4,
    baseLegPlatformFrontOverhangCm: 6,
    doorsCount: 4,
  }) as any;

  const bottom = customOps.base.platforms[0];
  assert.ok(Math.abs(bottom.width - 1.68) < 0.000001, 'custom side overhang should widen both sides');
  assert.ok(Math.abs(bottom.depth - 0.61) < 0.000001, 'custom front overhang should deepen only the front');
  assert.ok(Math.abs(bottom.z - (-0.55 / 2 + 0.61 / 2)) < 0.000001);

  const flushOps = computeCarcassOps({
    totalW: 1.6,
    D: 0.55,
    H: 2.4,
    woodThick: 0.018,
    baseType: 'legs',
    baseLegPlatformMode: 'stage',
    baseLegPlatformSideMode: 'flush',
    baseLegPlatformSideOverhangCm: 4,
    baseLegPlatformFrontOverhangCm: 6,
    doorsCount: 4,
  }) as any;

  assert.equal(flushOps.base.platforms[0].width, 1.6);
  assert.ok(Math.abs(flushOps.base.platforms[0].depth - 0.61) < 0.000001);
});

test('carcass leg platform mode can suppress only the upper stage for decorative stack separators', () => {
  const platformH = CARCASS_BASE_DIMENSIONS.legs.platform.heightM;
  const ops = computeCarcassOps({
    totalW: 1.6,
    D: 0.55,
    H: 1.2,
    woodThick: 0.018,
    baseType: 'legs',
    baseLegPlatformMode: 'stage',
    baseLegSuppressTopPlatform: true,
    baseLegHeightCm: 12,
    doorsCount: 4,
  }) as any;

  assert.equal(ops.baseHeight, 0.12 + platformH);
  assert.equal(ops.startY, 0.12 + platformH);
  assert.equal(ops.base.kind, 'legs');
  assert.equal(ops.base.platforms.length, 1);
  assert.equal(ops.base.platforms[0].partId, 'base_leg_platform_bottom');
  assert.equal(ops.base.platforms[0].y, 0.12 + platformH / 2);
});

test('carcass can preserve only the top leg platform for split upper stacks', () => {
  const platformH = CARCASS_BASE_DIMENSIONS.legs.platform.heightM;
  const ops = computeCarcassOps({
    totalW: 1.6,
    D: 0.55,
    H: 1.5,
    woodThick: 0.018,
    baseType: '',
    baseLegPlatformMode: 'stage',
    baseLegTopPlatformOnly: true,
    doorsCount: 4,
    hasCornice: true,
  }) as any;

  assert.equal(ops.baseHeight, 0);
  assert.equal(ops.startY, 0);
  assert.equal(ops.cabinetBodyHeight, 1.5);
  assert.equal(ops.base.kind, 'leg_platforms');
  assert.equal(ops.base.platforms.length, 1);
  assert.equal(ops.base.platforms[0].partId, 'base_leg_platform_top');
  assert.equal(ops.base.platforms[0].y, 1.5 + platformH / 2);
  assert.ok(ops.cornice.segments[0].y > 1.5, 'cornice should move above the preserved top stage');

  const flushOps = computeCarcassOps({
    totalW: 1.6,
    D: 0.55,
    H: 1.5,
    woodThick: 0.018,
    baseType: '',
    baseLegPlatformMode: 'stage',
    baseLegPlatformSideMode: 'flush',
    baseLegTopPlatformOnly: true,
    doorsCount: 4,
  }) as any;
  assert.equal(flushOps.base.platforms[0].width, 1.6, 'top-only flush stage should end at the side panels');
  assert.ok(
    flushOps.base.platforms[0].depth > 0.55,
    'top-only flush stage should still protrude at the front'
  );
});

test('carcass top-only leg platform flag survives stripped top base without a duplicated mode value', () => {
  const platformH = CARCASS_BASE_DIMENSIONS.legs.platform.heightM;
  const ops = computeCarcassOps({
    totalW: 1.6,
    D: 0.55,
    H: 1.5,
    woodThick: 0.018,
    baseType: '',
    baseLegTopPlatformOnly: true,
    doorsCount: 4,
  }) as any;

  assert.equal(ops.baseHeight, 0);
  assert.equal(ops.startY, 0);
  assert.equal(ops.cabinetBodyHeight, 1.5);
  assert.equal(ops.base.kind, 'leg_platforms');
  assert.equal(ops.base.platforms.length, 1);
  assert.equal(ops.base.platforms[0].partId, 'base_leg_platform_top');
  assert.equal(ops.base.platforms[0].y, 1.5 + platformH / 2);

  const explicitlyPlain = computeCarcassOps({
    totalW: 1.6,
    D: 0.55,
    H: 1.5,
    woodThick: 0.018,
    baseType: '',
    baseLegPlatformMode: 'plain',
    baseLegTopPlatformOnly: true,
    doorsCount: 4,
  }) as any;
  assert.equal(explicitlyPlain.base, null);
});

test('sketch box base tool parser keeps old legs syntax and reads explicit leg options', () => {
  assert.deepEqual(parseSketchBoxBaseToolSpec('sketch_box_base:legs'), {
    baseType: 'legs',
    baseLegStyle: 'tapered',
    baseLegColor: 'black',
    baseLegHeightCm: 12,
    baseLegWidthCm: 4,
    basePlinthHeightCm: 8,
  });

  assert.deepEqual(parseSketchBoxBaseToolSpec('sketch_box_base:legs@round@gold@18'), {
    baseType: 'legs',
    baseLegStyle: 'round',
    baseLegColor: 'gold',
    baseLegHeightCm: 18,
    baseLegWidthCm: 3.5,
    basePlinthHeightCm: 8,
  });

  assert.deepEqual(parseSketchBoxBaseToolSpec('sketch_box_base:legs@square@nickel@16@6.5'), {
    baseType: 'legs',
    baseLegStyle: 'square',
    baseLegColor: 'nickel',
    baseLegHeightCm: 16,
    baseLegWidthCm: 6.5,
    basePlinthHeightCm: 8,
  });

  assert.deepEqual(parseSketchBoxBaseToolSpec('sketch_box_base:plinth@14.5'), {
    baseType: 'plinth',
    baseLegStyle: 'tapered',
    baseLegColor: 'black',
    baseLegHeightCm: 12,
    baseLegWidthCm: 4,
    basePlinthHeightCm: 14.5,
  });
});

test('carcass plinth support uses explicit plinth height and keeps the default at 8cm', () => {
  const defaultOps = computeCarcassOps({
    totalW: 1.6,
    D: 0.55,
    H: 2.4,
    woodThick: 0.018,
    baseType: 'plinth',
    doorsCount: 4,
  }) as any;

  assert.equal(defaultOps.baseHeight, 0.08);
  assert.equal(defaultOps.base.kind, 'plinth');
  assert.equal(defaultOps.startY, 0.08);

  const customOps = computeCarcassOps({
    totalW: 1.6,
    D: 0.55,
    H: 2.4,
    woodThick: 0.018,
    baseType: 'plinth',
    basePlinthHeightCm: 14.5,
    doorsCount: 4,
  }) as any;

  assert.equal(customOps.baseHeight, 0.145);
  assert.equal(customOps.base.height, 0.145);
  assert.equal(customOps.cabinetBodyHeight, 2.255);
});
