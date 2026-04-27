import test from 'node:test';
import assert from 'node:assert/strict';

import { computeInteriorCustomOps } from '../esm/native/builder/core_storage_compute.js';

test('computeInteriorCustomOps prefers exact preset-backed rodOps over rounded grid rods', () => {
  const ops = computeInteriorCustomOps(
    {
      shelves: [true, false, false, false, true],
      rods: [false, true, false, false, true, false],
      rodOps: [
        {
          gridIndex: 2,
          yFactor: 2.3,
          enableHangingClothes: true,
          enableSingleHanger: true,
          limitFactor: 1.3,
          limitAdd: 0,
        },
        {
          gridIndex: 5,
          yFactor: 4.6,
          enableHangingClothes: true,
          enableSingleHanger: true,
          limitFactor: 2.3,
          limitAdd: 0,
        },
      ],
      storage: false,
      shelfVariants: [],
    },
    6
  );

  assert.deepEqual(
    ops.rods.map(rod => ({
      gridIndex: rod.gridIndex,
      yFactor: rod.yFactor,
      limitFactor: rod.limitFactor,
      limitAdd: rod.limitAdd,
    })),
    [
      { gridIndex: 2, yFactor: 2.3, limitFactor: 1.3, limitAdd: 0 },
      { gridIndex: 5, yFactor: 4.6, limitFactor: 2.3, limitAdd: 0 },
    ]
  );
});
