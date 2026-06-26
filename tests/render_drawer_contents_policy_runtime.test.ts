import test from 'node:test';
import assert from 'node:assert/strict';

import { createBuilderRenderDrawerOps } from '../esm/native/builder/render_drawer_ops.ts';
import { CHEST_MODE_DIMENSIONS } from '../esm/shared/wardrobe_dimension_tokens_shared.ts';

class FakeVector3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0
  ) {}

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
  assert.equal(
    internalDrawer.userData.__frontMaxZ,
    0.4 / 2 +
      CHEST_MODE_DIMENSIONS.drawerBox.accentZOffsetM +
      CHEST_MODE_DIMENSIONS.drawerBox.accentStripDepthM / 2
  );
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

test('internal drawer cassette panels use shelf paint identity and render once per stack', () => {
  const wardrobeGroup = new FakeGroup();
  const drawers: unknown[] = [];
  const boardCalls: unknown[][] = [];
  const shelfPaint = { id: 'all-shelves-paint' };
  const bodyMat = { id: 'body' };
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
    ops: [
      {
        partId: 'stack_1_lower',
        stackPartId: 'stack_1',
        width: 0.5,
        height: 0.165,
        depth: 0.4,
        cassetteBaseY: 0.42,
        cassetteOuterWidth: 0.7,
        cassetteDepth: 0.45,
        cassetteCenterX: 0.1,
        cassetteCenterZ: -0.2,
        cassetteStackH: 0.36,
        cassetteWoodThick: 0.02,
      },
      {
        partId: 'stack_1_upper',
        stackPartId: 'stack_1',
        width: 0.5,
        height: 0.165,
        depth: 0.4,
        cassetteBaseY: 0.42,
        cassetteOuterWidth: 0.7,
        cassetteDepth: 0.45,
        cassetteCenterX: 0.1,
        cassetteCenterZ: -0.2,
        cassetteStackH: 0.36,
        cassetteWoodThick: 0.02,
      },
    ],
    wardrobeGroup,
    createInternalDrawerBox: () => new FakeGroup(),
    createBoard: (...args: unknown[]) => {
      boardCalls.push(args);
      return new FakeGroup();
    },
    getPartColorValue: (partId: string) => (partId === 'all_shelves' ? '#2277aa' : undefined),
    getPartMaterial: (partId: string) => (partId === 'all_shelves' ? shelfPaint : bodyMat),
    bodyMat,
    currentShelfMat: bodyMat,
    sketchMode: true,
    showContentsEnabled: false,
  });

  assert.equal(result, true);
  assert.equal(boardCalls.length, 4);
  assert.deepEqual(
    boardCalls.map(call => call[7]),
    ['stack_1_cassette', 'stack_1_cassette', 'stack_1_cassette', 'stack_1_cassette']
  );
  assert.equal(
    boardCalls.every(call => call[6] === shelfPaint),
    true
  );
  assert.equal(drawers.length, 2);
});
