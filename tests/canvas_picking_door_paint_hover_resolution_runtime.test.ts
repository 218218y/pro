import test from 'node:test';
import assert from 'node:assert/strict';

import { __resolveHoverHit } from '../esm/native/services/canvas_picking_door_hover_targets_hit.ts';

function vector(x = 0, y = 1, z = 0) {
  return {
    x,
    y,
    z,
    set(nextX: number, nextY: number, nextZ: number) {
      this.x = nextX;
      this.y = nextY;
      this.z = nextZ;
      return this;
    },
  };
}

function node(partId: string | null, parent: any = null, extraUserData: Record<string, unknown> = {}) {
  return {
    type: 'Mesh',
    material: { visible: true, opacity: 1 },
    userData: { ...(partId ? { partId } : {}), ...extraUserData },
    parent,
    children: [],
  } as any;
}

function createFixture(intersects: any[]) {
  const wardrobeGroup = node('wardrobe-root');
  wardrobeGroup.type = 'Group';
  const App = {
    render: {
      renderer: {},
      camera: {},
      wardrobeGroup,
    },
  } as any;
  let raycastObjects: unknown = null;

  const resolve = (matchesPartId: (partId: string) => boolean) =>
    __resolveHoverHit(
      {
        App,
        ndcX: 0,
        ndcY: 0,
        raycaster: {} as never,
        mouse: { x: 0, y: 0 } as never,
        getViewportRoots: () => ({ camera: App.render.camera, wardrobeGroup }),
        getSplitHoverRaycastRoots: () => ['split-root'],
        raycastReuse: args => {
          raycastObjects = args.objects;
          return intersects;
        },
        isViewportRoot: (_App, candidate) => candidate === wardrobeGroup,
        str: (_App, value) => String(value),
        isDoorLikePartId: partId => /^d\d+_/.test(partId),
        isDoorOrDrawerLikePartId: partId => /^d\d+_/.test(partId),
        paintUsesWardrobeGroup: true,
      },
      matchesPartId
    );

  return { App, wardrobeGroup, resolve, raycastObjects: () => raycastObjects };
}

test('paint door hover raycasts the full wardrobe root instead of split-door roots', () => {
  const door = node('d1_full');
  const hit = { object: door, point: vector(0, 1.1, 0) };
  const liveFixture = createFixture([hit]);
  door.parent = liveFixture.wardrobeGroup;

  const resolved = liveFixture.resolve(partId => partId === 'd1_full');

  assert.equal(resolved?.hitDoorPid, 'd1_full');
  assert.deepEqual(liveFixture.raycastObjects(), [liveFixture.wardrobeGroup]);
});

test('paint door hover stops when a closer paintable non-door part blocks the matching door', () => {
  const blocker = node('body_left');
  const door = node('d1_full');
  const liveFixture = createFixture([
    { object: blocker, point: vector(0, 1.2, 0.1) },
    { object: door, point: vector(0, 1.1, 0) },
  ]);
  blocker.parent = liveFixture.wardrobeGroup;
  door.parent = liveFixture.wardrobeGroup;

  assert.equal(
    liveFixture.resolve(partId => partId === 'd1_full'),
    null
  );
});

test('paint door hover resolves the first eligible matching hit and never previews a deeper door', () => {
  const helper = node(null, null, { isModuleSelector: true });
  const frontDoor = node('d1_full');
  const deepDoor = node('d2_full');
  const liveFixture = createFixture([
    { object: helper, point: vector(0, 1.3, 0.2) },
    { object: frontDoor, point: vector(0, 1.2, 0.1) },
    { object: deepDoor, point: vector(0, 1.1, 0) },
  ]);
  helper.parent = liveFixture.wardrobeGroup;
  frontDoor.parent = liveFixture.wardrobeGroup;
  deepDoor.parent = liveFixture.wardrobeGroup;

  const resolved = liveFixture.resolve(partId => partId === 'd1_full' || partId === 'd2_full');

  assert.equal(resolved?.hitDoorPid, 'd1_full');
  assert.equal(resolved?.hitDoorGroup, frontDoor);
});
