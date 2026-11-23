import test from 'node:test';
import assert from 'node:assert/strict';

import * as Three from 'three';
import {
  createMirrorDoorVisual,
  makeArchedMirrorReflectorShape,
} from '../esm/native/builder/visuals_and_contents_door_visual_mirror.ts';

class FakeVector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}

class FakeObject3D {
  constructor() {
    this.children = [];
    this.position = new FakeVector3();
    this.userData = {};
  }
  add(child) {
    this.children.push(child);
    return child;
  }
}

class FakeGroup extends FakeObject3D {}
class FakeMesh extends FakeObject3D {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}
class FakeBoxGeometry {
  constructor(...args) {
    this.type = 'BoxGeometry';
    this.args = args;
  }
}
class FakeMeshStandardMaterial {
  constructor(props = {}) {
    Object.assign(this, props);
  }
}
class FakeMeshBasicMaterial {
  constructor(props = {}) {
    Object.assign(this, props);
  }
}

function createThree() {
  return {
    Group: FakeGroup,
    Mesh: FakeMesh,
    BoxGeometry: FakeBoxGeometry,
    MeshStandardMaterial: FakeMeshStandardMaterial,
    MeshBasicMaterial: FakeMeshBasicMaterial,
    Vector3: FakeVector3,
    DoubleSide: 2,
  };
}

test('mirror door visual keeps a full door slab and mounts the mirror as a proud add-on on the front face', () => {
  const THREE = createThree();
  const visual = createMirrorDoorVisual({
    App: {},
    THREE,
    w: 0.7,
    h: 1.8,
    thickness: 0.02,
    mat: { kind: 'mirror' },
    baseMaterial: { kind: 'wood' },
    zSign: 1,
    isSketch: false,
    mirrorLayout: null,
    addOutlines() {},
  });

  const [woodMesh, mirrorMesh] = visual.children;
  assert.ok(woodMesh);
  assert.ok(mirrorMesh);
  assert.equal(woodMesh.geometry?.type, 'BoxGeometry');
  assert.equal(woodMesh.geometry?.args?.[2], 0.02);
  assert.equal(mirrorMesh.geometry?.type, 'BoxGeometry');

  const mirrorThickness = Number(mirrorMesh.geometry?.args?.[2] || 0);
  const mirrorBackFaceZ = Number(mirrorMesh.position?.z || 0) - mirrorThickness / 2;
  assert.ok(mirrorBackFaceZ > 0.02 / 2, 'mirror should sit in front of the wood face, not be half-recessed');
  assert.equal(mirrorMesh.userData?.faceSign, 1);
  assert.equal(mirrorMesh.userData?.faceSide, 'outside');
});

test('sized mirror placements on the back face keep the same proud add-on depth with negative faceSign', () => {
  const THREE = createThree();
  const visual = createMirrorDoorVisual({
    App: {},
    THREE,
    w: 0.8,
    h: 2,
    thickness: 0.018,
    mat: { kind: 'mirror' },
    baseMaterial: { kind: 'wood' },
    zSign: 1,
    isSketch: false,
    mirrorLayout: [{ widthCm: 40, heightCm: 60, faceSign: -1 }],
    addOutlines() {},
  });

  const mirrorMesh = visual.children[1];
  const mirrorThickness = Number(mirrorMesh.geometry?.args?.[2] || 0);
  const mirrorBackFaceZ = Number(mirrorMesh.position?.z || 0) + mirrorThickness / 2;
  assert.ok(mirrorMesh.geometry?.args?.[0] < 0.8);
  assert.ok(mirrorMesh.geometry?.args?.[1] < 2);
  assert.ok(mirrorBackFaceZ < -(0.018 / 2), 'back-face mirror should also protrude beyond the door slab');
  assert.equal(mirrorMesh.userData?.faceSign, -1);
  assert.equal(mirrorMesh.userData?.faceSide, 'inside');
});

test('an arched mirror reflector has normalized UVs over the full contour on either face', () => {
  const arch = { start: 0, end: 0.5, rise: 0.3 };
  const width = 0.45;
  const height = 1.4;
  const build = side =>
    makeArchedMirrorReflectorShape(Three, width, height, 0.004, arch, side).createPlane(width, height);
  const front = build(1);
  const rear = build(-1);
  const minMax = (attribute, axis) => {
    const values = Array.from({ length: attribute.count }, (_, i) => attribute[axis](i));
    return [Math.min(...values), Math.max(...values)];
  };
  for (const face of [front, rear]) {
    const uv = face.getAttribute('uv');
    for (const axis of ['getX', 'getY']) {
      const [min, max] = minMax(uv, axis);
      assert.ok(Math.abs(min) < 1e-6);
      assert.ok(Math.abs(max - 1) < 1e-6);
    }
  }
  const apexX = geometry => {
    const pos = geometry.getAttribute('position');
    let index = 0;
    for (let i = 1; i < pos.count; i++) if (pos.getY(i) > pos.getY(index)) index = i;
    return pos.getX(index);
  };
  assert.ok(apexX(front) > 0.2);
  assert.ok(apexX(rear) < -0.2);
  front.dispose();
  rear.dispose();
});

test('arched mirror visuals attach a shaped planar reflector over the solid mirror backing', () => {
  const App = {};
  const group = createMirrorDoorVisual({
    App,
    THREE: Three,
    w: 0.7,
    h: 1.8,
    thickness: 0.02,
    mat: new Three.MeshStandardMaterial(),
    baseMaterial: new Three.MeshStandardMaterial(),
    zSign: 1,
    isSketch: false,
    mirrorLayout: [{ widthCm: 55, heightCm: 125, arch: { start: 0, end: 1, rise: 0.22 } }],
    addOutlines() {},
  });
  const mirror = group.children.find(child => child.userData.__wpMirrorSurface);
  assert.ok(mirror);
  assert.equal(mirror.geometry.type, 'ExtrudeGeometry');
  assert.equal(mirror.material.userData.__wpPlanarReflectorBackingMaterial, true);
  const reflector = mirror.children.find(child => child.userData.__wpPlanarReflectorSurface);
  assert.ok(reflector);
  assert.equal(reflector.geometry.type, 'ShapeGeometry');
  assert.ok(reflector.position.z > 0);
  assert.ok(reflector.geometry.getAttribute('position').count > 12);
  mirror.geometry.dispose();
  reflector.geometry.dispose();
  mirror.material.dispose();
  reflector.material.dispose();
  mirror.userData.__wpPlanarReflector.renderTarget.dispose();
});
