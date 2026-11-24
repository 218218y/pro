import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applySketchBoxExternalDrawerDoorCuts,
  applySketchExternalDrawerDoorCuts,
} from '../esm/native/builder/post_build_sketch_door_cuts.ts';
import { renderBuiltInDesk, resolveBuiltInDesk } from '../esm/native/builder/render_built_in_desk.ts';
import { applyFrontRevealDoorFrames } from '../esm/native/builder/post_build_front_reveal_frames_doors.ts';
import type { DoorArchPoint } from '../types/maps.ts';
import { getDoorsArray, getDrawersArray } from '../esm/native/runtime/render_access.ts';
import { getInternalGridMap } from '../esm/native/runtime/cache_access.ts';
import type { BuiltInDeskHost, BuiltInDeskOptions } from '../types/built_in_desk.ts';

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

const moduleDeskHost: BuiltInDeskHost = {
  moduleKey: 0,
  stack: 'top',
  geometry: { leftX: -0.45, rightX: 0.45, bottomY: 0, topY: 2, backZ: 0, frontZ: 0.6, thickness: 0.018 },
};

function renderDeskForDoorCut(
  App: Record<string, unknown>,
  host: BuiltInDeskHost,
  topNorm = 0.4,
  clearances: Pick<BuiltInDeskOptions, 'doorClearanceAboveCm' | 'doorClearanceBelowCm'> = {}
) {
  const desk = resolveBuiltInDesk(host, {
    lengthCm: 100,
    topNorm,
    drawerCount: 3,
    drawerSide: 'right',
    support: 'wall',
    ...clearances,
  });
  assert.ok(desk);
  renderBuiltInDesk({
    desk,
    createBoard: () => new FakeGroup(),
    material: {},
    drawerBoxMaterial: {},
    addDrawerGroup: () => {},
    motion: { createGroup: () => new FakeGroup() as never, entries: getDrawersArray(App) },
  });
  return desk.plan.verticalRange;
}

test('edited desk clearances and independent arches rebuild the upper and lower fronts together', () => {
  const App: Record<string, unknown> = {};
  const door = createDoorGroup();
  getDoorsArray(App).push({ type: 'hinged', group: door } as any);
  const { bottomY, surfaceY } = renderDeskForDoorCut(App, moduleDeskHost, 0.45, {
    doorClearanceAboveCm: 4,
    doorClearanceBelowCm: 0,
  });
  const shapes = new Map<string, DoorArchPoint[]>();
  const ctx = createCtx();
  applySketchExternalDrawerDoorCuts({
    App: App as any,
    THREE: FakeTHREE as any,
    ctx: {
      ...ctx,
      create: {
        ...ctx.create,
        createDoorVisual(...args: unknown[]) {
          const contour = (args[13] as { cutContour?: DoorArchPoint[] })?.cutContour;
          if (contour?.length) shapes.set(String(args[12]), contour);
          return new FakeGroup();
        },
      },
    } as any,
    cfg: {
      splitDoorsMap: {
        splitarch_desk_d0_bot: [{ peak: 0.75, profile: { start: 0, end: 1, rise: 0.22 } }],
        splitarch_desk_d0_top: [{ peak: 0.6, profile: { start: 0, end: 1, rise: 0.2 } }],
      },
    },
    bodyMat: {},
    globalFrontMat: {},
    stackKey: 'top',
  });
  const segments = door.children.filter(child => child.userData.__wpDeskArchScope);
  assert.deepEqual(
    segments.map(child => child.userData.partId),
    ['d0_bot_bot', 'd0_bot_top', 'd0_top_bot', 'd0_top_top']
  );
  assert.equal(shapes.size, 4);
  const revealContours: DoorArchPoint[][] = [];
  applyFrontRevealDoorFrames({} as any, {
    App: App as any,
    THREE: FakeTHREE as any,
    wardrobeGroup: { traverse() {} } as any,
    localName: 'frontRevealFrames',
    zNudge: 0.001,
    reportSoft() {},
    cleanupStaleLocalFrames() {},
    getRevealZSignOverride: () => null,
    getObjectLocalBounds: () => assert.fail('Curved desk leaves must not use rectangular bounds'),
    pickRevealLineMaterial: () => null,
    buildRectLines: () => assert.fail('Curved desk leaves must not get a rectangular reveal'),
    buildContourLines(points, offset, z) {
      assert.equal(offset, 0);
      assert.ok(Math.abs(z - 0.01) < 1e-9);
      revealContours.push([...points]);
      return new FakeGroup() as never;
    },
    removeLocalFrames() {},
  });
  assert.deepEqual(
    revealContours,
    segments.map(segment => shapes.get(String(segment.userData.partId)))
  );
  const lower = segments[1]!;
  const upper = segments[2]!;
  assert.ok(
    Math.abs(getWorldY(lower) + Number(lower.userData.__wpDoorConstructionHeight) / 2 - bottomY) < 1e-8
  );
  assert.ok(
    Math.abs(getWorldY(upper) - Number(upper.userData.__wpDoorConstructionHeight) / 2 - surfaceY - 0.04) <
      1e-8
  );
});

test('a desk clears 1 cm above and below its body by default and preserves an existing cut', () => {
  const App: Record<string, unknown> = {};
  const full = createDoorGroup();
  const existingUpper = createAuthoredSplitDoorLeaf({
    partId: 'd1_top',
    moduleKey: '0',
    centerY: 1.65,
    height: 0.7,
  });
  const existingLower = createAuthoredSplitDoorLeaf({
    partId: 'd1_bot',
    moduleKey: '0',
    centerY: 0.65,
    height: 1.3,
  });
  const adjacent = createAuthoredSplitDoorLeaf({ partId: 'd2_full', moduleKey: '1', centerY: 1, height: 2 });
  getDoorsArray(App).push(
    ...[full, existingUpper.door, existingLower.door, adjacent.door].map(
      group => ({ type: 'hinged', group }) as any
    )
  );
  const { bottomY, surfaceY } = renderDeskForDoorCut(App, moduleDeskHost);
  applySketchExternalDrawerDoorCuts({
    App: App as any,
    THREE: FakeTHREE as any,
    ctx: { ...createCtx(), layout: { moduleCfgList: [{}, {}] } } as any,
    cfg: { splitDoorsMap: { split_d1: true, splitpos_d1: [0.65] } },
    bodyMat: { name: 'body' },
    globalFrontMat: { name: 'front' },
    stackKey: 'top',
  });

  assert.deepEqual(existingUpper.door.children, [existingUpper.sentinel]);
  assert.deepEqual(adjacent.door.children, [adjacent.sentinel]);
  for (const door of [full, existingLower.door]) {
    const segments = door.children.filter(child => child.userData.__wpSketchDoorSegment === true);
    assert.equal(segments.length, 2);
    const [lower, upper] = segments;
    assert.ok(lower && upper);
    const lowerTop = getWorldY(lower) + Number(lower.userData.__wpDoorConstructionHeight) / 2;
    const upperBottom = getWorldY(upper) - Number(upper.userData.__wpDoorConstructionHeight) / 2;
    assert.ok(Math.abs(bottomY - lowerTop - 0.01) < 1e-12);
    assert.ok(Math.abs(upperBottom - surfaceY - 0.01) < 1e-12);
  }
});

test('a standalone box desk removes the short leaf below its opening', () => {
  const App: Record<string, unknown> = {};
  const cabinetDoor = createDoorGroup();
  const boxDoor = createBoxDoorGroup();
  const sentinel = new FakeGroup();
  cabinetDoor.add(sentinel);
  getDoorsArray(App).push(...[cabinetDoor, boxDoor].map(group => ({ type: 'hinged', group }) as any));
  const { surfaceY } = renderDeskForDoorCut(
    App,
    {
      ...moduleDeskHost,
      boxId: 'box-1',
      boxIsStandalone: true,
      geometry: { ...moduleDeskHost.geometry, bottomY: 0.5, topY: 1.5 },
    },
    0.2
  );
  const cutArgs = {
    App: App as any,
    THREE: FakeTHREE as any,
    ctx: createCtx() as any,
    cfg: {},
    bodyMat: { name: 'body' },
    globalFrontMat: { name: 'front' },
  };
  applySketchExternalDrawerDoorCuts({ ...cutArgs, stackKey: 'top', allowConfigDerivedCuts: false });
  applySketchBoxExternalDrawerDoorCuts(cutArgs);

  assert.deepEqual(cabinetDoor.children, [sentinel]);
  const segments = boxDoor.children.filter(child => child.userData.__wpSketchDoorSegment === true);
  assert.equal(segments.length, 1);
  const upper = segments[0]!;
  const halfHeight = Number(upper.userData.__wpDoorConstructionHeight) / 2;
  assert.ok(Math.abs(getWorldY(upper) - halfHeight - surfaceY - 0.01) < 1e-12);
  assert.ok(Math.abs(getWorldY(upper) + halfHeight - 1.5) < 1e-12);
});

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
