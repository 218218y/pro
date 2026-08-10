import test from 'node:test';
import assert from 'node:assert/strict';

import { createBuilderRenderDrawerOps } from '../esm/native/builder/render_drawer_ops.ts';
import { CHEST_MODE_DRAWER_BOX_RENDER_POLICY } from '../esm/shared/dimensions/chest_mode_policy.ts';
import { INTERNAL_DRAWER_CONTENTS_POLICY } from '../esm/shared/dimensions/internal_drawer_policy.ts';

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
class FakeCylinderGeometry {}
class FakeMaterial {
  constructor(public params: Record<string, unknown>) {}
}

const fakeThree = {
  Group: FakeGroup,
  Mesh: FakeMesh,
  Vector3: FakeVector3,
  BoxGeometry: FakeBoxGeometry,
  CylinderGeometry: FakeCylinderGeometry,
  MeshStandardMaterial: FakeMaterial,
};

function drawerChildren(parent: FakeGroup): FakeGroup[] {
  return parent.children.filter(child => {
    const userData = (child as FakeGroup)?.userData;
    return !userData?.__wpDrawerRunnerHardware && !userData?.__wpDrawerRunnerHardwareContainer;
  }) as FakeGroup[];
}

function runnerHardwareContainer(parent: FakeGroup): FakeGroup | undefined {
  return parent.children.find(
    child => (child as FakeGroup)?.userData?.__wpDrawerRunnerHardwareContainer === true
  ) as FakeGroup | undefined;
}

function runnerRoles(parent: FakeGroup): string[] {
  return parent.children
    .filter(child => (child as FakeGroup)?.userData?.__wpDrawerRunnerHardware)
    .map(child => String((child as FakeGroup).userData.__wpDrawerRunnerRole));
}

function assertNear(actual: unknown, expected: number, message?: string): void {
  assert.equal(typeof actual, 'number', message);
  assert.ok(Math.abs((actual as number) - expected) < 1e-12, message);
}

test('internal drawer render fails closed when required inputs are unavailable', () => {
  const wardrobeGroup = new FakeGroup();
  const createRenderer = (resolveWardrobeGroup: () => FakeGroup | null) =>
    createBuilderRenderDrawerOps({
      __app: input => (input as { App: never }).App,
      __ops: () => undefined,
      __wardrobeGroup: () => resolveWardrobeGroup() as never,
      __reg: () => undefined,
      __drawers: () => [],
      getMirrorMaterial: () => null,
    });
  const op = { partId: 'drawer_1', width: 0.5, height: 0.2, depth: 0.4 };
  const createInternalDrawerBox = () => new FakeGroup();

  assert.equal(
    createRenderer(() => wardrobeGroup).applyInternalDrawersOps({
      App: {},
      ops: [op],
      wardrobeGroup,
      createInternalDrawerBox,
    }),
    false
  );
  assert.equal(
    createRenderer(() => wardrobeGroup).applyInternalDrawersOps({
      App: {},
      THREE: fakeThree,
      wardrobeGroup,
      createInternalDrawerBox,
    }),
    false
  );
  assert.equal(
    createRenderer(() => null).applyInternalDrawersOps({
      App: {},
      THREE: fakeThree,
      ops: [op],
      createInternalDrawerBox,
    }),
    false
  );
  assert.equal(
    createRenderer(() => wardrobeGroup).applyInternalDrawersOps({
      App: {},
      THREE: fakeThree,
      ops: [op],
      wardrobeGroup,
    }),
    false
  );
});

test('internal drawers keep roller hardware even when external drawer selection is Blum', () => {
  const wardrobeGroup = new FakeGroup();
  const renderDrawerOps = createBuilderRenderDrawerOps({
    __app: input => (input as { App: never }).App,
    __ops: () => undefined,
    __wardrobeGroup: () => wardrobeGroup as never,
    __reg: () => undefined,
    __drawers: () => [],
    getMirrorMaterial: () => null,
  });

  const result = renderDrawerOps.applyInternalDrawersOps({
    App: {},
    THREE: fakeThree,
    ops: [{ partId: 'drawer_roller_only', width: 0.5, height: 0.2, depth: 0.4 }],
    wardrobeGroup,
    createInternalDrawerBox: () => new FakeGroup(),
    cfg: { drawerRunnerType: 'blum' },
  });

  assert.equal(result, true);
  const fixedHardware = runnerHardwareContainer(wardrobeGroup);
  assert.ok(fixedHardware);
  const fixedRoles = runnerRoles(fixedHardware);
  assert.equal(fixedRoles.length, 6);
  assert.ok(fixedRoles.every(role => role.startsWith('roller-fixed-')));
  assert.ok(fixedRoles.every(role => !role.startsWith('blum-')));

  const drawer = drawerChildren(wardrobeGroup)[0];
  assert.ok(drawer);
  const movingRoles = runnerRoles(drawer);
  assert.equal(movingRoles.length, 6);
  assert.ok(movingRoles.every(role => role.startsWith('roller-moving-')));
  assert.ok(movingRoles.every(role => !role.startsWith('blum-')));
});

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
    THREE: fakeThree,
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
  const contentsCall = foldedCalls[0]!;
  assert.equal(contentsCall[0], 0);
  assertNear(contentsCall[1], -0.2 / 2 + INTERNAL_DRAWER_CONTENTS_POLICY.contentsBottomInsetM);
  assert.equal(contentsCall[2], 0);
  assertNear(contentsCall[3], 0.5 - INTERNAL_DRAWER_CONTENTS_POLICY.contentsWidthClearanceM);
  assert.equal(contentsCall[4], drawerChildren(wardrobeGroup)[0]);
  assertNear(contentsCall[5], Math.max(0, 0.2 - INTERNAL_DRAWER_CONTENTS_POLICY.contentsHeightClearanceM));
  assert.equal(contentsCall[6], 0.4);
  const policy = contentsCall[7] as Record<string, any>;
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
  const foldedCalls: unknown[][] = [];
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
    THREE: fakeThree,
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
    addFoldedClothes: (...args: unknown[]) => foldedCalls.push(args),
  });

  assert.equal(result, true);
  assert.equal(boxCalls.length, 1);
  assert.equal(boxCalls[0]?.[3], whiteMat);
  assert.equal(boxCalls[0]?.[4], whiteMat);
  const internalDrawer = drawerChildren(wardrobeGroup)[0] as FakeGroup;
  assert.equal(internalDrawer.userData.partId, 'drawer_box__drawer_1');
  assert.equal(internalDrawer.userData.drawerId, 'drawer_1');
  assert.equal(internalDrawer.userData.__wpDrawerBox, true);
  assert.equal(
    internalDrawer.userData.__frontMaxZ,
    0.4 / 2 +
      CHEST_MODE_DRAWER_BOX_RENDER_POLICY.accentZOffsetM +
      CHEST_MODE_DRAWER_BOX_RENDER_POLICY.accentStripDepthM / 2
  );
  assert.equal((drawers[0] as Record<string, unknown>).id, 'drawer_1');
  assert.equal((drawers[0] as Record<string, unknown>).partId, 'drawer_1');
  assert.deepEqual(foldedCalls, []);
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
    THREE: fakeThree,
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
  const internalDrawer = drawerChildren(wardrobeGroup)[0] as FakeGroup;
  assert.equal(internalDrawer.userData.partId, 'drawer_box__drawer_1');
});

test('internal drawer render preserves valid-op creation, positions, front depth, and drawer identity', () => {
  const wardrobeGroup = new FakeGroup();
  const drawers: unknown[] = [];
  const boxCalls: unknown[][] = [];
  const registrations: unknown[][] = [];
  const renderDrawerOps = createBuilderRenderDrawerOps({
    __app: input => (input as { App: never }).App,
    __ops: () => undefined,
    __wardrobeGroup: () => wardrobeGroup as never,
    __reg: (...args: unknown[]) => registrations.push(args),
    __drawers: () => drawers as never[],
    getMirrorMaterial: () => null,
  });

  const result = renderDrawerOps.applyInternalDrawersOps({
    App: {},
    THREE: fakeThree,
    ops: [
      {
        partId: 'drawer_explicit_open',
        width: 0.5,
        height: 0.2,
        depth: 0.4,
        x: 0.1,
        y: 0.2,
        z: 0.3,
        openZ: 0.9,
      },
      { partId: '', width: 0.5, height: 0.2, depth: 0.4 },
      {
        partId: 'drawer_fallback_open',
        width: 0.45,
        height: 0.18,
        depth: 0,
        x: -0.1,
        y: 0.4,
        z: -0.1,
      },
    ],
    wardrobeGroup,
    createInternalDrawerBox: (...args: unknown[]) => {
      boxCalls.push(args);
      return new FakeGroup();
    },
    showContentsEnabled: false,
  });

  assert.equal(result, true);
  assert.equal(boxCalls.length, 2);
  assert.equal(drawerChildren(wardrobeGroup).length, 2);
  assert.equal(registrations.length, 2);
  assert.equal(drawers.length, 2);

  const [firstGroup, secondGroup] = drawerChildren(wardrobeGroup);
  assert.equal(
    firstGroup.userData.__frontMaxZ,
    0.4 / 2 +
      CHEST_MODE_DRAWER_BOX_RENDER_POLICY.accentZOffsetM +
      CHEST_MODE_DRAWER_BOX_RENDER_POLICY.accentStripDepthM / 2
  );
  assert.equal(secondGroup.userData.__frontMaxZ, 0);

  const firstDrawer = drawers[0] as Record<string, unknown>;
  const secondDrawer = drawers[1] as Record<string, unknown>;
  assert.equal(firstDrawer.group, firstGroup);
  assert.equal(firstDrawer.id, 'drawer_explicit_open');
  assert.equal(firstDrawer.partId, 'drawer_explicit_open');
  assert.equal(firstDrawer.isInternal, true);
  assert.deepEqual(firstDrawer.closed, new FakeVector3(0.1, 0.2, 0.3));
  assert.deepEqual(firstDrawer.open, new FakeVector3(0.1, 0.2, 0.9));
  assert.equal(secondDrawer.group, secondGroup);
  assert.deepEqual(secondDrawer.closed, new FakeVector3(-0.1, 0.4, -0.1));
  assertNear((secondDrawer.open as FakeVector3).z, -0.1 + 0.25);
});

test('internal drawer contents floor the available height at zero', () => {
  const wardrobeGroup = new FakeGroup();
  const foldedCalls: unknown[][] = [];
  const renderDrawerOps = createBuilderRenderDrawerOps({
    __app: input => (input as { App: never }).App,
    __ops: () => undefined,
    __wardrobeGroup: () => wardrobeGroup as never,
    __reg: () => undefined,
    __drawers: () => [],
    getMirrorMaterial: () => null,
  });

  const result = renderDrawerOps.applyInternalDrawersOps({
    App: {},
    THREE: fakeThree,
    ops: [
      {
        partId: 'drawer_short',
        width: 0.2,
        height: INTERNAL_DRAWER_CONTENTS_POLICY.contentsHeightClearanceM / 2,
        depth: 0.31,
      },
    ],
    wardrobeGroup,
    createInternalDrawerBox: () => new FakeGroup(),
    showContentsEnabled: true,
    addFoldedClothes: (...args: unknown[]) => foldedCalls.push(args),
  });

  assert.equal(result, true);
  assert.equal(foldedCalls.length, 1);
  assert.equal(foldedCalls[0]?.[5], 0);
  assert.equal(foldedCalls[0]?.[6], 0.31);
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
    THREE: fakeThree,
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
  assert.equal(boardCalls.length, 6);
  assert.deepEqual(
    boardCalls.map(call => call[7]),
    [
      'stack_1_cassette',
      'stack_1_cassette',
      'stack_1_cassette',
      'stack_1_cassette',
      'stack_1_cassette',
      'stack_1_cassette',
    ]
  );
  assert.equal(
    boardCalls.every(call => call[6] === shelfPaint),
    true
  );
  const sideFillers = boardCalls.slice(4);
  assert.deepEqual(
    sideFillers.map(call => call[0]),
    [0.05, 0.05]
  );
  assert.equal(
    sideFillers.every(call => Math.abs(Number(call[2]) - 0.42) < 1e-9),
    true
  );
  assert.equal(
    sideFillers.every(call => Math.abs(Number(call[5]) - -0.215) < 1e-9),
    true
  );
  assert.equal(drawers.length, 2);
});
