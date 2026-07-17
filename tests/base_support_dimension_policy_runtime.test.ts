import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCarcassOps } from '../esm/native/builder/core_pure_compute.ts';

const BASE_INPUT = Object.freeze({
  totalW: 1.6,
  D: 0.55,
  H: 2.4,
  woodThick: 0.018,
  doorsCount: 4,
});

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

test('Base Support policy preserves regular and stepped plinth geometry', () => {
  const regular = computeCarcassOps({ ...BASE_INPUT, baseType: 'plinth' }) as any;
  assert.equal(regular.baseHeight, 0.08);
  assert.equal(regular.startY, 0.08);
  assert.deepEqual(regular.base, {
    kind: 'plinth',
    width: 1.56,
    height: 0.08,
    depth: 0.5,
    x: 0,
    y: 0.04,
    z: -0.015,
    partId: 'plinth_color',
  });

  const stepped = computeCarcassOps({
    ...BASE_INPUT,
    baseType: 'plinth',
    moduleInternalWidths: [0.782, 0.782],
    moduleHeightsTotal: [2.4, 2.1],
    moduleDepthsTotal: [0.55, 0.45],
    moduleCfgList: [{}, {}],
  }) as any;
  assert.deepEqual(
    stepped.base.segments.map((segment: Record<string, number | string>) => ({
      kind: segment.kind,
      width: rounded(Number(segment.width)),
      height: segment.height,
      depth: rounded(Number(segment.depth)),
      x: rounded(Number(segment.x)),
      y: segment.y,
      z: rounded(Number(segment.z)),
    })),
    [
      { kind: 'plinth', width: 0.817, height: 0.08, depth: 0.5, x: -0.391, y: 0.04, z: -0.015 },
      { kind: 'plinth', width: 0.781, height: 0.08, depth: 0.4, x: 0.409, y: 0.04, z: -0.065 },
    ]
  );
});

test('Base Support policy preserves four corner legs and the five-door center supports', () => {
  const fourLegs = computeCarcassOps({ ...BASE_INPUT, baseType: 'legs' }) as any;
  assert.deepEqual(
    fourLegs.base.positions.map((position: { x: number; z: number }) => ({
      x: rounded(position.x),
      z: rounded(position.z),
    })),
    [
      { x: -0.75, z: 0.225 },
      { x: 0.75, z: 0.225 },
      { x: -0.75, z: -0.225 },
      { x: 0.75, z: -0.225 },
    ]
  );

  const centerSupported = computeCarcassOps({ ...BASE_INPUT, baseType: 'legs', doorsCount: 5 }) as any;
  assert.deepEqual(
    centerSupported.base.positions.slice(4).map((position: { x: number; z: number }) => ({
      x: rounded(position.x),
      z: rounded(position.z),
    })),
    [
      { x: 0, z: 0.225 },
      { x: 0, z: -0.225 },
    ]
  );
});

test('Base Support policy preserves top/bottom platform geometry for overhang and flush modes', () => {
  const overhang = computeCarcassOps({
    ...BASE_INPUT,
    baseType: 'legs',
    baseLegPlatformMode: 'stage',
    baseLegHeightCm: 12,
  }) as any;
  assert.equal(overhang.baseHeight, 0.148);
  assert.deepEqual(
    overhang.base.platforms.map((platform: Record<string, number | string>) => ({
      partId: platform.partId,
      width: rounded(Number(platform.width)),
      height: platform.height,
      depth: rounded(Number(platform.depth)),
      y: rounded(Number(platform.y)),
      z: rounded(Number(platform.z)),
    })),
    [
      {
        partId: 'base_leg_platform_bottom',
        width: 1.63,
        height: 0.028,
        depth: 0.57,
        y: 0.134,
        z: 0.01,
      },
      {
        partId: 'base_leg_platform_top',
        width: 1.63,
        height: 0.028,
        depth: 0.57,
        y: 2.414,
        z: 0.01,
      },
    ]
  );

  const flush = computeCarcassOps({
    ...BASE_INPUT,
    baseType: 'legs',
    baseLegPlatformMode: 'stage',
    baseLegPlatformSideMode: 'flush',
    baseLegHeightCm: 12,
  }) as any;
  assert.deepEqual(
    flush.base.platforms.map((platform: Record<string, number | string>) => ({
      width: rounded(Number(platform.width)),
      depth: rounded(Number(platform.depth)),
      z: rounded(Number(platform.z)),
    })),
    [
      { width: 1.6, depth: 0.57, z: 0.01 },
      { width: 1.6, depth: 0.57, z: 0.01 },
    ]
  );
});
