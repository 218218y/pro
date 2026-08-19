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

function createAuthoredSplitDoorLeaf(args: {
  partId: string;
  moduleKey: string;
  centerY: number;
  height: number;
}) {
  const door = new FakeGroup();
  door.position.set(0, args.centerY, 0);
  door.userData = {
    partId: args.partId,
    moduleIndex: args.moduleKey,
    __wpStack: 'top',
    __wpSketchModuleKey: args.moduleKey,
    __doorWidth: 1,
    __doorHeight: args.height,
    __hingeLeft: true,
  };
  const sentinel = new FakeGroup();
  door.add(sentinel);
  return { door, sentinel };
}

function createBoxDoorGroup() {
  const door = new FakeGroup();
  door.position.set(0, 1, 0);
  door.userData = {
    partId: 'box_1_door',
    __wpStack: 'top',
    __wpSketchModuleKey: '0',
    __wpSketchBoxId: 'box-1',
    __wpSketchBoxDoor: true,
    __doorWidth: 0.7,
    __doorHeight: 1,
    __hingeLeft: true,
  };
  return door;
}

function createBoxExternalDrawerGroup() {
  const drawer = new FakeGroup();
  drawer.position.set(0, 0.95, 0);
  drawer.userData = {
    partId: 'box_1_ext_drawer_1',
    __wpSketchExtDrawer: true,
    __wpSketchExtDrawerId: 'box-drawer-stack',
    __wpSketchModuleKey: '0',
    __wpSketchBoxId: 'box-1',
    __wpStack: 'top',
    __doorWidth: 0.7,
    __doorHeight: 0.3,
    __wpFaceMinY: 0.8,
    __wpFaceMaxY: 1.1,
  };
  return drawer;
}

function createModuleExternalDrawerGroup(args: { yMin: number; yMax: number; drawerId: string }) {
  const drawer = new FakeGroup();
  drawer.position.set(0, (args.yMin + args.yMax) / 2, 0);
  drawer.userData = {
    partId: `sketch_ext_drawers_0_${args.drawerId}`,
    __wpSketchExtDrawer: true,
    __wpSketchExtDrawerId: args.drawerId,
    __wpSketchModuleKey: '0',
    __wpStack: 'top',
    __doorWidth: 1,
    __doorHeight: args.yMax - args.yMin,
    __wpFaceMinY: args.yMin,
    __wpFaceMaxY: args.yMax,
  };
  return drawer;
}

function getWorldY(node: FakeNode): number {
  let y = 0;
  let current: FakeNode | null = node;
  while (current) {
    y += current.position.y;
    current = current.parent;
  }
  return y;
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

test('module sketch door-cut pass does not recursively re-split regular hinged leaves from the split map alone', () => {
  const App: Record<string, unknown> = {};
  const bottom = createAuthoredSplitDoorLeaf({
    partId: 'd0_bot',
    moduleKey: '0',
    centerY: 0.5,
    height: 1,
  });
  const top = createAuthoredSplitDoorLeaf({
    partId: 'd0_top',
    moduleKey: '0',
    centerY: 1.5,
    height: 1,
  });
  getDoorsArray(App).push(
    { type: 'hinged', group: bottom.door } as any,
    { type: 'hinged', group: top.door } as any
  );

  applySketchExternalDrawerDoorCuts({
    App: App as any,
    THREE: FakeTHREE as any,
    ctx: { ...createCtx(), layout: { moduleCfgList: [{}] } } as any,
    cfg: {
      splitDoorsMap: {
        split_d0: true,
        splitpos_d0: [0.5],
      },
    },
    bodyMat: { name: 'body' },
    globalFrontMat: { name: 'front' },
    stackKey: 'top',
    allowConfigDerivedCuts: false,
  });

  assert.deepEqual(bottom.door.children, [bottom.sentinel]);
  assert.deepEqual(top.door.children, [top.sentinel]);
  assert.equal(bottom.door.userData.__wpSketchSegmentedDoor, undefined);
  assert.equal(top.door.userData.__wpSketchSegmentedDoor, undefined);
});

test('module sketch drawer pass does not recursively split unrelated module leaves when another module owns drawer cuts', () => {
  const App: Record<string, unknown> = {};
  const drawerOwnedDoor = createDoorGroup();
  const bottom = createAuthoredSplitDoorLeaf({
    partId: 'd1_bot',
    moduleKey: '1',
    centerY: 0.5,
    height: 1,
  });
  const top = createAuthoredSplitDoorLeaf({
    partId: 'd1_top',
    moduleKey: '1',
    centerY: 1.5,
    height: 1,
  });
  getDoorsArray(App).push(
    { type: 'hinged', group: drawerOwnedDoor } as any,
    { type: 'hinged', group: bottom.door } as any,
    { type: 'hinged', group: top.door } as any
  );
  getDrawersArray(App).push({
    group: createModuleExternalDrawerGroup({ yMin: 0.8, yMax: 1.2, drawerId: 'middle-stack' }),
  } as any);

  applySketchExternalDrawerDoorCuts({
    App: App as any,
    THREE: FakeTHREE as any,
    ctx: {
      ...createCtx(),
      layout: {
        moduleCfgList: [{ sketchExtras: { extDrawers: [{ count: 1, yNormC: 0.5 }] } }, {}],
      },
    } as any,
    cfg: {
      splitDoorsMap: {
        split_d1: true,
        splitpos_d1: [0.5],
      },
    },
    bodyMat: { name: 'body' },
    globalFrontMat: { name: 'front' },
    stackKey: 'top',
    allowConfigDerivedCuts: false,
  });

  assert.equal(drawerOwnedDoor.userData.__wpSketchSegmentedDoor, true);
  assert.deepEqual(bottom.door.children, [bottom.sentinel]);
  assert.deepEqual(top.door.children, [top.sentinel]);
  assert.equal(bottom.door.userData.__wpSketchSegmentedDoor, undefined);
  assert.equal(top.door.userData.__wpSketchSegmentedDoor, undefined);
});

test('deferred full module door can replay manual split positions without recursively owning regular split leaves', () => {
  const App: Record<string, unknown> = {};
  const doorGroup = createDoorGroup();
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

  applySketchExternalDrawerDoorCuts({
    App: App as any,
    THREE: FakeTHREE as any,
    ctx: createCtx() as any,
    cfg: {
      splitDoorsMap: {
        split_d0: true,
        splitpos_d0: [0.5],
      },
    },
    bodyMat: { name: 'body' },
    globalFrontMat: { name: 'front' },
    stackKey: 'top',
    allowConfigDerivedCuts: false,
  });

  const segments = doorGroup.children.filter(child => child.userData?.__wpSketchDoorSegment === true);
  assert.equal(doorGroup.userData.__wpSketchSegmentedDoor, true);
  assert.equal(segments.length, 2);
});

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

test('module sketch door cuts use box external drawer bounds for cabinet doors without cutting box doors', () => {
  const App: Record<string, unknown> = {};
  const cabinetDoorGroup = createDoorGroup();
  const cabinetSentinel = new FakeGroup();
  cabinetDoorGroup.add(cabinetSentinel);
  const boxDoorGroup = createBoxDoorGroup();
  const boxSentinel = new FakeGroup();
  boxDoorGroup.add(boxSentinel);

  getDoorsArray(App).push(
    { type: 'hinged', group: cabinetDoorGroup } as any,
    { type: 'hinged', group: boxDoorGroup } as any
  );
  getDrawersArray(App).push({ group: createBoxExternalDrawerGroup() } as any);

  applySketchExternalDrawerDoorCuts({
    App: App as any,
    THREE: FakeTHREE as any,
    ctx: createCtx() as any,
    cfg: {},
    bodyMat: { name: 'body' },
    globalFrontMat: { name: 'front' },
    stackKey: 'top',
    allowConfigDerivedCuts: false,
  });

  assert.equal(cabinetDoorGroup.userData.__wpSketchSegmentedDoor, true);
  assert.notDeepEqual(cabinetDoorGroup.children, [cabinetSentinel]);
  assert.equal(boxDoorGroup.userData.__wpSketchSegmentedDoor, undefined);
  assert.deepEqual(boxDoorGroup.children, [boxSentinel]);
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

test('module sketch drawer door cuts replay fixed standard split positions against the surviving door above bottom drawers', () => {
  const App: Record<string, unknown> = {};
  const doorGroup = createDoorGroup();
  getDoorsArray(App).push({ type: 'hinged', group: doorGroup } as any);
  getDrawersArray(App).push({
    group: createModuleExternalDrawerGroup({ yMin: 0, yMax: 0.4, drawerId: 'bottom-stack' }),
  } as any);

  applySketchExternalDrawerDoorCuts({
    App: App as any,
    THREE: FakeTHREE as any,
    ctx: createCtx() as any,
    cfg: {
      splitDoorsMap: {
        split_d0: true,
        splitstdpos_d0: [0.25],
      },
    },
    bodyMat: { name: 'body' },
    globalFrontMat: { name: 'front' },
    stackKey: 'top',
    allowConfigDerivedCuts: false,
  });

  const segments = doorGroup.children.filter(child => child.userData?.__wpSketchDoorSegment === true);
  assert.equal(doorGroup.userData.__wpSketchSegmentedDoor, true);
  assert.equal(segments.length, 2);
  const bounds = segments
    .map(child => {
      const h = Number(child.userData.__doorHeight || 0);
      const y = getWorldY(child);
      return { minY: y - h / 2, maxY: y + h / 2 };
    })
    .sort((a, b) => a.minY - b.minY);
  assert.ok(bounds[0].minY > 0.4, `visible door should start above the drawer cut, got ${bounds[0].minY}`);
  assert.ok(
    bounds[0].maxY > 0.79 && bounds[0].maxY < 0.82,
    `split should use the surviving-door quarter, got ${bounds[0].maxY}`
  );
});

test('module sketch drawer door cuts combine middle drawer gaps with lower and upper manual split positions', () => {
  const App: Record<string, unknown> = {};
  const doorGroup = createDoorGroup();
  getDoorsArray(App).push({ type: 'hinged', group: doorGroup } as any);
  getDrawersArray(App).push({
    group: createModuleExternalDrawerGroup({ yMin: 0.8, yMax: 1.2, drawerId: 'middle-stack' }),
  } as any);

  applySketchExternalDrawerDoorCuts({
    App: App as any,
    THREE: FakeTHREE as any,
    ctx: createCtx() as any,
    cfg: {
      splitDoorsMap: {
        split_d0: true,
        splitpos_d0: [0.2, 0.8],
      },
    },
    bodyMat: { name: 'body' },
    globalFrontMat: { name: 'front' },
    stackKey: 'top',
    allowConfigDerivedCuts: false,
  });

  const segments = doorGroup.children.filter(child => child.userData?.__wpSketchDoorSegment === true);
  assert.equal(segments.length, 4);
  const bounds = segments
    .map(child => {
      const h = Number(child.userData.__doorHeight || 0);
      const y = getWorldY(child);
      return { minY: y - h / 2, maxY: y + h / 2 };
    })
    .sort((a, b) => a.minY - b.minY);

  assert.ok(
    bounds[0].maxY < 0.41,
    `lower split should remain below the middle drawers, got ${bounds[0].maxY}`
  );
  assert.ok(
    bounds[1].maxY < 0.8,
    `lower surviving leaf must stop before the drawer gap, got ${bounds[1].maxY}`
  );
  assert.ok(
    bounds[2].minY > 1.2,
    `upper surviving leaf must start after the drawer gap, got ${bounds[2].minY}`
  );
  assert.ok(
    bounds[2].maxY < 1.61,
    `upper split should remain above the middle drawers, got ${bounds[2].maxY}`
  );
});

test('module sketch drawer door cuts replay fixed standard split positions against the surviving door below top drawers', () => {
  const App: Record<string, unknown> = {};
  const doorGroup = createDoorGroup();
  getDoorsArray(App).push({ type: 'hinged', group: doorGroup } as any);
  getDrawersArray(App).push({
    group: createModuleExternalDrawerGroup({ yMin: 1.6, yMax: 2, drawerId: 'top-stack' }),
  } as any);

  applySketchExternalDrawerDoorCuts({
    App: App as any,
    THREE: FakeTHREE as any,
    ctx: createCtx() as any,
    cfg: {
      splitDoorsMap: {
        split_d0: true,
        splitstdpos_d0: [2 / 3],
      },
    },
    bodyMat: { name: 'body' },
    globalFrontMat: { name: 'front' },
    stackKey: 'top',
    allowConfigDerivedCuts: false,
  });

  const segments = doorGroup.children.filter(child => child.userData?.__wpSketchDoorSegment === true);
  assert.equal(doorGroup.userData.__wpSketchSegmentedDoor, true);
  assert.equal(segments.length, 2);
  const bounds = segments
    .map(child => {
      const h = Number(child.userData.__doorHeight || 0);
      const y = getWorldY(child);
      return { minY: y - h / 2, maxY: y + h / 2 };
    })
    .sort((a, b) => a.minY - b.minY);
  assert.ok(bounds[1].maxY < 1.6, `visible door should stop below the drawer cut, got ${bounds[1].maxY}`);
  assert.ok(
    bounds[0].maxY > 1.05 && bounds[0].maxY < 1.08,
    `split should use the surviving-door upper slot, got ${bounds[0].maxY}`
  );
});
