import test from 'node:test';
import assert from 'node:assert/strict';

import { collectModuleHeights } from '../esm/native/builder/build_flow_plan.ts';
import { collectModuleDepths } from '../esm/native/builder/build_flow_plan_dimensions.ts';

test('mixed regular and taller custom cells raise carcass height to the tallest cell', () => {
  const result = collectModuleHeights({
    moduleCfgList: [
      {
        specialDims: {
          heightCm: 260,
          baseHeightCm: 240,
        },
      },
      {},
      {},
    ],
    splitActiveForBuild: false,
    lowerHeightCm: 0,
    H: 2.4,
    woodThick: 0.018,
  });

  assert.deepEqual(result.moduleHeightsTotal, [2.6, 2.4, 2.4]);
  assert.equal(result.carcassH, 2.6);
});

test('mixed regular and shorter custom cells keep the carcass at the global height', () => {
  const result = collectModuleHeights({
    moduleCfgList: [
      {},
      {
        specialDims: {
          heightCm: 220,
          baseHeightCm: 240,
        },
      },
      {},
    ],
    splitActiveForBuild: false,
    lowerHeightCm: 0,
    H: 2.4,
    woodThick: 0.018,
  });

  assert.deepEqual(result.moduleHeightsTotal, [2.4, 2.2, 2.4]);
  assert.equal(result.carcassH, 2.4);
});

test('fully manual heights still collapse the carcass to the tallest manual cell', () => {
  const result = collectModuleHeights({
    moduleCfgList: [
      {
        specialDims: {
          heightCm: 190,
          baseHeightCm: 240,
        },
      },
      {
        specialDims: {
          heightCm: 210,
          baseHeightCm: 240,
        },
      },
      {
        specialDims: {
          heightCm: 205,
          baseHeightCm: 240,
        },
      },
    ],
    splitActiveForBuild: false,
    lowerHeightCm: 0,
    H: 2.4,
    woodThick: 0.018,
  });

  assert.deepEqual(result.moduleHeightsTotal, [1.9, 2.1, 2.05]);
  assert.equal(result.carcassH, 2.1);
});

test('build flow plan dimensions do not coerce string-encoded runtime measurements', () => {
  const heightResult = collectModuleHeights({
    moduleCfgList: [
      {
        specialDims: {
          heightCm: 250,
          baseHeightCm: 240,
        },
      },
    ],
    splitActiveForBuild: true,
    lowerHeightCm: '60' as unknown as number,
    H: 2.4,
    woodThick: 0.018,
  });

  assert.deepEqual(heightResult.moduleHeightsTotal, [2.5]);

  const depthResult = collectModuleDepths({
    moduleCfgList: [{}],
    moduleInternalWidths: ['0.75'] as unknown as number[],
    D: 0.6,
    woodThick: 0.018,
  });

  assert.deepEqual(depthResult.moduleDepthsTotal, [0.6]);
});
