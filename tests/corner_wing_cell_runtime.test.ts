import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCornerWingInteriorCellRuntime,
  getCornerCellInnerFacesX,
} from '../esm/native/builder/corner_wing_cell_interiors_cell.ts';
import { createCornerWingCellCfgResolver } from '../esm/native/builder/corner_wing_extension_cells_config.ts';

function createCornerCell(
  idx: number,
  startX: number,
  width: number,
  overrides: Record<string, unknown> = {}
) {
  return {
    idx,
    key: `corner-cell-${idx}`,
    startX,
    width,
    centerX: startX + width / 2,
    depth: 0.62,
    effectiveBottomY: 0.12,
    effectiveTopY: 2.18,
    gridDivisions: 6,
    localGridStep: 0.34,
    cfg: {},
    __hasActiveSpecialDims: false,
    ...overrides,
  } as any;
}

test('corner wing cell runtime: inner faces use full divider thickness next to active special-dims neighbors', () => {
  const runtime: any = {
    cornerCells: [
      createCornerCell(0, 0.0, 0.46),
      createCornerCell(1, 0.46, 0.48, { __hasActiveSpecialDims: true }),
      createCornerCell(2, 0.94, 0.5),
    ],
    woodThick: 0.018,
    blindWidth: 0.14,
    wingW: 1.44,
    wingD: 0.6,
    startY: 0.1,
  };

  const firstFaces = getCornerCellInnerFacesX(runtime, 0);
  assert.equal(Number(firstFaces.leftX.toFixed(3)), 0.158);
  assert.equal(Number(firstFaces.rightX.toFixed(3)), 0.442);

  const middleRuntime = createCornerWingInteriorCellRuntime(runtime, runtime.cornerCells[1]);
  assert.equal(Number(middleRuntime.cellInnerLeftX.toFixed(3)), 0.478);
  assert.equal(Number(middleRuntime.cellInnerRightX.toFixed(3)), 0.922);
  assert.equal(Number(middleRuntime.cellShelfW.toFixed(3)), 0.439);
  assert.equal(Number(middleRuntime.__regularDepth.toFixed(3)), 0.45);
  assert.equal(Number(middleRuntime.__backFaceZ.toFixed(3)), -0.59);
});

test('corner wing extension-cell config runtime: bottom stack defaults stay shelf-scoped and use lower-cell canonical actions when present', () => {
  const calls: number[] = [];
  const resolver = createCornerWingCellCfgResolver(
    {
      App: {
        actions: {
          modules: {
            ensureLowerCellAt(index: number) {
              calls.push(index);
              return index === 0
                ? {
                    layout: 'hanging_top2',
                    customData: { shelves: [], rods: [true, false], storage: false },
                  }
                : null;
            },
          },
        },
      },
      config: {
        modulesConfiguration: [{}, null],
      },
      __stackSplitEnabled: true,
      __stackKey: 'bottom',
      __mirrorX: 1,
    } as any,
    2
  );

  const first = resolver(0);
  const second = resolver(1);

  assert.deepEqual(calls, [1]);
  assert.equal(first.layout, 'shelves');
  assert.equal(first.isCustom, true);
  assert.deepEqual(first.customData?.shelves, [false, true, false, true, false, false]);
  assert.deepEqual(first.customData?.rods, []);
  assert.equal(first.extDrawersCount, 0);
  assert.equal(first.gridDivisions, 6);

  assert.equal(second.layout, 'shelves');
  assert.equal(second.isCustom, true);
  assert.deepEqual(second.customData?.shelves, [false, true, false, true, false, false]);
  assert.deepEqual(second.customData?.rods, []);
});
