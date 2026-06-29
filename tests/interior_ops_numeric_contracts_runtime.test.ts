import test from 'node:test';
import assert from 'node:assert/strict';

import { computeInteriorCustomOps } from '../esm/native/builder/core_storage_compute.js';
import {
  applyCustomInteriorGridLayout,
  applyCustomStorageBarrier,
} from '../esm/native/builder/render_interior_custom_ops_layout.ts';
import {
  buildShelfIndexSet,
  readGridDivisions,
} from '../esm/native/builder/render_interior_custom_ops_shared.ts';
import {
  buildBraceShelfIndexSet,
  readPresetNumber,
} from '../esm/native/builder/render_interior_preset_ops_shared.ts';

test('interior custom op producer no longer coerces numeric strings', () => {
  const defaultGridOps = computeInteriorCustomOps(
    {
      shelves: [true, true, true, true, true],
      rods: [],
      storage: false,
    },
    '3'
  );
  assert.deepEqual(defaultGridOps.shelves, [1, 2, 3, 4, 5]);

  const explicitRodOps = computeInteriorCustomOps(
    {
      shelves: [],
      rods: [],
      rodOps: [
        { gridIndex: 2, yFactor: '2.3', limitFactor: '1.2', limitAdd: 0 },
        { gridIndex: 3, yFactor: 3.2, yAdd: '0.1', limitFactor: 1.2, limitAdd: '0' },
      ],
      storage: false,
    },
    6
  );

  assert.equal(explicitRodOps.rods.length, 1);
  assert.deepEqual(
    explicitRodOps.rods.map(rod => ({
      gridIndex: rod.gridIndex,
      yFactor: rod.yFactor,
      yAdd: rod.yAdd,
      limitFactor: rod.limitFactor,
      limitAdd: rod.limitAdd,
    })),
    [{ gridIndex: 3, yFactor: 3.2, yAdd: undefined, limitFactor: 1.2, limitAdd: undefined }]
  );
});

test('interior custom render ops reject string encoded shelf and rod numbers', () => {
  assert.equal(readGridDivisions('4', 6), 6);
  assert.equal(readGridDivisions(4, 6), 4);
  assert.deepEqual(Object.keys(buildShelfIndexSet({ shelves: ['2', 3] })), ['3']);

  const calls: Array<{ y: number; limit: number | null }> = [];
  applyCustomInteriorGridLayout({
    gridDivisions: 6,
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    localGridStep: 0.4,
    shelfSet: {},
    shelfVariantByIndex: {},
    addGridShelf: () => undefined,
    createRod: (y, _enableHangingClothes, _enableSingleHanger, limit) => {
      calls.push({ y, limit });
      return null;
    },
    rodMap: {
      2: {
        gridIndex: 2,
        yFactor: '2.3',
        yAdd: '0.1',
        limitFactor: '1.2',
        limitAdd: '0',
        enableHangingClothes: true,
        enableSingleHanger: true,
      },
    },
  });

  assert.deepEqual(calls, [{ y: 0.8, limit: null }]);
});

test('interior storage barrier and preset helpers keep render-op numbers strict', () => {
  const boards: Array<{ h: number; z: number }> = [];
  applyCustomStorageBarrier({
    input: {},
    ops: { storageBarrier: { barrierH: '0.22', zFrontOffset: '-0.04' } },
    createBoard: (_w, h, _d, _x, _y, z) => {
      boards.push({ h, z });
      return null;
    },
    bodyMat: null,
    moduleKey: '0',
    innerW: 1,
    woodThick: 0.018,
    internalCenterX: 0,
    effectiveBottomY: 0,
    D: 0.6,
  });
  assert.deepEqual(boards, []);

  assert.equal(readPresetNumber('0.5', 7), 7);
  assert.equal(readPresetNumber(0.5, 7), 0.5);
  assert.deepEqual(Object.keys(buildBraceShelfIndexSet({ braceShelves: ['2', 4] })), ['4']);
});
