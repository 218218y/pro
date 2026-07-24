import test from 'node:test';
import assert from 'node:assert/strict';

import { updateRenderLoopDoorMotions } from '../esm/native/platform/render_loop_motion_doors.ts';
import type { MotionFrameState } from '../esm/native/platform/render_loop_motion_shared.ts';
import { resolveSlidingDoorTrackOpenPosition } from '../esm/native/runtime/sliding_door_motion.ts';
import { SLIDING_DOOR_CONSTRUCTION_POLICY } from '../esm/shared/dimensions/door_system_policy.ts';
import { cmToM } from '../esm/shared/dimensions/units.ts';
import { WARDROBE_DEFAULTS } from '../esm/shared/dimensions/wardrobe_defaults.ts';

type TestGroup = {
  visible?: boolean;
  position: { x: number; y: number; z: number };
  rotation: { y: number };
  userData: Record<string, unknown>;
};

type TestDoor = Record<string, unknown> & {
  type: 'hinged' | 'sliding';
  group: TestGroup;
  originalX?: number | null;
  originalZ?: number | null;
};

function closeTo(actual: number, expected: number, message: string): void {
  assert.ok(Math.abs(actual - expected) < 1e-12, `${message}: ${actual} !== ${expected}`);
}

function frame(overrides: Partial<MotionFrameState> = {}): MotionFrameState {
  return {
    hasInternalDrawers: false,
    doorsShouldBeOpen: false,
    internalDrawersShouldBeOpen: false,
    externalDrawersShouldBeOpen: false,
    isAnimating: false,
    isActiveState: false,
    globalClickMode: true,
    platformDimsFrame: null,
    doorsOpenFlag: false,
    interiorDoorEditActive: false,
    sketchEditActive: false,
    sketchIntDrawersEditActive: false,
    sketchExtDrawersEditActive: false,
    forcedOpenDrawerId: null,
    manualTool: null,
    delayTime: 0,
    timeSinceToggle: Number.POSITIVE_INFINITY,
    localDoorModules: new Set<string>(),
    hasAnyLocalOpenDoor: false,
    visibleOpenInternalDrawerModules: new Set<string>(),
    ...overrides,
  };
}

function slidingDoor(overrides: Record<string, unknown> = {}): TestDoor {
  return {
    type: 'sliding',
    index: 0,
    group: {
      visible: true,
      position: { x: 0, y: 0, z: 0.2 },
      rotation: { y: 0 },
      userData: {},
    },
    ...overrides,
  } as TestDoor;
}

function makeApp(
  doors: TestDoor[],
  options: { ui?: Record<string, unknown>; dims?: Record<string, unknown> | null } = {}
) {
  return {
    render: { doorsArray: doors },
    services: {
      platform: {
        getBuildUI: () => options.ui ?? {},
        getDimsM: () => options.dims ?? null,
      },
    },
  } as never;
}

function expectedDoorWidth(totalW: number, doorsCount: number): number {
  return (totalW + (doorsCount - 1) * SLIDING_DOOR_CONSTRUCTION_POLICY.overlapM) / doorsCount;
}

function expectedOriginalX(totalW: number, doorsCount: number, index: number, doorW: number): number {
  return index * (doorW - SLIDING_DOOR_CONSTRUCTION_POLICY.overlapM) - totalW / 2 + doorW / 2;
}

test('sliding initialization preserves count precedence and owner-based door geometry', () => {
  const totalW = 2.4;
  const cases = [
    { label: 'd.total', door: { total: 3 }, ui: { raw: { doors: 7 } }, doorsCount: 3 },
    { label: 'raw UI doors', door: {}, ui: { raw: { doors: 4 } }, doorsCount: 4 },
    { label: 'numeric-string UI doors', door: {}, ui: { doors: '5' }, doorsCount: 5 },
    {
      label: 'focused-owner default doors',
      door: {},
      ui: {},
      doorsCount: SLIDING_DOOR_CONSTRUCTION_POLICY.defaultDoorsCount,
    },
  ];

  for (const entry of cases) {
    const index = 1;
    const door = slidingDoor({ index, ...entry.door });
    updateRenderLoopDoorMotions(
      makeApp([door], { ui: entry.ui }),
      frame({ platformDimsFrame: { w: totalW } })
    );
    const doorW = expectedDoorWidth(totalW, entry.doorsCount);
    closeTo(
      door.originalX ?? Number.NaN,
      expectedOriginalX(totalW, entry.doorsCount, index, doorW),
      `${entry.label} original X`
    );
    assert.equal(door.originalZ, 0.2, `${entry.label} original Z`);
  }
});

test('sliding width sources preserve frame, platform, Defaults, and explicit-door precedence', () => {
  const defaultWidthM = cmToM(WARDROBE_DEFAULTS.widthCm);
  const cases = [
    {
      label: 'frame dimensions',
      platformDimsFrame: { w: 2.7 },
      dims: { w: 3.1, h: 2, d: 0.6 },
      totalW: 2.7,
    },
    {
      label: 'platform dimensions',
      platformDimsFrame: null,
      dims: { w: 3.1, h: 2, d: 0.6 },
      totalW: 3.1,
    },
    { label: 'Wardrobe Defaults', platformDimsFrame: null, dims: null, totalW: defaultWidthM },
  ];

  for (const entry of cases) {
    const door = slidingDoor({ total: 2, index: 0 });
    updateRenderLoopDoorMotions(
      makeApp([door], { dims: entry.dims }),
      frame({ platformDimsFrame: entry.platformDimsFrame })
    );
    const doorW = expectedDoorWidth(entry.totalW, 2);
    closeTo(
      door.originalX ?? Number.NaN,
      expectedOriginalX(entry.totalW, 2, 0, doorW),
      `${entry.label} original X`
    );
  }

  const explicitWidth = 0.72;
  const explicit = slidingDoor({ total: 2, index: 1, width: explicitWidth });
  updateRenderLoopDoorMotions(
    makeApp([explicit], { dims: { w: 3.1, h: 2, d: 0.6 } }),
    frame({ platformDimsFrame: { w: 2.7 } })
  );
  closeTo(
    explicit.originalX ?? Number.NaN,
    expectedOriginalX(2.7, 2, 1, explicitWidth),
    'explicit door width original X'
  );
});

test('sliding original coordinates initialize once and closed/track-open motion preserves interpolation', () => {
  const door = slidingDoor({
    total: 2,
    index: 0,
    width: 1,
    minX: -1,
    maxX: 1,
    slidingOpenMode: 'track',
    __slidingOpenMode: 'track',
  });
  const App = makeApp([door], { dims: { w: 3, h: 2, d: 0.6 } });
  const closedFrame = frame({ platformDimsFrame: { w: 3 } });

  updateRenderLoopDoorMotions(App, closedFrame);
  const originalX = door.originalX ?? Number.NaN;
  const originalZ = door.originalZ ?? Number.NaN;
  door.group.position.z = 0.7;
  door.group.position.x = 0.4;
  updateRenderLoopDoorMotions(App, frame({ platformDimsFrame: { w: 4 } }));
  assert.equal(door.originalX, originalX);
  assert.equal(door.originalZ, originalZ);
  closeTo(door.group.position.x, 0.4 + (originalX - 0.4) * 0.08, 'closed X interpolation');
  closeTo(door.group.position.z, 0.7 + (originalZ - 0.7) * 0.08, 'closed Z interpolation');

  door.group.position.x = originalX;
  door.group.position.z = originalZ;
  const target = resolveSlidingDoorTrackOpenPosition(door, 3, 1, originalZ);
  const active = updateRenderLoopDoorMotions(
    App,
    frame({ doorsShouldBeOpen: true, platformDimsFrame: { w: 3 } })
  );
  assert.equal(active, true);
  closeTo(door.group.position.x, originalX + (target.finalX - originalX) * 0.08, 'track-open X');
  closeTo(door.group.position.z, originalZ + (target.finalZ - originalZ) * 0.08, 'track-open Z');
});

test('sliding edit visibility is hidden and restored without changing the track-open route', () => {
  const door = slidingDoor({
    total: 2,
    index: 0,
    width: 1,
    originalX: -1,
    originalZ: 0.2,
    minX: -1,
    maxX: 1,
    slidingOpenMode: 'track',
  });
  door.group.position.x = -1;

  const App = makeApp([door], { dims: { w: 3, h: 2, d: 0.6 } });
  updateRenderLoopDoorMotions(
    App,
    frame({ doorsShouldBeOpen: true, sketchEditActive: true, platformDimsFrame: { w: 3 } })
  );
  assert.equal(door.group.visible, false);
  assert.equal(door.group.position.x, -1);

  updateRenderLoopDoorMotions(
    App,
    frame({ doorsShouldBeOpen: true, sketchEditActive: false, platformDimsFrame: { w: 3 } })
  );
  assert.equal(door.group.visible, true);
  assert.ok(door.group.position.x > -1);
});

test('hinged motion preserves left/right, Corner Pent direction, and invert-swing rules', () => {
  const left = {
    type: 'hinged',
    hingeSide: 'left',
    group: { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 }, userData: {} },
  } as TestDoor;
  const right = {
    type: 'hinged',
    hingeSide: 'right',
    group: { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 }, userData: {} },
  } as TestDoor;
  const cornerPent = {
    type: 'hinged',
    hingeSide: 'right',
    group: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { y: 0 },
      userData: { __wpCornerPentDoor: true, __wpDoorOpenDirSign: -1 },
    },
  } as TestDoor;
  const inverted = {
    type: 'hinged',
    hingeSide: 'right',
    invertSwing: true,
    group: { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 }, userData: {} },
  } as TestDoor;

  const active = updateRenderLoopDoorMotions(
    makeApp([left, right, cornerPent, inverted]),
    frame({ doorsShouldBeOpen: true })
  );
  const step = (Math.PI / 2.1) * 0.1;
  assert.equal(active, true);
  closeTo(left.group.rotation.y, -step, 'left hinge');
  closeTo(right.group.rotation.y, step, 'right hinge');
  closeTo(cornerPent.group.rotation.y, -step, 'Corner Pent open direction');
  closeTo(inverted.group.rotation.y, -step, 'inverted swing');
});
