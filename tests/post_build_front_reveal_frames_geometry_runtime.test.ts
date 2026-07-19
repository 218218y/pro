import test from 'node:test';
import assert from 'node:assert/strict';

import { createFrontRevealGeometryRuntime } from '../esm/native/builder/post_build_front_reveal_frames_geometry.ts';

class FakeVector3 {
  constructor(
    public x: number,
    public y: number,
    public z: number
  ) {}
}

class FakeBufferGeometry {
  points: FakeVector3[] = [];
  setFromPoints(points: FakeVector3[]) {
    this.points = points;
    return this;
  }
}

class FakeLineSegments {
  name = '';
  frustumCulled = true;
  userData: Record<string, unknown> = {};
  constructor(
    public geometry: FakeBufferGeometry,
    public material: unknown
  ) {}
}

class FakeGroup {
  name = '';
  frustumCulled = true;
  userData: Record<string, unknown> = {};
  children: FakeLineSegments[] = [];
  add(child: FakeLineSegments) {
    this.children.push(child);
  }
}

function createRuntime() {
  return createFrontRevealGeometryRuntime({
    THREE: {
      Vector3: FakeVector3,
      BufferGeometry: FakeBufferGeometry,
      LineSegments: FakeLineSegments,
      Group: FakeGroup,
    } as any,
    baseLineMaterial: { id: 'base' } as any,
    localName: 'front-reveal-local',
  });
}

test('front reveal single-line geometry preserves local XY inset and requested Z', () => {
  const lines = createRuntime().buildRectLines(-0.5, 0.5, -1, 1, 0.02) as FakeLineSegments;

  assert.ok(lines);
  assert.equal(lines.name, 'front-reveal-local');
  assert.equal(lines.frustumCulled, false);
  assert.deepEqual(
    lines.geometry.points.map(point => [point.x, point.y, point.z]),
    [
      [-0.4985, -0.9985, 0.02],
      [0.4985, -0.9985, 0.02],
      [0.4985, -0.9985, 0.02],
      [0.4985, 0.9985, 0.02],
      [0.4985, 0.9985, 0.02],
      [-0.4985, 0.9985, 0.02],
      [-0.4985, 0.9985, 0.02],
      [-0.4985, -0.9985, 0.02],
    ]
  );
});

test('front reveal dual-line geometry preserves outer and inner inset/Z offsets on both faces', () => {
  for (const z of [0.02, -0.02]) {
    const group = createRuntime().buildRectLines(-0.5, 0.5, -1, 1, z, 'dual') as FakeGroup;
    const sign = z >= 0 ? 1 : -1;

    assert.ok(group);
    assert.equal(group.children.length, 2);
    assert.equal(group.children[0].geometry.points[0].x, -0.4985);
    assert.equal(group.children[0].geometry.points[0].z, z + sign * 0.00008);
    assert.equal(group.children[1].geometry.points[0].x, -0.4974);
    assert.equal(group.children[1].geometry.points[0].z, z + sign * 0.00016);
  }
});

test('front reveal geometry keeps the existing collapsed-rectangle no-op behavior', () => {
  assert.equal(createRuntime().buildRectLines(0, 0.002, 0, 0.002, 0.02), null);
});
