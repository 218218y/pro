import test from 'node:test';
import assert from 'node:assert/strict';

import { createBuilderRenderDimensionOps } from '../esm/native/builder/render_dimension_ops.ts';

class FakeVector3 {
  x: number;
  y: number;
  z: number;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

test('render_dimension_ops emits main-run width/height/depth overlays from the focused main owner', () => {
  const calls: any[] = [];
  const ops = createBuilderRenderDimensionOps({ app: () => ({}) as any, ops: () => null });
  const ok = ops.applyDimensions({
    THREE: { Vector3: FakeVector3 },
    addDimensionLine: (...args: unknown[]) => calls.push(args),
    totalW: 2,
    H: 2.2,
    D: 0.6,
    moduleWidthsCm: [60, 70, 70],
    moduleHeightsCm: [220, 240],
    moduleDepthsCm: [55, 60],
    stackSplitActive: true,
  });

  assert.equal(ok, true);
  const labels = calls.map(call => call[3]);
  assert.deepEqual(labels, ['200', '60', '70', '70', '240', '220', '20', '60', '55']);
});

test('render_dimension_ops keeps standalone corner overlays alive when the main wardrobe is absent', () => {
  const calls: any[] = [];
  const ops = createBuilderRenderDimensionOps({ app: () => ({}) as any, ops: () => null });
  const ok = ops.applyDimensions({
    THREE: { Vector3: FakeVector3 },
    addDimensionLine: (...args: unknown[]) => calls.push(args),
    totalW: 1.8,
    H: 2.4,
    D: 0.6,
    isCornerMode: true,
    noMainWardrobe: true,
    cornerSide: 'right',
    cornerConnectorEnabled: true,
    cornerDoorCount: 2,
    cornerWallLenM: 0.9,
    cornerWingLenM: 1.2,
    cornerWingHeightM: 2.1,
    cornerWingDepthM: 0.4,
  });

  assert.equal(ok, true);
  const labels = calls.map(call => call[3]);
  assert.deepEqual(labels, ['270', '120', '210', '60', '240', '40', '210']);
});
