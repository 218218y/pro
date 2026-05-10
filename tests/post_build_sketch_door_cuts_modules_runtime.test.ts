import test from 'node:test';
import assert from 'node:assert/strict';

import { applySketchExternalDrawerDoorCuts } from '../esm/native/builder/post_build_sketch_door_cuts.ts';
import { getDoorsArray, getDrawersArray } from '../esm/native/runtime/render_access.ts';
import { getInternalGridMap } from '../esm/native/runtime/cache_access.ts';

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
    this.children = this.children.filter(item => item !== child);
    child.parent = null;
  }
}

class FakeGroup extends FakeNode {}

class FakeMesh extends FakeNode {
  geometry: unknown;
  material: unknown;
  constructor(geometry: unknown, material: unknown) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}

const FakeTHREE = {
  Mesh: FakeMesh,
  Group: FakeGroup,
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

function createDoorGroup() {
  const door = new FakeGroup();
  door.position.set(0, 1, 0);
  door.userData = {
    partId: 'd0_full',
    __wpStack: 'top',
    __wpSketchModuleKey: '0',
    __doorWidth: 1,
    __doorHeight: 2,
    __hingeLeft: true,
  };
  return door;
}

function createCtx() {
  return {
    layout: {
      moduleCfgList: [
        {
          sketchExtras: {
            extDrawers: [{ count: 1, yNormC: 0.5 }],
          },
        },
      ],
    },
    create: {
      createDoorVisual() {
        return new FakeGroup();
      },
      createHandleMesh() {
        return null;
      },
    },
    resolvers: {
      getPartMaterial(partId: string) {
        return { partId };
      },
      getHandleType() {
        return 'none';
      },
    },
    strings: { doorStyle: 'flat' },
  };
}

test('module sketch door cuts do not use config-derived cuts when invalid runtime drawer metadata exists', () => {
  const App: Record<string, unknown> = {};
  const doorGroup = createDoorGroup();
  const sentinel = new FakeGroup();
  doorGroup.add(sentinel);
  getDoorsArray(App).push({ type: 'hinged', group: doorGroup } as any);

  const invalidRuntimeDrawer = new FakeGroup();
  invalidRuntimeDrawer.position.set(0, 1, 0);
  invalidRuntimeDrawer.userData = {
    __wpSketchExtDrawer: true,
    __wpSketchModuleKey: '0',
    __wpStack: 'top',
    __doorWidth: 0,
    __doorHeight: 0,
  };
  getDrawersArray(App).push({ group: invalidRuntimeDrawer } as any);
  getInternalGridMap(App).zero = { effectiveBottomY: 0, effectiveTopY: 2 };
  getInternalGridMap(App)['0'] = { effectiveBottomY: 0, effectiveTopY: 2 };

  applySketchExternalDrawerDoorCuts({
    App: App as any,
    THREE: FakeTHREE as any,
    ctx: createCtx() as any,
    cfg: {},
    bodyMat: { name: 'body' },
    globalFrontMat: { name: 'front' },
    stackKey: 'top',
  });

  assert.deepEqual(doorGroup.children, [sentinel]);
  assert.equal(doorGroup.userData.__wpSketchSegmentedDoor, undefined);
});

test('module sketch door cuts still use config-derived cuts when no runtime drawer owner exists', () => {
  const App: Record<string, unknown> = {};
  const doorGroup = createDoorGroup();
  getDoorsArray(App).push({ type: 'hinged', group: doorGroup } as any);
  getInternalGridMap(App)['0'] = { effectiveBottomY: 0, effectiveTopY: 2 };

  applySketchExternalDrawerDoorCuts({
    App: App as any,
    THREE: FakeTHREE as any,
    ctx: createCtx() as any,
    cfg: {},
    bodyMat: { name: 'body' },
    globalFrontMat: { name: 'front' },
    stackKey: 'top',
  });

  assert.equal(doorGroup.userData.__wpSketchSegmentedDoor, true);
  assert.ok(doorGroup.children.length > 0);
});
