import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureRoomDesignService,
  getRoomDesignServiceMaybe,
} from '../esm/native/runtime/room_design_access.ts';
import { installRoomDesign } from '../esm/native/builder/room.ts';

type RoomApp = Record<string, any>;

function createRoomApp(floorType: string, roomDesign?: Record<string, unknown>): RoomApp {
  return {
    services: {
      roomDesign: roomDesign ?? {},
    },
    store: {
      getState() {
        return {
          ui: { currentFloorType: floorType },
          config: {},
          runtime: {},
          mode: {},
          meta: {},
        };
      },
    },
  };
}

test('roomDesign runtime seam reuses canonical service slot and installer binds onto it', () => {
  const App: Record<string, unknown> = {};

  const seeded = ensureRoomDesignService(App);
  seeded.seed = 'ok';

  assert.equal(getRoomDesignServiceMaybe(App), seeded);

  const installed = installRoomDesign(App as never);
  assert.equal(installed, seeded);
  assert.equal(installed.seed, 'ok');
  assert.equal(typeof installed.buildRoom, 'function');
  assert.equal(typeof installed.setActive, 'function');
});

test('roomDesign installer canonicalizes stale legacy callables and heals missing callable surface members', () => {
  const legacyGetFloorType = () => 'legacy';
  const App = createRoomApp('tiles', {
    __esm_v1: true,
    __wp_room_getFloorType: legacyGetFloorType,
  });

  const installed = installRoomDesign(App as never) as any;

  assert.notEqual(installed.__wp_room_getFloorType, legacyGetFloorType);
  assert.equal(installed.__wp_room_getFloorType(), 'tiles');
  assert.equal(typeof installed.buildRoom, 'function');
  assert.equal(typeof installed.resetRoomToDefault, 'function');
  assert.equal(typeof installed.updateFloorTexture, 'function');
  assert.equal(typeof installed.updateRoomWall, 'function');
  assert.equal(typeof installed.setActive, 'function');
  assert.equal(typeof installed.__wp_room_getLastStyleId, 'function');
  assert.equal(typeof installed.__wp_room_setLastStyleId, 'function');
  assert.equal(typeof installed.__wp_room_resolveStyle, 'function');
  assert.equal(typeof installed.createProceduralFloorTexture, 'function');
});

test('roomDesign stable callables keep held refs live across root replacement installs', () => {
  const AppA = createRoomApp('tiles');
  const installed = installRoomDesign(AppA as never) as any;
  const heldGetFloorType = installed.__wp_room_getFloorType;

  assert.equal(heldGetFloorType(), 'tiles');

  const AppB = createRoomApp('none', installed);
  const reinstalled = installRoomDesign(AppB as never) as any;

  assert.equal(reinstalled, installed);
  assert.equal(reinstalled.__wp_room_getFloorType, heldGetFloorType);
  assert.equal(heldGetFloorType(), 'none');
});

test('roomDesign reinstall heals public callable drift back to the canonical stable owner', () => {
  const App = createRoomApp('parquet');
  const installed = installRoomDesign(App as never) as any;
  const canonical = installed.__wp_room_getFloorType;

  installed.__wp_room_getFloorType = () => 'drifted';
  assert.equal(installed.__wp_room_getFloorType(), 'drifted');

  installRoomDesign(App as never);

  assert.equal(installed.__wp_room_getFloorType, canonical);
  assert.equal(installed.__wp_room_getFloorType(), 'parquet');
});
