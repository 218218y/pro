import test from 'node:test';
import assert from 'node:assert/strict';

import { MATERIAL_THICKNESS_POLICY } from '../esm/shared/dimensions/material_thickness_policy.ts';
import { INTERIOR_ROD_PLACEMENT_POLICY } from '../esm/shared/dimensions/interior_fittings_policy.ts';

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
          yFactor: 4.8,
          enableHangingClothes: true,
          enableSingleHanger: true,
          limitFactor: 2.5,
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
      { gridIndex: 5, yFactor: 4.8, limitFactor: 2.5, limitAdd: 0 },
    ]
  );
});

test('double hanging has only a middle brace and two rods below the roof and brace', async () => {
  const { computeInteriorPresetOps, buildPresetBackedCustomData } =
    await import('../esm/native/features/interior_layout_presets/api.ts');
  const split = computeInteriorPresetOps('hanging_split');
  assert.deepEqual(split.shelves, [3]);
  assert.equal(split.shelfVariant, 'brace');
  // Compare visible space from the roof and from the underside of the
  // real-thickness middle brace, not from the brace's center line.
  const referenceStep = 2.4 / 6;
  const upperGap = 6 * referenceStep - split.rods[0]!.yFactor * referenceStep;
  const braceUnderside = 3 * referenceStep - MATERIAL_THICKNESS_POLICY.wood.thicknessM / 2;
  const lowerGap = braceUnderside - split.rods[1]!.yFactor * referenceStep;
  assert.ok(Math.abs(upperGap - lowerGap) < 1e-9);
  assert.ok(Math.abs(lowerGap + INTERIOR_ROD_PLACEMENT_POLICY.defaultYOffsetM) < 1e-9);

  assert.deepEqual(
    split.rods.map(rod => [rod.yFactor, rod.limitFactor]),
    [
      [5.8, 2.8],
      [2.7775, 2.7775],
    ]
  );
  for (const rod of split.rods) {
    assert.equal(rod.enableHangingClothes, true);
    assert.equal(rod.enableSingleHanger, true);
  }
  for (const divisions of [6, 12]) {
    const seeded = buildPresetBackedCustomData('hanging_split', divisions);
    const middle = divisions / 2 - 1;
    assert.deepEqual(
      seeded.shelves.map((exists, i) => (exists ? i : -1)).filter(i => i >= 0),
      [middle]
    );
    assert.equal(seeded.shelfVariants[middle], 'brace');
    const custom = computeInteriorCustomOps(seeded, divisions);
    assert.deepEqual(
      custom.rods.map(rod => [rod.yFactor, rod.limitFactor]),
      [
        [2.7775, 2.7775],
        [5.8, 2.8],
      ]
    );
  }
});

test('computeInteriorPresetOps aligns storage rod height with the regular hanging preset', async () => {
  const { computeInteriorPresetOps } = await import('../esm/native/features/interior_layout_presets/ops.ts');
  const hanging = computeInteriorPresetOps('hanging_top2');
  const storage = computeInteriorPresetOps('storage_shelf');
  assert.equal(storage.rods[0].yFactor, hanging.rods[0].yFactor);
  assert.equal(storage.rods[0].limitFactor, storage.rods[0].yFactor);
});
