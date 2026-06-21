import test from 'node:test';
import assert from 'node:assert/strict';

import { derivePostBuildDimensionMetrics } from '../esm/native/builder/post_build_dimensions_module_metrics.ts';
import { appendStackSplitDimensionLines } from '../esm/native/builder/post_build_dimensions_stack_split.ts';
import { readPostBuildCornerDimensions } from '../esm/native/builder/post_build_dimensions_corner.ts';

test('post-build corner dimensions use only the captured UI snapshot with canonical precedence', () => {
  const dimensions = readPostBuildCornerDimensions({
    uiSnapshot: {
      cornerSide: 'left',
      cornerDoors: '3',
      cornerWidth: '150',
      cornerHeight: 240,
      cornerDepth: 70,
      cornerCabinetWallLenCm: 125,
      cornerCabinetOffsetXcm: 8,
      cornerCabinetOffsetZcm: -4,
      raw: {
        cornerConnectorEnabled: false,
        cornerWidth: 999,
      },
    },
    dimH: 2.1,
    dimD: 0.6,
  });

  assert.equal(dimensions.cornerSide, 'left');
  assert.equal(dimensions.cornerDoorCount, 3);
  assert.equal(dimensions.cornerConnectorEnabled, false);
  assert.equal(dimensions.cornerWingLenM, 1.5);
  assert.equal(dimensions.cornerWingHeightM, 2.4);
  assert.equal(dimensions.cornerWingDepthM, 0.7);
  assert.equal(dimensions.cornerWallLenM, 1.25);
  assert.equal(dimensions.cornerOffsetXM, -0.08);
  assert.equal(dimensions.cornerOffsetZM, -0.04);
});

test('post-build dimension metrics preserve fixed width overrides and add stack-split depth helper coverage', () => {
  const metrics = derivePostBuildDimensionMetrics({
    ctx: {
      dims: {
        heightCm: 240,
        depthCm: 62,
        defaultH: 2.1,
        defaultD: 0.58,
      },
      layout: {
        modules: [{ doors: 1 }, { doors: 2 }],
        moduleCfgList: [
          { specialDims: { widthCm: 80, baseWidthCm: 60 } },
          { specialDims: { depthCm: 65, baseDepthCm: 58 } },
        ],
      },
    },
    App: {},
    H: 2.1,
    D: 0.58,
    totalW: 1.4,
    stackSplitActive: true,
    splitBottomHeightCm: 90,
    splitBottomDepthCm: 70,
  });

  assert.deepEqual(
    metrics.moduleWidthsCm?.map(value => Math.round(value)),
    [80, 60]
  );
  assert.deepEqual(
    metrics.moduleDepthsCm?.map(value => Math.round(value)),
    [58, 65, 58, 70]
  );
  assert.equal(metrics.moduleDepthsAllManual, false);
  assert.equal(metrics.dimH, 2.4);
  assert.equal(metrics.dimD, 0.7);
});

test('stack-split helper appends two dimension lines on the free side of right-corner wardrobes', () => {
  class Vector3 {
    constructor(
      public x = 0,
      public y = 0,
      public z = 0
    ) {}
  }

  const calls: Array<{ from: Vector3; to: Vector3; text: string }> = [];
  appendStackSplitDimensionLines({
    App: {},
    THREE: { Vector3 },
    addDimensionLine(from: Vector3, to: Vector3, _offset: Vector3, text: string) {
      calls.push({ from, to, text });
    },
    stackSplitActive: true,
    splitBottomHeightCm: 90,
    dimH: 2.4,
    totalW: 1.4,
    isCornerMode: true,
    cornerSide: 'right',
    stackKey: 'top',
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.text, '90');
  assert.equal(calls[1]?.text, '150');
  assert.ok(calls[0]!.from.x < 0);
  assert.ok(calls[0]!.to.y < calls[1]!.to.y);
});
