import test from 'node:test';
import assert from 'node:assert/strict';

import {
  doorBlocksDividerDrawer,
  getDividerDrawerBlockingDoors,
  holdDividerDrawerDoorClearanceForClose,
  markDividerDrawerClearanceStarted,
  resolveDividerDrawerClearanceTarget,
} from '../esm/native/runtime/divider_drawer_door_clearance.ts';
import { updateRenderLoopDoorMotions } from '../esm/native/platform/render_loop_motion_doors.ts';
import { updateRenderLoopDrawerMotions } from '../esm/native/platform/render_loop_motion_drawers.ts';
import type { MotionFrameState } from '../esm/native/platform/render_loop_motion_shared.ts';

function makePosition(x: number, y: number, z: number) {
  return {
    x,
    y,
    z,
    lerp(target: { x: number; y: number; z: number }, alpha: number) {
      this.x += (target.x - this.x) * alpha;
      this.y += (target.y - this.y) * alpha;
      this.z += (target.z - this.z) * alpha;
    },
  };
}

function makeDrawer(parent: object, overrides: Record<string, unknown> = {}) {
  return {
    id: 'int_1',
    isInternal: true,
    group: {
      parent,
      position: makePosition(0, 0.5, 0),
      userData: {
        moduleIndex: 1,
        __doorWidth: 0.8,
        __doorHeight: 0.2,
        __wpFaceOffsetX: 0,
      },
    },
    closed: { x: 0, y: 0.5, z: 0 },
    open: { x: 0, y: 0.5, z: 0.55 },
    isOpen: false,
    ...overrides,
  };
}

function makeDoor(
  parent: object,
  options: {
    moduleIndex?: number | string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    removed?: boolean;
  } = {}
) {
  return {
    type: 'hinged',
    hingeSide: 'right',
    isOpen: false,
    group: {
      parent,
      position: makePosition(options.x ?? 0, options.y ?? 0.5, 0.3),
      rotation: { y: 0 },
      userData: {
        moduleIndex: options.moduleIndex ?? 1,
        __doorWidth: options.width ?? 0.45,
        __doorHeight: options.height ?? 1,
        __doorMeshOffsetX: 0,
        __wpDoorRemoved: options.removed === true,
      },
    },
  };
}

function frame(overrides: Partial<MotionFrameState> = {}): MotionFrameState {
  return {
    hasInternalDrawers: true,
    doorsShouldBeOpen: false,
    internalDrawersShouldBeOpen: false,
    externalDrawersShouldBeOpen: false,
    isAnimating: true,
    isActiveState: true,
    globalClickMode: true,
    platformDimsFrame: null,
    doorsOpenFlag: false,
    interiorDoorEditActive: false,
    sketchEditActive: false,
    sketchIntDrawersEditActive: false,
    sketchExtDrawersEditActive: false,
    forcedOpenDrawerId: 'int_1',
    manualTool: null,
    delayTime: 600,
    timeSinceToggle: Number.POSITIVE_INFINITY,
    localDoorModules: new Set<string>(),
    hasAnyLocalOpenDoor: false,
    visibleOpenInternalDrawerModules: new Set<string>(),
    ...overrides,
  };
}

function makeApp(doors: unknown[], drawers: unknown[], primaryMode = 'divider') {
  const state = {
    mode: { primary: primaryMode, opts: {} },
    runtime: { globalClickMode: true },
    config: { wardrobeType: 'hinged' },
    ui: {},
    meta: {},
  };
  return {
    store: { getState: () => state },
    render: { doorsArray: doors, drawersArray: drawers },
    services: {
      doors: { runtime: {} },
      platform: {
        getBuildUI: () => ({}),
        getDimsM: () => ({ w: 2.4, h: 2.4, d: 0.6 }),
      },
    },
  } as never;
}

test('divider drawer clearance identifies only real front blockers in the same module', () => {
  const parent = {};
  const drawer = makeDrawer(parent);
  const blockingLeft = makeDoor(parent, { x: -0.2, moduleIndex: 1 });
  const blockingRight = makeDoor(parent, { x: 0.2, moduleIndex: 1 });
  const verticalMiss = makeDoor(parent, { y: 1.5, moduleIndex: 1, height: 0.4 });
  const adjacentModule = makeDoor(parent, { x: 0, moduleIndex: 2 });
  const removed = makeDoor(parent, { x: 0, moduleIndex: 1, removed: true });
  const App = makeApp([blockingLeft, blockingRight, verticalMiss, adjacentModule, removed], [drawer]);

  assert.equal(doorBlocksDividerDrawer(blockingLeft as never, drawer as never), true);
  assert.equal(doorBlocksDividerDrawer(blockingRight as never, drawer as never), true);
  assert.equal(doorBlocksDividerDrawer(verticalMiss as never, drawer as never), false);
  assert.equal(doorBlocksDividerDrawer(adjacentModule as never, drawer as never), false);
  assert.equal(doorBlocksDividerDrawer(removed as never, drawer as never), false);
  assert.deepEqual(getDividerDrawerBlockingDoors(App, drawer as never), [blockingLeft, blockingRight]);
});

test('same-module ownership safely covers builder variants with different local projection parents', () => {
  const drawer = makeDrawer({});
  const wrappedDoor = makeDoor({}, { moduleIndex: 1, x: 20, y: 20 });
  const adjacentModuleDoor = makeDoor({}, { moduleIndex: 2, x: 0, y: 0.5 });

  assert.equal(doorBlocksDividerDrawer(wrappedDoor as never, drawer as never), true);
  assert.equal(doorBlocksDividerDrawer(adjacentModuleDoor as never, drawer as never), false);
});

test('divider drawer clearance target is mode-gated and internal-drawer-only', () => {
  const parent = {};
  const internalDrawer = makeDrawer(parent);
  const externalDrawer = makeDrawer(parent, { id: 'ext_1', isInternal: false });

  assert.equal(resolveDividerDrawerClearanceTarget(makeApp([], [internalDrawer]), 'int_1'), internalDrawer);
  assert.equal(resolveDividerDrawerClearanceTarget(makeApp([], [internalDrawer], 'none'), 'int_1'), null);
  assert.equal(resolveDividerDrawerClearanceTarget(makeApp([], [externalDrawer]), 'ext_1'), null);
});

test('render loop opens only blockers and holds them open until the edited drawer retracts on exit', () => {
  const parent = {};
  const drawer = makeDrawer(parent);
  const blocker = makeDoor(parent, { x: 0, moduleIndex: 1 });
  const otherModule = makeDoor(parent, { x: 0, moduleIndex: 2 });
  const verticalMiss = makeDoor(parent, { y: 1.5, moduleIndex: 1, height: 0.4 });
  const App = makeApp([blocker, otherModule, verticalMiss], [drawer]);

  const active = updateRenderLoopDoorMotions(App, frame());

  assert.equal(active, true);
  assert.ok(blocker.group.rotation.y > 0, 'blocking door should start opening');
  assert.equal(otherModule.group.rotation.y, 0, 'adjacent-module door must stay closed');
  assert.equal(verticalMiss.group.rotation.y, 0, 'non-overlapping door segment must stay closed');

  drawer.group.position.z = 0.3;
  holdDividerDrawerDoorClearanceForClose(App, 'int_1');
  App.store.getState().mode.primary = 'none';
  const rotationBeforeExit = blocker.group.rotation.y;
  updateRenderLoopDoorMotions(App, frame({ forcedOpenDrawerId: null }));
  assert.ok(
    blocker.group.rotation.y > rotationBeforeExit,
    'blocker must remain opening while the drawer is still retracting'
  );

  const drawerStillMoving = updateRenderLoopDrawerMotions(App, frame({ forcedOpenDrawerId: null }), {
    now: () => Date.now(),
    debugLog() {},
  });
  assert.equal(drawerStillMoving, true);
  const rotationWhileRetracting = blocker.group.rotation.y;
  updateRenderLoopDoorMotions(App, frame({ forcedOpenDrawerId: null }));
  assert.ok(
    blocker.group.rotation.y > rotationWhileRetracting,
    'blocker must stay open for the whole drawer retraction'
  );

  drawer.group.position.z = drawer.closed.z;
  const drawerSettled = updateRenderLoopDrawerMotions(App, frame({ forcedOpenDrawerId: null }), {
    now: () => Date.now(),
    debugLog() {},
  });
  assert.equal(drawerSettled, false);
  const rotationBeforeRelease = blocker.group.rotation.y;
  updateRenderLoopDoorMotions(App, frame({ forcedOpenDrawerId: null }));
  assert.ok(
    blocker.group.rotation.y < rotationBeforeRelease,
    'temporarily opened blocker should return to its prior closed state only after the drawer is closed'
  );
});

test('forced internal divider drawer waits for door-clearance delay before moving', () => {
  const parent = {};
  const drawer = makeDrawer(parent);
  const blocker = makeDoor(parent, { moduleIndex: 1 });
  const App = makeApp([blocker], [drawer]);

  markDividerDrawerClearanceStarted(App, Date.now());
  const activeBeforeClearance = updateRenderLoopDrawerMotions(App, frame(), {
    now: () => Date.now(),
    debugLog() {},
  });
  assert.equal(activeBeforeClearance, false);
  assert.equal(drawer.group.position.z, 0);

  markDividerDrawerClearanceStarted(App, Date.now() - 1000);
  const activeAfterClearance = updateRenderLoopDrawerMotions(App, frame(), {
    now: () => Date.now(),
    debugLog() {},
  });
  assert.equal(activeAfterClearance, true);
  assert.ok(drawer.group.position.z > 0, 'drawer should begin opening only after the door delay');
});
