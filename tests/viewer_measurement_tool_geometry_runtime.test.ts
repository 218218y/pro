import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FRONT_Z_EPSILON_M,
  type LocalMeasurementBox,
  type MeasurementPlane,
} from '../esm/native/services/viewer_measurement_tool_contracts.ts';
import {
  clampPointToMeasurementPlane,
  createMeasurementPlaneForBox,
  measurementPlaneAxes,
  pointOnMeasurementPlane,
  snapPointToMeasurementPlaneEdges,
} from '../esm/native/services/viewer_measurement_tool_geometry.ts';

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

const THREE = { Vector3: FakeVector3 } as any;

function assertClose(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} should equal ${expected}`);
}

const box: LocalMeasurementBox = {
  centerX: 0,
  centerY: 1,
  centerZ: 0,
  width: 2,
  height: 1,
  depth: 0.5,
};

test('measurement plane axes map front, side, and top planes consistently', () => {
  assert.deepEqual(measurementPlaneAxes('front'), { normal: 'z', u: 'x', v: 'y' });
  assert.deepEqual(measurementPlaneAxes('side'), { normal: 'x', u: 'z', v: 'y' });
  assert.deepEqual(measurementPlaneAxes('top'), { normal: 'y', u: 'x', v: 'z' });
});

test('createMeasurementPlaneForBox uses the requested normal source without changing measured bounds', () => {
  const normalSource: LocalMeasurementBox = {
    centerX: 5,
    centerY: 0,
    centerZ: 0,
    width: 2,
    height: 1,
    depth: 1,
  };

  const plane = createMeasurementPlaneForBox(box, 'side', -1, normalSource);

  assert.equal(plane.normalAxis, 'x');
  assert.equal(plane.uAxis, 'z');
  assert.equal(plane.vAxis, 'y');
  assertClose(plane.normalValue, 4 - FRONT_Z_EPSILON_M);
  assertClose(plane.uMin, -0.25);
  assertClose(plane.uMax, 0.25);
  assertClose(plane.vMin, 0.5);
  assertClose(plane.vMax, 1.5);
});

test('snapPointToMeasurementPlaneEdges snaps a nearby point to the edge', () => {
  const plane = createMeasurementPlaneForBox(box, 'front', 1);
  const result = snapPointToMeasurementPlaneEdges(THREE, plane, { x: -0.985, y: 1.2, z: 0 });

  assertClose(result.clampedU, -1);
  assertClose(result.clampedV, 1.2);
  assertClose(result.point.x, -1);
  assertClose(result.point.y, 1.2);
  assertClose(result.point.z, 0.25 + FRONT_Z_EPSILON_M);
});

test('snapPointToMeasurementPlaneEdges preserves an interior diagonal outside edge tolerance', () => {
  const plane = createMeasurementPlaneForBox(box, 'front', 1);
  const result = snapPointToMeasurementPlaneEdges(THREE, plane, { x: -0.9, y: 1.2, z: 0 });

  assertClose(result.clampedU, -0.9);
  assertClose(result.clampedV, 1.2);
  assertClose(result.point.x, -0.9);
  assertClose(result.point.y, 1.2);
});

test('clampPointToMeasurementPlane clamps outside points to the plane rectangle', () => {
  const plane = createMeasurementPlaneForBox(box, 'front', 1);
  const result = clampPointToMeasurementPlane(THREE, plane, { x: 1.4, y: 1.8, z: 0 });

  assert.equal(result.outsideU, true);
  assert.equal(result.outsideV, true);
  assertClose(result.clampedU, 1);
  assertClose(result.clampedV, 1.5);
  assertClose(result.outsideDistance, Math.hypot(0.4, 0.3));
  assertClose(result.point.x, 1);
  assertClose(result.point.y, 1.5);
});

test('pointOnMeasurementPlane supports corner-style basis planes', () => {
  const plane: MeasurementPlane = {
    kind: 'front',
    normalAxis: 'z',
    normalSign: 1,
    normalValue: 0.25,
    uAxis: 'x',
    vAxis: 'y',
    uMin: -1,
    uMax: 1,
    vMin: -1,
    vMax: 1,
    uLength: 2,
    vLength: 2,
    basis: {
      center: { x: 10, y: 0, z: 0 },
      u: { x: 0, y: 0, z: 1 },
      v: { x: 0, y: 1, z: 0 },
      normal: { x: 1, y: 0, z: 0 },
      normalMin: -0.25,
      normalMax: 0.25,
    },
  };

  const point = pointOnMeasurementPlane(THREE, box, plane, 0.5, 2, 0.05);

  assertClose(point.x, 10.3);
  assertClose(point.y, 2);
  assertClose(point.z, 0.5);
});
