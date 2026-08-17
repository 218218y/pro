import test from 'node:test';
import assert from 'node:assert/strict';

import type { RoomArchitectureConfigLike, RoomWallOpeningLike } from '../types/index.ts';
import {
  ROOM_OPENING_COLLISION_REASON,
  createRoomOpeningPlacementDraft,
  isRoomOpeningTargetOccludedByWardrobe,
  planRoomOpeningRemoval,
  resolveRoomOpeningPlacementPlan,
  type RoomOpeningPlacementDraft,
  type RoomOpeningPlacementSurface,
} from '../esm/native/services/room_opening_placement_plan.ts';
import {
  createRoomOpeningPlacementRuntime,
  type RoomOpeningPlacementRuntimeCapabilities,
} from '../esm/native/services/room_opening_placement_runtime.ts';

const BACK_WALL: RoomOpeningPlacementSurface = {
  wall: 'back',
  axis: 'x',
  startCoord: -2,
  usableLength: 4,
  wallHeight: 2.8,
  interiorFaceCoord: 0,
  inwardNormalX: 0,
  inwardNormalZ: 1,
};

const CENTER_POINT = { x: 0, y: 1.4, z: 0 };

function architecture(openings: RoomWallOpeningLike[] = []): RoomArchitectureConfigLike {
  return {
    backWall: { enabled: true, widthCm: 400, heightCm: 280, wardrobeOffsetLeftCm: 0 },
    leftWall: { enabled: false, depthCm: 300, heightCm: 280 },
    rightWall: { enabled: false, depthCm: 300, heightCm: 280 },
    column: {
      enabled: false,
      offsetLeftCm: 0,
      widthCm: 40,
      depthCm: 40,
      heightCm: 280,
      bottomOffsetCm: 0,
    },
    openings,
    wallColor: '#ffffff',
    surfacesHidden: false,
  };
}

function windowDraft(widthCm = 120, heightCm = 100): RoomOpeningPlacementDraft {
  return { kind: 'window', widthCm, heightCm };
}

test('pure planner resolves a valid opening placement deterministically', () => {
  const plan = resolveRoomOpeningPlacementPlan({
    draft: windowDraft(),
    surface: BACK_WALL,
    point: CENTER_POINT,
    existing: [],
  });

  assert.ok(plan);
  assert.deepEqual(plan.opening, {
    id: '__room-opening-preview__',
    kind: 'window',
    wall: 'back',
    widthCm: 120,
    heightCm: 100,
    offsetAlongCm: 140,
    bottomOffsetCm: 90,
  });
  assert.equal(plan.blockedReason, null);
  assert.ok(Math.abs(plan.preview.x) < 1e-12);
  assert.deepEqual({ ...plan.preview, x: 0 }, { x: 0, y: 1.4, z: 0.1025, w: 1.2, h: 1, d: 0.205 });
});

test('pure planner clamps oversized openings and pointer positions to wall bounds', () => {
  const plan = resolveRoomOpeningPlacementPlan({
    draft: windowDraft(500, 500),
    surface: BACK_WALL,
    point: { x: 100, y: 100, z: 0 },
    existing: [],
  });

  assert.ok(plan);
  assert.equal(plan.opening.widthCm, 400);
  assert.equal(plan.opening.heightCm, 280);
  assert.equal(plan.opening.offsetAlongCm, 0);
  assert.equal(plan.opening.bottomOffsetCm, 0);
  assert.deepEqual(plan.clearancesCm, { start: 0, end: 0, top: 0, bottom: 0 });
});

test('pure planner exposes exact wall clearances for measurement rendering', () => {
  const plan = resolveRoomOpeningPlacementPlan({
    draft: windowDraft(),
    surface: BACK_WALL,
    point: CENTER_POINT,
    existing: [],
  });

  assert.ok(plan);
  assert.deepEqual(plan.clearancesCm, { start: 140, end: 140, top: 90, bottom: 90 });
});

test('wardrobe obstruction policy is pure and preserves the occlusion epsilon', () => {
  assert.equal(isRoomOpeningTargetOccludedByWardrobe(10, null), false);
  assert.equal(isRoomOpeningTargetOccludedByWardrobe(10, { distance: 5 }), true);
  assert.equal(isRoomOpeningTargetOccludedByWardrobe(10, { distance: 9.999 }), false);
  assert.equal(isRoomOpeningTargetOccludedByWardrobe(null, { distance: 5 }), true);
  assert.equal(isRoomOpeningTargetOccludedByWardrobe(10, { distance: null }), true);
});

test('pure planner blocks geometric overlap but allows edge-touching openings', () => {
  const overlapping: RoomWallOpeningLike = {
    id: 'existing-overlap',
    kind: 'window',
    wall: 'back',
    widthCm: 120,
    heightCm: 100,
    offsetAlongCm: 200,
    bottomOffsetCm: 90,
  };
  const touching: RoomWallOpeningLike = {
    ...overlapping,
    id: 'existing-touching',
    offsetAlongCm: 260,
  };

  const blocked = resolveRoomOpeningPlacementPlan({
    draft: windowDraft(),
    surface: BACK_WALL,
    point: CENTER_POINT,
    existing: [overlapping],
  });
  const allowed = resolveRoomOpeningPlacementPlan({
    draft: windowDraft(),
    surface: BACK_WALL,
    point: CENTER_POINT,
    existing: [touching],
  });

  assert.equal(blocked?.blockedReason, ROOM_OPENING_COLLISION_REASON);
  assert.equal(allowed?.blockedReason, null);
});

test('pure planner rejects malformed boundary data without producing partial geometry', () => {
  assert.equal(createRoomOpeningPlacementDraft({ kind: 'arch', widthCm: 100, heightCm: 100 }), null);
  assert.deepEqual(createRoomOpeningPlacementDraft({ kind: 'door', widthCm: Number.NaN, heightCm: null }), {
    kind: 'door',
    widthCm: 90,
    heightCm: 210,
  });

  assert.equal(
    resolveRoomOpeningPlacementPlan({
      draft: windowDraft(),
      surface: BACK_WALL,
      point: { x: Number.NaN, y: 1, z: 0 },
      existing: [],
    }),
    null
  );
  assert.equal(
    resolveRoomOpeningPlacementPlan({
      draft: windowDraft(),
      surface: { ...BACK_WALL, usableLength: Number.NaN },
      point: CENTER_POINT,
      existing: [],
    }),
    null
  );
  assert.doesNotThrow(() =>
    resolveRoomOpeningPlacementPlan({
      draft: windowDraft(),
      surface: BACK_WALL,
      point: CENTER_POINT,
      existing: [null, { wall: 'back', widthCm: 'oops' }] as unknown as RoomWallOpeningLike[],
    })
  );
});

test('capability runtime keeps placement active when an architecture commit fails', () => {
  let active = false;
  let commitCalls = 0;
  let exitCalls = 0;
  const current = architecture();
  const capabilities: RoomOpeningPlacementRuntimeCapabilities = {
    enterEditMode() {
      active = true;
      return true;
    },
    exitEditMode() {
      exitCalls += 1;
      active = false;
    },
    isEditModeActive: () => active,
    subscribeEditModeChanges: () => null,
    hidePreview() {},
    showPlacementPreview() {},
    showRemovalPreview() {},
    readArchitecture: () => current,
    commitArchitecture() {
      commitCalls += 1;
      return false;
    },
    findOpeningTargetHit: () => null,
    findWallSurfaceHit: () => ({ surface: BACK_WALL, point: CENTER_POINT, distance: 10 }),
    findWardrobeObstacle: () => null,
    readOpeningId: () => null,
    createOpeningId: () => 'opening-fixed',
  };
  const runtime = createRoomOpeningPlacementRuntime(capabilities);

  assert.equal(runtime.begin({ kind: 'window', widthCm: 120, heightCm: 100 }), true);
  assert.equal(runtime.click({ ndcX: 0, ndcY: 0, raycaster: {}, mouse: {} }), true);
  assert.equal(commitCalls, 1);
  assert.equal(exitCalls, 0);
  assert.equal(runtime.isActive(), true);
});

test('pure removal plan removes only the requested opening and rejects missing ids', () => {
  const current = architecture([
    {
      id: 'window-a',
      kind: 'window',
      wall: 'back',
      widthCm: 120,
      heightCm: 100,
      offsetAlongCm: 40,
      bottomOffsetCm: 90,
    },
    {
      id: 'door-b',
      kind: 'door',
      wall: 'back',
      widthCm: 90,
      heightCm: 210,
      offsetAlongCm: 220,
      bottomOffsetCm: 0,
    },
  ]);

  const mutation = planRoomOpeningRemoval({ current, openingId: ' window-a ' });
  assert.ok(mutation);
  assert.deepEqual(
    mutation.nextArchitecture.openings.map(opening => opening.id),
    ['door-b']
  );
  assert.equal(planRoomOpeningRemoval({ current, openingId: 'missing' }), null);
  assert.equal(planRoomOpeningRemoval({ current, openingId: '   ' }), null);
});
