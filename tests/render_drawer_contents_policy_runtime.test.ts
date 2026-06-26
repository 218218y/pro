import test from 'node:test';
import assert from 'node:assert/strict';

import { createBuilderRenderDrawerOps } from '../esm/native/builder/render_drawer_ops.ts';

class FakeVector3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0
  ) {}

  set(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(value: FakeVector3) {
    this.x = value.x;
    this.y = value.y;
    this.z = value.z;
    return this;
  }
}

class FakeGroup {
  children: unknown[] = [];
  position = new FakeVector3();
  userData: Record<string, unknown> = {};

  add(value: unknown) {
    this.children.push(value);
  }
}

class FakeMesh extends FakeGroup {
  constructor(
    public geometry?: unknown,
    public material?: unknown
  ) {
    super();
  }
}

class FakeBoxGeometry {}

test('internal drawer contents receive the explicit build render policy', () => {
  const wardrobeGroup = new FakeGroup();
  const drawers: unknown[] = [];
  const foldedCalls: unknown[][] = [];
  const outlined: unknown[] = [];
  const addOutlines = (mesh: unknown) => outlined.push(mesh);
  const renderDrawerOps = createBuilderRenderDrawerOps({
    __app: input => (input as { App: never }).App,
    __ops: () => undefined,
    __wardrobeGroup: () => wardrobeGroup as never,
    __reg: () => undefined,
    __drawers: () => drawers as never[],
    getMirrorMaterial: () => null,
  });

  const result = renderDrawerOps.applyInternalDrawersOps({
    App: {},
    THREE: {
      Group: FakeGroup,
      Mesh: FakeMesh,
      Vector3: FakeVector3,
      BoxGeometry: FakeBoxGeometry,
    },
    ops: [{ partId: 'drawer_1', width: 0.5, height: 0.2, depth: 0.4 }],
    wardrobeGroup,
    createInternalDrawerBox: () => new FakeGroup(),
    addOutlines,
    sketchMode: true,
    cfg: { isLibraryMode: true },
    showContentsEnabled: true,
    addFoldedClothes: (...args: unknown[]) => foldedCalls.push(args),
  });

  assert.equal(result, true);
  assert.equal(foldedCalls.length, 1);
  const policy = foldedCalls[0]?.[7] as Record<string, any>;
  assert.equal(policy.showContentsEnabled, true);
  assert.equal(policy.sketchMode, true);
  assert.equal(policy.cfgSnapshot.isLibraryMode, true);
  assert.equal(typeof policy.addOutlines, 'function');
  const marker = {};
  policy.addOutlines(marker);
  assert.deepEqual(outlined, [marker]);
});
test('internal drawer body uses separate drawer-box identity and stays white by default', () => {
  const wardrobeGroup = new FakeGroup();
  const drawers: unknown[] = [];
  const boxCalls: unknown[][] = [];
  const whiteMat = { id: 'white-drawer-body' };
  const frontPaint = { id: 'front-paint' };
  const renderDrawerOps = createBuilderRenderDrawerOps({
    __app: input => (input as { App: never }).App,
    __ops: () => undefined,
    __wardrobeGroup: () => wardrobeGroup as never,
    __reg: () => undefined,
    __drawers: () => drawers as never[],
    getMirrorMaterial: () => null,
  });

  const result = renderDrawerOps.applyInternalDrawersOps({
    App: {},
    THREE: {
      Group: FakeGroup,
      Mesh: FakeMesh,
      Vector3: FakeVector3,
      BoxGeometry: FakeBoxGeometry,
    },
    ops: [{ partId: 'drawer_1', width: 0.5, height: 0.2, depth: 0.4 }],
    wardrobeGroup,
    createInternalDrawerBox: (...args: unknown[]) => {
      boxCalls.push(args);
      return new FakeGroup();
    },
    getPartColorValue: (partId: string) => (partId === 'drawer_1' ? '#884422' : undefined),
    getPartMaterial: () => frontPaint,
    whiteMat,
    bodyMat: frontPaint,
    sketchMode: true,
    showContentsEnabled: false,
  });

  assert.equal(result, true);
  assert.equal(boxCalls.length, 1);
  assert.equal(boxCalls[0]?.[3], whiteMat);
  assert.equal(boxCalls[0]?.[4], whiteMat);
  const internalDrawer = wardrobeGroup.children[0] as FakeGroup;
  assert.equal(internalDrawer.userData.partId, 'drawer_box__drawer_1');
  assert.equal(internalDrawer.userData.drawerId, 'drawer_1');
  assert.equal(internalDrawer.userData.__wpDrawerBox, true);
  assert.equal((drawers[0] as Record<string, unknown>).id, 'drawer_1');
  assert.equal((drawers[0] as Record<string, unknown>).partId, 'drawer_1');
});

test('internal drawer body accepts explicit drawer-box paint only on its own box id', () => {
  const wardrobeGroup = new FakeGroup();
  const drawers: unknown[] = [];
  const boxCalls: unknown[][] = [];
  const whiteMat = { id: 'white-drawer-body' };
  const frontPaint = { id: 'front-paint' };
  const boxPaint = { id: 'box-paint' };
  const renderDrawerOps = createBuilderRenderDrawerOps({
    __app: input => (input as { App: never }).App,
    __ops: () => undefined,
    __wardrobeGroup: () => wardrobeGroup as never,
    __reg: () => undefined,
    __drawers: () => drawers as never[],
    getMirrorMaterial: () => null,
  });

  const result = renderDrawerOps.applyInternalDrawersOps({
    App: {},
    THREE: {
      Group: FakeGroup,
      Mesh: FakeMesh,
      Vector3: FakeVector3,
      BoxGeometry: FakeBoxGeometry,
    },
    ops: [{ partId: 'drawer_1', width: 0.5, height: 0.2, depth: 0.4 }],
    wardrobeGroup,
    createInternalDrawerBox: (...args: unknown[]) => {
      boxCalls.push(args);
      return new FakeGroup();
    },
    getPartColorValue: (partId: string) =>
      partId === 'drawer_box__drawer_1' ? '#226688' : partId === 'drawer_1' ? '#884422' : undefined,
    getPartMaterial: (partId: string) => (partId === 'drawer_box__drawer_1' ? boxPaint : frontPaint),
    whiteMat,
    bodyMat: frontPaint,
    sketchMode: true,
    showContentsEnabled: false,
  });

  assert.equal(result, true);
  assert.equal(boxCalls.length, 1);
  assert.equal(boxCalls[0]?.[3], boxPaint);
  assert.equal(boxCalls[0]?.[4], boxPaint);
  const internalDrawer = wardrobeGroup.children[0] as FakeGroup;
  assert.equal(internalDrawer.userData.partId, 'drawer_box__drawer_1');
});

test('internal drawer cassette frame renders once around paired internal drawer ops', () => {
  const wardrobeGroup = new FakeGroup();
  const drawers: unknown[] = [];
  const registered: Array<{ partId: unknown; kind: unknown }> = [];
  const outlined: unknown[] = [];
  const renderDrawerOps = createBuilderRenderDrawerOps({
    __app: input => (input as { App: never }).App,
    __ops: () => undefined,
    __wardrobeGroup: () => wardrobeGroup as never,
    __reg: (_App, partId, _obj, kind) => registered.push({ partId, kind }),
    __drawers: () => drawers as never[],
    getMirrorMaterial: () => null,
  });

  const cassette = {
    partId: 'stack_1_cassette',
    width: 0.7,
    height: 0.38,
    depth: 0.44,
    panelThicknessM: 0.02,
    x: 0.1,
    y: 1,
    z: -0.08,
    drawerMinY: 0.82,
    drawerMaxY: 1.16,
  };

  const result = renderDrawerOps.applyInternalDrawersOps({
    App: {},
    THREE: {
      Group: FakeGroup,
      Mesh: FakeMesh,
      Vector3: FakeVector3,
      BoxGeometry: FakeBoxGeometry,
    },
    ops: [
      { partId: 'drawer_lower', width: 0.66, height: 0.16, depth: 0.4, y: 0.9, cassette },
      { partId: 'drawer_upper', width: 0.66, height: 0.16, depth: 0.4, y: 1.08, cassette },
    ],
    wardrobeGroup,
    createInternalDrawerBox: () => new FakeGroup(),
    addOutlines: (mesh: unknown) => outlined.push(mesh),
    whiteMat: { id: 'drawer-box' },
  });

  assert.equal(result, true);
  assert.equal(drawers.length, 2);
  assert.equal(wardrobeGroup.children.length, 6);
  assert.deepEqual(
    registered.filter(entry => entry.kind === 'intDrawerCassette').map(entry => entry.partId),
    ['stack_1_cassette_bottom', 'stack_1_cassette_top', 'stack_1_cassette_left', 'stack_1_cassette_right']
  );
  assert.equal(outlined.length, 4);
  const bottom = wardrobeGroup.children[0] as FakeMesh;
  const top = wardrobeGroup.children[1] as FakeMesh;
  assert.equal(bottom.userData.__wpInternalDrawerCassettePart, 'bottom');
  assert.equal(top.userData.__wpInternalDrawerCassettePart, 'top');
  assert.ok(Math.abs(bottom.position.y - 0.81) < 1e-9);
  assert.ok(Math.abs(top.position.y - 1.17) < 1e-9);
});
