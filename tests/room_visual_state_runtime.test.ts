import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ROOM_VISUAL_RESET_FLOOR_SIGNATURE,
  ROOM_VISUAL_RESET_WALL_COLOR,
  ROOM_VISUAL_RESET_WALL_HEX,
  areRoomNodeMaterialsTaggedWithWallColor,
  clearAppliedRoomVisualState,
  isAppliedRoomVisualDefaultState,
  markRoomMaterialFloorSignature,
  markRoomMaterialWallColor,
  markAppliedRoomFloorSignature,
  markAppliedRoomVisualDefaults,
  markAppliedRoomWallColor,
  readAppliedRoomFloorSignature,
  readRoomMaterialFloorSignature,
  readRoomMaterialWallColor,
  readAppliedRoomVisualState,
  readAppliedRoomWallColor,
  resetRoomFloorMaterialToDefault,
  setRoomMaterialTexture,
  syncRoomNodeMaterialsWallColor,
  syncRoomNodeVisibility,
} from '../esm/native/builder/room_visual_state_runtime.ts';

type AnyRecord = Record<string, any>;

function createApp(): AnyRecord {
  return {
    services: {
      roomDesign: {},
    },
  };
}

test('room visual state runtime: applied floor/wall state roundtrips through one canonical owner', () => {
  const App = createApp();

  assert.deepEqual(readAppliedRoomVisualState(App as never), {
    floorSignature: null,
    wallColor: null,
  });
  assert.equal(isAppliedRoomVisualDefaultState(App as never), false);

  markAppliedRoomFloorSignature(App as never, 'tiles|marble');
  markAppliedRoomWallColor(App as never, '#eceff1');

  assert.equal(readAppliedRoomFloorSignature(App as never), 'tiles|marble');
  assert.equal(readAppliedRoomWallColor(App as never), '#eceff1');
  assert.deepEqual(readAppliedRoomVisualState(App as never), {
    floorSignature: 'tiles|marble',
    wallColor: '#eceff1',
  });

  markAppliedRoomVisualDefaults(App as never);

  assert.deepEqual(readAppliedRoomVisualState(App as never), {
    floorSignature: ROOM_VISUAL_RESET_FLOOR_SIGNATURE,
    wallColor: ROOM_VISUAL_RESET_WALL_COLOR,
  });
  assert.equal(isAppliedRoomVisualDefaultState(App as never), true);

  clearAppliedRoomVisualState(App as never);
  assert.deepEqual(readAppliedRoomVisualState(App as never), {
    floorSignature: null,
    wallColor: null,
  });
  assert.equal(isAppliedRoomVisualDefaultState(App as never), false);
});

test('room visual state runtime: visibility sync heals drift without fake churn', () => {
  const node: AnyRecord = { visible: true };

  assert.equal(syncRoomNodeVisibility(node, true), false);
  assert.equal(node.visible, true);

  assert.equal(syncRoomNodeVisibility(node, false), true);
  assert.equal(node.visible, false);

  assert.equal(syncRoomNodeVisibility(node, false), false);
  assert.equal(syncRoomNodeVisibility(null, true), false);
});

test('room visual state runtime: material tags heal wall/floor drift without fake churn', () => {
  const wallA: AnyRecord = {
    color: {
      set(value: string) {
        wallA.lastColor = value;
      },
    },
    needsUpdate: false,
  };
  const wallB: AnyRecord = {
    color: {
      set(value: string) {
        wallB.lastColor = value;
      },
    },
    needsUpdate: false,
  };
  const walls: AnyRecord = { material: [wallA, wallB] };
  const floorMaterial: AnyRecord = {
    color: {
      setHex(value: number) {
        floorMaterial.lastHex = value;
      },
    },
    map: null,
    needsUpdate: false,
  };

  assert.equal(areRoomNodeMaterialsTaggedWithWallColor(walls, '#fafafa'), false);
  assert.equal(syncRoomNodeMaterialsWallColor(walls, '#fafafa'), true);
  assert.equal(syncRoomNodeMaterialsWallColor(walls, '#fafafa'), false);
  assert.equal(readRoomMaterialWallColor(wallA), '#fafafa');
  assert.equal(readRoomMaterialWallColor(wallB), '#fafafa');
  assert.equal(areRoomNodeMaterialsTaggedWithWallColor(walls, '#fafafa'), true);
  assert.equal(wallA.needsUpdate, true);
  assert.equal(wallB.needsUpdate, true);

  markRoomMaterialWallColor(wallB, null);
  assert.equal(areRoomNodeMaterialsTaggedWithWallColor(walls, '#fafafa'), false);
  assert.equal(syncRoomNodeMaterialsWallColor(walls, '#fafafa'), true);
  assert.equal(readRoomMaterialWallColor(wallB), '#fafafa');

  markRoomMaterialFloorSignature(floorMaterial, 'tiles|marble');
  assert.equal(readRoomMaterialFloorSignature(floorMaterial), 'tiles|marble');

  resetRoomFloorMaterialToDefault(floorMaterial);
  assert.equal(readRoomMaterialFloorSignature(floorMaterial), ROOM_VISUAL_RESET_FLOOR_SIGNATURE);
  assert.equal(floorMaterial.lastHex, ROOM_VISUAL_RESET_WALL_HEX);
  assert.equal(floorMaterial.needsUpdate, true);
});

test('room visual state runtime: texture replacement and reset dispose previous textures without fake churn', () => {
  const firstTexture = {
    disposed: false,
    dispose() {
      this.disposed = true;
    },
  };
  const secondTexture = {
    disposed: false,
    dispose() {
      this.disposed = true;
    },
  };
  const material: AnyRecord = {
    map: firstTexture,
    color: {
      setHex(value: number) {
        material.lastHex = value;
      },
    },
    needsUpdate: false,
  };

  setRoomMaterialTexture(material, secondTexture);
  assert.equal(firstTexture.disposed, true);
  assert.equal(secondTexture.disposed, false);
  assert.equal(material.map, secondTexture);

  setRoomMaterialTexture(material, secondTexture);
  assert.equal(secondTexture.disposed, false);
  assert.equal(material.map, secondTexture);

  resetRoomFloorMaterialToDefault(material);
  assert.equal(secondTexture.disposed, true);
  assert.equal(material.map, null);
  assert.equal(material.lastHex, ROOM_VISUAL_RESET_WALL_HEX);
  assert.equal(material.needsUpdate, true);
});
