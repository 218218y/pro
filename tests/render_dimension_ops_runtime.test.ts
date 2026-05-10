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

test('render_dimension_ops keeps only no-main corner depth outside the pentagon on the main side', () => {
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
  assert.deepEqual(labels, ['60', '270', '120', '210', '40', '210']);

  const mainHeight = calls.find(call => call[3] === '240');
  const mainDepth = calls.find(call => call[3] === '60');
  assert.equal(
    mainHeight,
    undefined,
    'main-side height should stay hidden when the main wardrobe has 0 doors'
  );
  assert.ok(mainDepth, 'expected main-side depth dimension to remain visible');
  assert.ok(Math.abs(mainDepth[0].x + 1.14) < 0.000001);
});

test('render_dimension_ops suppresses no-main dimensions when there is no corner connector context', () => {
  const calls: any[] = [];
  const ops = createBuilderRenderDimensionOps({ app: () => ({}) as any, ops: () => null });
  const ok = ops.applyDimensions({
    THREE: { Vector3: FakeVector3 },
    addDimensionLine: (...args: unknown[]) => calls.push(args),
    totalW: 1.8,
    H: 2.4,
    D: 0.6,
    noMainWardrobe: true,
  });

  assert.equal(ok, true);
  assert.deepEqual(calls, []);
});

test('render_dimension_ops uses the pentagon-only side guide when the corner wing has 0 doors', () => {
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
    cornerDoorCount: 0,
    cornerWallLenM: 0.9,
    cornerWingLenM: 1.2,
    cornerWingHeightM: 2.1,
    cornerWingDepthM: 0.4,
  });

  assert.equal(ok, true);
  const labels = calls.map(call => call[3]);
  assert.deepEqual(labels, ['60', '270', '90', '40', '210']);
  assert.equal(
    calls.filter(call => call[3] === '120').length,
    0,
    'corner wing-only width must stay hidden when corner door count is 0'
  );
  assert.ok(
    calls.some(call => call[3] === '90' && call[4] === 0.78),
    'expected blue pentagon-only side guide width'
  );

  const depth = calls.find(call => call[3] === '40');
  const height = calls.find(call => call[3] === '210' && call[4] === 1);
  assert.ok(depth, 'expected corner-side pentagon depth dimension');
  assert.ok(height, 'expected corner-side pentagon height dimension');
  assert.ok(Math.abs(depth[0].z - 0.6) < 0.000001);
  assert.ok(Math.abs(depth[1].z - 0.6) < 0.000001);
  assert.ok(Math.abs(height[0].z - 0.6) < 0.000001);
  assert.ok(Math.abs(height[1].z - 0.6) < 0.000001);
});

test('render_dimension_ops keeps the pentagon-only side guide when zero corner doors have zero width', () => {
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
    cornerDoorCount: 0,
    cornerWallLenM: 0.9,
    cornerWingLenM: 0,
    cornerWingHeightM: 2.1,
    cornerWingDepthM: 0.4,
  });

  assert.equal(ok, true);
  const labels = calls.map(call => call[3]);
  assert.deepEqual(labels, ['60', '270', '90', '40', '210']);
  assert.equal(
    calls.filter(call => call[3] === '120' && call[4] === 1).length,
    0,
    'corner wing-only width must stay hidden when corner door count is 0'
  );
  assert.ok(
    calls.some(call => call[3] === '90' && call[4] === 0.78),
    'expected connector side guide to measure the pentagon only'
  );
});
