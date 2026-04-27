import test from 'node:test';
import assert from 'node:assert/strict';

import { createMirrorDoorVisual } from '../esm/native/builder/visuals_and_contents_door_visual_mirror.ts';

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
});
