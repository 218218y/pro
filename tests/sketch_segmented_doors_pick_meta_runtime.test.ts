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

test('segmented sketch door rebuild retags the full visual subtree with the canonical door part id', () => {
  const doorGroup = new FakeGroup();
  doorGroup.userData = {
    partId: 'd3_full',
    __doorWidth: 0.8,
    __doorHeight: 1.2,
    __doorMeshOffsetX: 0.16,
    __hingeLeft: true,
    __handleAbsY: 0.1,
  };
  doorGroup.position.set(0.25, 1.1, 0);
  doorGroup.add(new FakeMesh({ width: 1, height: 1, depth: 0.02 }, { name: 'legacy' }));

  const runtime = {
    THREE: FakeTHREE,
    bodyMat: { name: 'body' },
    globalFrontMat: { name: 'front' },
    createDoorVisual: () => {
      const root = new FakeGroup();
      root.userData = { partId: 'd3_full__sketch_seg_0' };
      const inner = new FakeMesh({ width: 0.5, height: 0.4, depth: 0.02 }, { name: 'inner' });
      inner.userData = { partId: 'd3_full_accent_left' };
      root.add(inner);
      return root;
    },
    createHandleMesh: null,
    getPartMaterial: () => ({ name: 'resolved' }),
    getMirrorMaterial: null,
    resolveHandleType: () => 'standard',
    resolveCurtain: () => null,
    resolveSpecial: () => null,
    doorStyle: 'profile',
    doorStyleMap: {},
    groovesMap: {},
    resolveMirrorLayout: () => null,
    isDoorRemoved: () => false,
  };

  rebuildSketchSegmentedDoor({
    runtime,
    g: doorGroup,
    ud: doorGroup.userData,
    visibleSegments: [
      { yMin: 0.45, yMax: 0.8 },
      { yMin: 1.0, yMax: 1.55 },
    ],
    fallbackPartId: 'd3_full',
  });

  assert.equal(doorGroup.userData.__wpSketchSegmentedDoor, true);
  assert.equal(doorGroup.children.length, 2);
  const firstSegment = doorGroup.children[0];
  const nestedLeaf = firstSegment.children[0];
  assert.equal(firstSegment.userData.partId, 'd3_bot');
  assert.equal(firstSegment.userData.__wpSketchDoorSegment, true);
  assert.equal(firstSegment.userData.__wpSketchDoorSegmentIndex, 0);
  assert.equal(firstSegment.userData.__doorWidth, 0.796);
  assert.equal(nestedLeaf.userData.partId, 'd3_bot');
  assert.equal(nestedLeaf.userData.__wpSketchDoorSegment, true);
  const secondSegment = doorGroup.children[1];
  assert.equal(secondSegment.userData.partId, 'd3_top');
  assert.equal(secondSegment.userData.__wpSketchDoorSegmentIndex, 1);
});

test('segmented sketch mirror rebuild reuses canonical mirror material path and marks centered leaf metadata for hover', () => {
  const doorGroup = new FakeGroup();
  doorGroup.userData = {
    partId: 'd9_full',
    __doorWidth: 0.82,
    __doorHeight: 1.6,
    __doorMeshOffsetX: 0.19,
    __hingeLeft: true,
  };
  doorGroup.position.set(0.1, 0.8, 0);

  const visualCalls: Array<Record<string, unknown>> = [];
  const runtime = {
    THREE: FakeTHREE,
    bodyMat: { name: 'body' },
    globalFrontMat: { name: 'front' },
    createDoorVisual: (...args: unknown[]) => {
      visualCalls.push({
        material: args[3],
        isMirror: args[6],
        baseMaterial: args[8],
        mirrorLayout: args[11],
        partId: args[12],
      });
      return new FakeGroup();
    },
    createHandleMesh: null,
    getPartMaterial: (partId: string) => ({ name: `mat:${partId}` }),
    getMirrorMaterial: () => ({ name: 'mirror-mat' }),
    resolveHandleType: () => 'standard',
    resolveCurtain: () => null,
    resolveSpecial: () => 'mirror',
    doorStyle: 'flat',
    doorStyleMap: {},
    groovesMap: {},
    resolveMirrorLayout: partId => [{ partId }],
    isDoorRemoved: () => false,
  };

  rebuildSketchSegmentedDoor({
    runtime,
    g: doorGroup,
    ud: doorGroup.userData,
    visibleSegments: [{ yMin: 0, yMax: 0.8 }],
    fallbackPartId: 'd9_full',
  });

  assert.equal(visualCalls.length, 1);
  assert.deepEqual(visualCalls[0], {
    material: { name: 'mirror-mat' },
    isMirror: true,
    baseMaterial: { name: 'mat:d9_full' },
    mirrorLayout: [{ partId: 'd9_full' }],
    partId: 'd9_full',
  });
  assert.equal(doorGroup.children[0].userData.__doorPivotCentered, true);
});

test('segmented sketch door rebuild resolves per-segment style/material/removal using split door part ids', () => {
  const doorGroup = new FakeGroup();
  doorGroup.userData = {
    partId: 'd7_full',
    __doorWidth: 0.9,
    __doorHeight: 1.8,
    __hingeLeft: false,
  };
  doorGroup.position.set(0, 0.9, 0);

  const visualCalls: Array<Record<string, unknown>> = [];
  const runtime = {
    THREE: FakeTHREE,
    bodyMat: { name: 'body' },
    globalFrontMat: { name: 'front' },
    createDoorVisual: (...args: unknown[]) => {
      visualCalls.push({
        partId: args[12],
        style: args[4],
        material: args[3],
      });
      return new FakeGroup();
    },
    createHandleMesh: null,
    getPartMaterial: (partId: string) => ({ name: `mat:${partId}` }),
    getMirrorMaterial: null,
    resolveHandleType: () => 'standard',
    resolveCurtain: () => null,
    resolveSpecial: () => null,
    doorStyle: 'flat',
    doorStyleMap: { d7_top: 'tom', d7_bot: 'profile' },
    groovesMap: {},
    resolveMirrorLayout: () => null,
    isDoorRemoved: (partId: string) => partId === 'd7_top',
  };

  rebuildSketchSegmentedDoor({
    runtime,
    g: doorGroup,
    ud: doorGroup.userData,
    visibleSegments: [
      { yMin: 0, yMax: 0.7 },
      { yMin: 1.1, yMax: 1.8 },
    ],
    fallbackPartId: 'd7_full',
  });

  assert.equal(visualCalls.length, 1);
  assert.deepEqual(visualCalls[0], {
    partId: 'd7_bot',
    style: 'profile',
    material: { name: 'mat:d7_bot' },
  });
  assert.equal(doorGroup.children.length, 2);
  assert.equal(doorGroup.children[0].userData.partId, 'd7_bot');
  assert.equal(doorGroup.children[1].userData.partId, 'd7_top');
  assert.equal(doorGroup.children[1].userData.__wpDoorRemoved, true);
});
