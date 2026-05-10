import test from 'node:test';
import assert from 'node:assert/strict';

import { rebuildSketchSegmentedDoor } from '../esm/native/builder/post_build_sketch_door_cuts_shared.ts';

class FakeVector3 {
  x: number;
  y: number;
  z: number;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

class FakeNode {
  parent: FakeNode | null = null;
  children: FakeNode[] = [];
  userData: Record<string, unknown> = {};
  position = new FakeVector3();
  rotation = new FakeVector3();
  add(child: FakeNode) {
    child.parent = this;
    this.children.push(child);
  }
  remove(child: FakeNode) {
    this.children = this.children.filter(it => it !== child);
    child.parent = null;
  }
}

class FakeMesh extends FakeNode {
  geometry: { width: number; height: number; depth: number };
  material: unknown;
  constructor(geometry: { width: number; height: number; depth: number }, material: unknown) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}

class FakeGroup extends FakeNode {}

const FakeTHREE = {
  Group: FakeGroup,
  Mesh: FakeMesh,
  MeshBasicMaterial: class FakeMeshBasicMaterial {
    args: Record<string, unknown>;
    constructor(args: Record<string, unknown>) {
      this.args = args;
    }
  },
  DoubleSide: 2,
  BoxGeometry: class FakeBoxGeometry {
    width: number;
    height: number;
    depth: number;
    constructor(width: number, height: number, depth: number) {
      this.width = width;
      this.height = height;
      this.depth = depth;
    }
  },
};

function createBaseRuntime(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    THREE: FakeTHREE,
    bodyMat: { name: 'body' },
    globalFrontMat: { name: 'front' },
    createDoorVisual: () => new FakeGroup(),
    createHandleMesh: () => new FakeGroup(),
    getPartMaterial: (partId: string) => ({ name: `mat:${partId}` }),
    getMirrorMaterial: null,
    resolveHandleType: () => 'standard',
    resolveCurtain: () => null,
    resolveSpecial: () => null,
    doorStyle: 'flat',
    doorStyleMap: {},
    groovesMap: {},
    resolveMirrorLayout: () => null,
    isDoorRemoved: () => false,
    ...overrides,
  };
}

test('segmented sketch door rebuild clamps handle placement per segment and tags handle part ids', () => {
  const doorGroup = new FakeGroup();
  doorGroup.userData = {
    partId: 'd12_full',
    __doorWidth: 0.9,
    __doorHeight: 1.2,
    __hingeLeft: true,
    __handleAbsY: -10,
  };
  doorGroup.position.set(0, 0.6, 0);

  rebuildSketchSegmentedDoor({
    runtime: createBaseRuntime(),
    g: doorGroup,
    ud: doorGroup.userData,
    visibleSegments: [
      { yMin: 0, yMax: 0.5 },
      { yMin: 0.7, yMax: 1.2 },
    ],
    basePartId: 'd12_full',
  });

  assert.equal(doorGroup.children.length, 4);
  const firstSegmentHandle = doorGroup.children[1];
  const secondSegmentHandle = doorGroup.children[3];
  assert.equal(firstSegmentHandle.userData.partId, 'd12_bot');
  assert.equal(secondSegmentHandle.userData.partId, 'd12_top');
  assert.ok(Math.abs(firstSegmentHandle.position.y - -0.5008) < 1e-6);
  assert.ok(Math.abs(secondSegmentHandle.position.y - 0.1992) < 1e-6);
});

test('segmented sketch door rebuild keeps canonical segment ids for 4-way splits and removed restore targets', () => {
  const doorGroup = new FakeGroup();
  doorGroup.userData = {
    partId: 'd15_full',
    __doorWidth: 1,
    __doorHeight: 2.4,
    __hingeLeft: false,
  };
  doorGroup.position.set(0, 1.2, 0);

  rebuildSketchSegmentedDoor({
    runtime: createBaseRuntime({ isDoorRemoved: (partId: string) => partId === 'd15_mid2' }),
    g: doorGroup,
    ud: doorGroup.userData,
    visibleSegments: [
      { yMin: 0, yMax: 0.4 },
      { yMin: 0.6, yMax: 1.0 },
      { yMin: 1.2, yMax: 1.6 },
      { yMin: 1.8, yMax: 2.2 },
    ],
    basePartId: 'd15_full',
  });

  assert.equal(doorGroup.children.length, 7);
  const segmentLeaves = doorGroup.children.filter(child => child.userData.__wpSketchDoorLeaf === true);
  assert.deepEqual(
    segmentLeaves.map(child => child.userData.partId),
    ['d15_bot', 'd15_mid1', 'd15_mid2', 'd15_top']
  );
  assert.equal(segmentLeaves[2].userData.__wpDoorRemoved, true);
  assert.equal(segmentLeaves[2].userData.__wpSketchDoorSegmentIndex, 2);
  assert.equal(segmentLeaves[2].userData.__wpSketchDoorSegmentPartId, undefined);
});

test('segmented sketch door rebuild disposes detached non-cached subtree resources before replacing segments', () => {
  const disposed = {
    geometry: 0,
    material: 0,
    texture: 0,
    cachedGeometry: 0,
    cachedMaterial: 0,
    cachedTexture: 0,
  };
  const doorGroup = new FakeGroup();
  doorGroup.userData = {
    partId: 'd31_full',
    __doorWidth: 0.9,
    __doorHeight: 1.4,
    __hingeLeft: true,
  };
  doorGroup.position.set(0, 0.7, 0);

  const runtime = createBaseRuntime({
    createHandleMesh: null,
    resolveHandleType: () => 'none',
    createDoorVisual: () => {
      const root = new FakeGroup();
      const texture = { dispose: () => (disposed.texture += 1) };
      const material = { map: texture, dispose: () => (disposed.material += 1) };
      const geometry = { dispose: () => (disposed.geometry += 1) };
      root.add(new FakeMesh(geometry as never, material));

      const cachedTexture = { userData: { isCached: true }, dispose: () => (disposed.cachedTexture += 1) };
      const cachedMaterial = {
        userData: { isCached: true },
        map: cachedTexture,
        dispose: () => (disposed.cachedMaterial += 1),
      };
      const cachedGeometry = { userData: { isCached: true }, dispose: () => (disposed.cachedGeometry += 1) };
      root.add(new FakeMesh(cachedGeometry as never, cachedMaterial));
      return root;
    },
  });

  rebuildSketchSegmentedDoor({
    runtime,
    g: doorGroup,
    ud: doorGroup.userData,
    visibleSegments: [{ yMin: 0, yMax: 1.4 }],
    basePartId: 'd31_full',
  });
  assert.equal(doorGroup.children.length, 1);

  rebuildSketchSegmentedDoor({
    runtime,
    g: doorGroup,
    ud: doorGroup.userData,
    visibleSegments: [{ yMin: 0, yMax: 1.4 }],
    basePartId: 'd31_full',
  });

  assert.equal(disposed.geometry, 1);
  assert.equal(disposed.material, 1);
  assert.equal(disposed.texture, 1);
  assert.equal(disposed.cachedGeometry, 0);
  assert.equal(disposed.cachedMaterial, 0);
  assert.equal(disposed.cachedTexture, 0);
  assert.equal(doorGroup.children.length, 1);
});
