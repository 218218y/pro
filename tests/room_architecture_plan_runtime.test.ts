import test from 'node:test';
import assert from 'node:assert/strict';

import type { AxisAlignedBox, RoomArchitectureConfigLike } from '../types/index.ts';
import { normalizeProjectRoomArchitecture } from '../esm/native/features/project_config/api.ts';
import {
  ROOM_ARCHITECTURE_EPSILON_M,
  ROOM_COLUMN_LINER_THICKNESS_M,
  createRoomArchitecturePlan,
  intersectAxisAlignedBoxes,
  resolveHorizontalSpanAgainstRoomColumnCut,
  subtractAxisAlignedBox,
} from '../esm/native/builder/room_architecture_geometry.ts';
import {
  createRoomArchitecturePlanFromBuildSnapshot,
  createRoomArchitecturePlanInputFromBuildSnapshot,
} from '../esm/native/builder/room_architecture_plan_adapter.ts';

function assertClose(actual: number, expected: number, epsilon = 1e-9): void {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} must equal ${expected}`);
}

function canonicalRoom(overrides: Record<string, unknown> = {}): RoomArchitectureConfigLike {
  return normalizeProjectRoomArchitecture({
    backWall: { enabled: true, widthCm: 100, heightCm: 280, wardrobeOffsetLeftCm: 0 },
    leftWall: { enabled: false, depthCm: 300, heightCm: 280 },
    rightWall: { enabled: false, depthCm: 300, heightCm: 280 },
    column: {
      enabled: false,
      offsetLeftCm: 40,
      widthCm: 20,
      depthCm: 31,
      heightCm: 100,
      bottomOffsetCm: 50,
    },
    openings: [],
    wallColor: '#f2efe6',
    surfacesHidden: false,
    ...overrides,
  });
}

function planFor(config: RoomArchitectureConfigLike, dimensions = { width: 1, height: 2.4, depth: 0.6 }) {
  return createRoomArchitecturePlanFromBuildSnapshot({
    cfg: { roomArchitecture: config },
    widthCm: dimensions.width * 100,
    heightCm: dimensions.height * 100,
    depthCm: dimensions.depth * 100,
  });
}

function boxVolume(box: AxisAlignedBox): number {
  return (box.maxX - box.minX) * (box.maxY - box.minY) * (box.maxZ - box.minZ);
}

test('room architecture plan constrains wall width, preserves offsets, and resolves side-wall orientation from one snapshot', () => {
  const config = canonicalRoom({
    backWall: { enabled: true, widthCm: 300, heightCm: 275, wardrobeOffsetLeftCm: 80 },
    leftWall: { enabled: true, depthCm: 260, heightCm: 250 },
    rightWall: { enabled: true, depthCm: 310, heightCm: 270 },
  });
  const plan = planFor(config, { width: 2.4, height: 2.2, depth: 0.7 });

  assert.equal(plan.config.backWall.widthCm, 300);
  assert.equal(plan.config.backWall.wardrobeOffsetLeftCm, 60);
  assertClose(plan.wall.width, 3);
  assertClose(plan.wall.height, 2.75);
  assertClose(plan.wall.minX, -1.8);
  assertClose(plan.wall.maxX, 1.2);
  assert.ok(plan.leftWall);
  assert.ok(plan.rightWall);
  assertClose(plan.leftWall?.maxZ ?? Number.NaN, plan.wall.maxZ + 2.6);
  assertClose(plan.rightWall?.maxZ ?? Number.NaN, plan.wall.maxZ + 3.1);
  assert.equal(plan.wallSurfaces.left?.axis, 'z');
  assert.equal(plan.wallSurfaces.left?.inwardNormalX, 1);
  assert.equal(plan.wallSurfaces.right?.axis, 'z');
  assert.equal(plan.wallSurfaces.right?.inwardNormalX, -1);
  assert.equal(plan.wallSurfaces.back?.axis, 'x');
  assert.equal(plan.wallSurfaces.back?.inwardNormalZ, 1);
});

test('room architecture plan disables side surfaces with the back wall and constrains undersized walls to wardrobe width', () => {
  const enabled = planFor(
    canonicalRoom({
      backWall: { enabled: true, widthCm: 180, heightCm: 250, wardrobeOffsetLeftCm: 40 },
      leftWall: { enabled: true, depthCm: 250, heightCm: 250 },
      rightWall: { enabled: true, depthCm: 250, heightCm: 250 },
    }),
    { width: 2.4, height: 2.4, depth: 0.6 }
  );
  assert.equal(enabled.config.backWall.widthCm, 240);
  assert.equal(enabled.config.backWall.wardrobeOffsetLeftCm, 0);
  assertClose(enabled.wall.minX, -1.2);
  assertClose(enabled.wall.maxX, 1.2);

  const disabled = planFor(
    canonicalRoom({
      backWall: { enabled: false, widthCm: 300, heightCm: 250, wardrobeOffsetLeftCm: 20 },
      leftWall: { enabled: true, depthCm: 250, heightCm: 250 },
      rightWall: { enabled: true, depthCm: 250, heightCm: 250 },
      column: { enabled: true, offsetLeftCm: 40, widthCm: 20, depthCm: 20, heightCm: 100, bottomOffsetCm: 0 },
    })
  );
  assert.equal(disabled.leftWall, null);
  assert.equal(disabled.rightWall, null);
  assert.equal(disabled.column, null);
  assert.deepEqual(disabled.wallSurfaces, { back: null, left: null, right: null });
  assert.equal(disabled.columnAdjustment, null);
});

test('room architecture plan preserves current dimension fallback behavior for malformed non-positive inputs', () => {
  const plan = createRoomArchitecturePlan({
    config: canonicalRoom(),
    wardrobeWidthM: Number.NaN,
    wardrobeHeightM: 0,
    wardrobeDepthM: Number.POSITIVE_INFINITY,
  });
  assert.equal(plan.wardrobeWidthM, 2.4);
  assert.equal(plan.wardrobeHeightM, 2.4);
  assert.equal(plan.wardrobeDepthM, 0.6);
  assert.deepEqual(plan.wardrobeBox, {
    minX: -1.2,
    maxX: 1.2,
    minY: 0,
    maxY: 2.4,
    minZ: -0.3,
    maxZ: 0.3,
  });
});

test('build-snapshot adapter canonicalizes malformed openings before the pure planner boundary', () => {
  const input = createRoomArchitecturePlanInputFromBuildSnapshot({
    cfg: {
      roomArchitecture: {
        backWall: { enabled: true, widthCm: 260, heightCm: 260, wardrobeOffsetLeftCm: 10 },
        leftWall: { enabled: true, depthCm: 220, heightCm: 240 },
        rightWall: { enabled: false, depthCm: 220, heightCm: 240 },
        column: {
          enabled: false,
          offsetLeftCm: 10,
          widthCm: 20,
          depthCm: 20,
          heightCm: 100,
          bottomOffsetCm: 0,
        },
        openings: [
          {
            id: 'bad-kind',
            kind: 'windowx',
            wall: 'back',
            widthCm: 100,
            heightCm: 100,
            offsetAlongCm: 0,
            bottomOffsetCm: 90,
          },
          {
            id: 'bad-wall',
            kind: 'window',
            wall: 'ceiling',
            widthCm: 100,
            heightCm: 100,
            offsetAlongCm: 0,
            bottomOffsetCm: 90,
          },
          {
            id: 'valid',
            kind: 'door',
            wall: 'left',
            widthCm: Number.NaN,
            heightCm: Number.POSITIVE_INFINITY,
            offsetAlongCm: -20,
            bottomOffsetCm: 50,
          },
        ],
        wallColor: '#ffffff',
        surfacesHidden: false,
      } as never,
    },
    widthCm: 240,
    heightCm: 240,
    depthCm: 60,
  });

  assert.equal(input.config.openings.length, 1);
  assert.equal(input.config.openings[0].id, 'valid');
  assert.equal(input.config.openings[0].kind, 'door');
  assert.equal(input.config.openings[0].wall, 'left');
  assert.equal(input.config.openings[0].widthCm, 90);
  assert.equal(input.config.openings[0].heightCm, 210);
  assert.equal(input.config.openings[0].offsetAlongCm, 0);
  assert.equal(input.config.openings[0].bottomOffsetCm, 0);
});

test('openings resolve on back/left/right surfaces with size, offset, bottom and disabled-wall constraints', () => {
  const plan = planFor(
    canonicalRoom({
      backWall: { enabled: true, widthCm: 300, heightCm: 260, wardrobeOffsetLeftCm: 20 },
      leftWall: { enabled: true, depthCm: 200, heightCm: 240 },
      rightWall: { enabled: false, depthCm: 180, heightCm: 230 },
      openings: [
        {
          id: 'back-window',
          kind: 'window',
          wall: 'back',
          widthCm: 500,
          heightCm: 500,
          offsetAlongCm: 999,
          bottomOffsetCm: 999,
        },
        {
          id: 'left-door',
          kind: 'door',
          wall: 'left',
          widthCm: 90,
          heightCm: 210,
          offsetAlongCm: 150,
          bottomOffsetCm: 120,
        },
        {
          id: 'disabled-right',
          kind: 'window',
          wall: 'right',
          widthCm: 80,
          heightCm: 90,
          offsetAlongCm: 20,
          bottomOffsetCm: 70,
        },
      ],
    }),
    { width: 2.4, height: 2.4, depth: 0.6 }
  );

  assert.equal(plan.resolvedOpenings.length, 2);
  const back = plan.resolvedOpenings.find(opening => opening.opening.id === 'back-window');
  const left = plan.resolvedOpenings.find(opening => opening.opening.id === 'left-door');
  assert.ok(back);
  assert.ok(left);
  assertClose(back?.width ?? Number.NaN, 3);
  assertClose(back?.height ?? Number.NaN, 2.6);
  assertClose(back?.offsetAlong ?? Number.NaN, 0);
  assertClose(back?.bottom ?? Number.NaN, 0);
  assert.deepEqual(back?.clearancesCm, { start: 0, end: 0, top: 0, bottom: 0 });
  assert.equal(left?.surface.wall, 'left');
  assertClose(left?.width ?? Number.NaN, 0.9);
  assertClose(left?.height ?? Number.NaN, 2.1);
  assertClose(left?.offsetAlong ?? Number.NaN, 1.1);
  assertClose(left?.bottom ?? Number.NaN, 0);
  assert.equal(left?.clearancesCm.end, 0);
  assert.equal(left?.clearancesCm.bottom, 0);
});

test('AABB intersection treats epsilon edge touch as empty and subtraction preserves only positive-volume pieces', () => {
  const source: AxisAlignedBox = { minX: 0, maxX: 2, minY: 0, maxY: 2, minZ: 0, maxZ: 2 };
  assert.equal(
    intersectAxisAlignedBoxes(source, { minX: 3, maxX: 4, minY: 0, maxY: 1, minZ: 0, maxZ: 1 }),
    null
  );
  assert.equal(
    intersectAxisAlignedBoxes(source, {
      minX: 2 - ROOM_ARCHITECTURE_EPSILON_M / 2,
      maxX: 3,
      minY: 0,
      maxY: 1,
      minZ: 0,
      maxZ: 1,
    }),
    null
  );
  assert.deepEqual(
    intersectAxisAlignedBoxes(source, { minX: 1, maxX: 3, minY: 0.5, maxY: 1.5, minZ: -1, maxZ: 1 }),
    { minX: 1, maxX: 2, minY: 0.5, maxY: 1.5, minZ: 0, maxZ: 1 }
  );
  assert.deepEqual(
    intersectAxisAlignedBoxes(source, { minX: 0.5, maxX: 1.5, minY: 0.5, maxY: 1.5, minZ: 0.5, maxZ: 1.5 }),
    { minX: 0.5, maxX: 1.5, minY: 0.5, maxY: 1.5, minZ: 0.5, maxZ: 1.5 }
  );

  const obstacle: AxisAlignedBox = { minX: 0.5, maxX: 1.5, minY: 0.5, maxY: 1.5, minZ: 0.5, maxZ: 1.5 };
  const pieces = subtractAxisAlignedBox(source, obstacle);
  assert.equal(pieces.length, 6);
  assert.ok(pieces.every(piece => boxVolume(piece) > ROOM_ARCHITECTURE_EPSILON_M ** 3));
  assertClose(
    pieces.reduce((total, piece) => total + boxVolume(piece), 0),
    boxVolume(source) - boxVolume(obstacle)
  );
  assert.deepEqual(subtractAxisAlignedBox(source, source), []);
});

test('column plan omits disabled/outside columns and resolves partial intrusions at wardrobe edges', () => {
  const disabled = planFor(canonicalRoom());
  assert.equal(disabled.columnAdjustment, null);
  assert.equal(disabled.activeCutObstacle, null);

  const outside = planFor(
    canonicalRoom({
      backWall: { enabled: true, widthCm: 400, heightCm: 280, wardrobeOffsetLeftCm: 150 },
      column: { enabled: true, offsetLeftCm: 0, widthCm: 20, depthCm: 31, heightCm: 100, bottomOffsetCm: 50 },
    })
  );
  assert.ok(outside.column);
  assert.equal(outside.columnAdjustment, null);

  const leftPartial = planFor(
    canonicalRoom({
      backWall: { enabled: true, widthCm: 120, heightCm: 280, wardrobeOffsetLeftCm: 20 },
      column: { enabled: true, offsetLeftCm: 0, widthCm: 30, depthCm: 31, heightCm: 100, bottomOffsetCm: 50 },
    })
  );
  assert.ok(leftPartial.columnAdjustment);
  assertClose(leftPartial.columnAdjustment?.intrusion.minX ?? Number.NaN, -0.5);
  assertClose(leftPartial.columnAdjustment?.intrusion.maxX ?? Number.NaN, -0.4);

  const rightPartial = planFor(
    canonicalRoom({
      backWall: { enabled: true, widthCm: 120, heightCm: 280, wardrobeOffsetLeftCm: 0 },
      column: {
        enabled: true,
        offsetLeftCm: 90,
        widthCm: 30,
        depthCm: 31,
        heightCm: 100,
        bottomOffsetCm: 50,
      },
    })
  );
  assert.ok(rightPartial.columnAdjustment);
  assertClose(rightPartial.columnAdjustment?.intrusion.minX ?? Number.NaN, 0.4);
  assertClose(rightPartial.columnAdjustment?.intrusion.maxX ?? Number.NaN, 0.5);
});

test('central column expands the cut for liner thickness and emits all five liner faces', () => {
  const plan = planFor(
    canonicalRoom({
      column: {
        enabled: true,
        offsetLeftCm: 40,
        widthCm: 20,
        depthCm: 31,
        heightCm: 100,
        bottomOffsetCm: 50,
      },
    })
  );
  const adjustment = plan.columnAdjustment;
  assert.ok(adjustment);
  assert.deepEqual(
    adjustment?.linerPanels.map(panel => panel.face),
    ['front', 'left', 'right', 'top', 'bottom']
  );
  assertClose(
    (adjustment?.cutObstacle.minX ?? 0) - (adjustment?.obstacle.minX ?? 0),
    -ROOM_COLUMN_LINER_THICKNESS_M
  );
  assertClose(
    (adjustment?.cutObstacle.maxX ?? 0) - (adjustment?.obstacle.maxX ?? 0),
    ROOM_COLUMN_LINER_THICKNESS_M
  );
  assertClose(
    (adjustment?.cutObstacle.minY ?? 0) - (adjustment?.obstacle.minY ?? 0),
    -ROOM_COLUMN_LINER_THICKNESS_M
  );
  assertClose(
    (adjustment?.cutObstacle.maxY ?? 0) - (adjustment?.obstacle.maxY ?? 0),
    ROOM_COLUMN_LINER_THICKNESS_M
  );
  assertClose(
    (adjustment?.cutObstacle.maxZ ?? 0) - (adjustment?.obstacle.maxZ ?? 0),
    ROOM_COLUMN_LINER_THICKNESS_M
  );
});

test('column liners respect enclosure edges at left/right/top/bottom and a full cut creates no liner volume', () => {
  const faces = (column: RoomArchitectureConfigLike['column']) =>
    planFor(canonicalRoom({ column })).columnAdjustment?.linerPanels.map(panel => panel.face) ?? [];

  assert.deepEqual(
    faces({ enabled: true, offsetLeftCm: 0, widthCm: 20, depthCm: 31, heightCm: 100, bottomOffsetCm: 0 }),
    ['front', 'right', 'top']
  );
  assert.deepEqual(
    faces({ enabled: true, offsetLeftCm: 80, widthCm: 20, depthCm: 31, heightCm: 100, bottomOffsetCm: 0 }),
    ['front', 'left', 'top']
  );
  assert.deepEqual(
    faces({ enabled: true, offsetLeftCm: 40, widthCm: 20, depthCm: 31, heightCm: 100, bottomOffsetCm: 0 }),
    ['front', 'left', 'right', 'top']
  );
  assert.deepEqual(
    faces({ enabled: true, offsetLeftCm: 40, widthCm: 20, depthCm: 31, heightCm: 100, bottomOffsetCm: 140 }),
    ['front', 'left', 'right', 'bottom']
  );

  const full = planFor(
    canonicalRoom({
      column: {
        enabled: true,
        offsetLeftCm: 0,
        widthCm: 100,
        depthCm: 100,
        heightCm: 240,
        bottomOffsetCm: 0,
      },
    })
  );
  assert.deepEqual(full.columnAdjustment?.cutIntrusion, full.wardrobeBox);
  assert.deepEqual(full.columnAdjustment?.linerPanels, []);
});

test('horizontal fitting span is unchanged without a column, clips at either edge, and is removed for central/full or too-short cuts', () => {
  const noColumn = planFor(canonicalRoom());
  const args = {
    centerX: 0,
    centerY: 1,
    centerZ: 0,
    length: 0.8,
    halfHeight: 0.01,
    halfDepth: 0.01,
    minUsableLength: 0.1,
  };
  assert.deepEqual(resolveHorizontalSpanAgainstRoomColumnCut(noColumn, args), {
    minX: -0.4,
    maxX: 0.4,
    centerX: 0,
    length: 0.8,
  });

  const left = planFor(
    canonicalRoom({
      column: { enabled: true, offsetLeftCm: 0, widthCm: 20, depthCm: 31, heightCm: 220, bottomOffsetCm: 0 },
    })
  );
  const leftClipped = resolveHorizontalSpanAgainstRoomColumnCut(left, args);
  assert.ok(leftClipped);
  assert.ok((leftClipped?.minX ?? -1) > -0.4);
  assertClose(leftClipped?.maxX ?? Number.NaN, 0.4);
  assert.ok((leftClipped?.centerX ?? 0) > 0);

  const right = planFor(
    canonicalRoom({
      column: { enabled: true, offsetLeftCm: 80, widthCm: 20, depthCm: 31, heightCm: 220, bottomOffsetCm: 0 },
    })
  );
  const rightClipped = resolveHorizontalSpanAgainstRoomColumnCut(right, args);
  assert.ok(rightClipped);
  assertClose(rightClipped?.minX ?? Number.NaN, -0.4);
  assert.ok((rightClipped?.maxX ?? 1) < 0.4);
  assert.ok((rightClipped?.centerX ?? 0) < 0);

  const central = planFor(
    canonicalRoom({
      column: { enabled: true, offsetLeftCm: 40, widthCm: 20, depthCm: 31, heightCm: 220, bottomOffsetCm: 0 },
    })
  );
  assert.equal(resolveHorizontalSpanAgainstRoomColumnCut(central, args), null);
  assert.equal(resolveHorizontalSpanAgainstRoomColumnCut(left, { ...args, minUsableLength: 0.7 }), null);
});

test('room architecture plan is deterministic and deeply immutable', () => {
  const input = {
    config: canonicalRoom({
      leftWall: { enabled: true, depthCm: 250, heightCm: 250 },
      column: {
        enabled: true,
        offsetLeftCm: 40,
        widthCm: 20,
        depthCm: 31,
        heightCm: 100,
        bottomOffsetCm: 50,
      },
      openings: [
        {
          id: 'window',
          kind: 'window',
          wall: 'back',
          widthCm: 80,
          heightCm: 100,
          offsetAlongCm: 10,
          bottomOffsetCm: 90,
        },
      ],
    }),
    wardrobeWidthM: 1,
    wardrobeHeightM: 2.4,
    wardrobeDepthM: 0.6,
  } as const;

  const first = createRoomArchitecturePlan(input);
  const second = createRoomArchitecturePlan(input);
  assert.deepEqual(first, second);
  assert.notEqual(first, second);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.config));
  assert.ok(Object.isFrozen(first.config.backWall));
  assert.ok(Object.isFrozen(first.resolvedOpenings));
  assert.ok(Object.isFrozen(first.resolvedOpenings[0]));
  assert.ok(Object.isFrozen(first.columnAdjustment));
  assert.ok(Object.isFrozen(first.columnAdjustment?.linerPanels));
});
