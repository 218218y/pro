import test from 'node:test';
import assert from 'node:assert/strict';

import { getRoomGroup, setRoomGroup } from '../esm/native/runtime/render_access.ts';
import {
  buildRoom,
  installRoomDesign,
  resetRoomToDefault,
  updateFloorTexture,
  updateRoomWall,
} from '../esm/native/builder/room.ts';
import { _asCanvasLike } from '../esm/native/builder/room_internal_shared.ts';

type AnyRecord = Record<string, any>;

type TextureRecord = {
  canvas: unknown;
  repeat: { set: (x: number, y: number) => void };
  dispose: () => void;
  disposed: boolean;
};

function createCanvasContext() {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    globalAlpha: 1,
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    arc() {},
    fill() {},
  };
}

function createCanvasLike() {
  const ctx = createCanvasContext();
  return {
    width: 0,
    height: 0,
    getContext(type: '2d') {
      return type === '2d' ? ctx : null;
    },
  };
}

function createThreeRoomHarness() {
  let renderCount = 0;
  let textureCreateCount = 0;
  const runtimeState = { roomDesignActive: true, sketchMode: false };

  class Group {
    children: AnyRecord[] = [];
    name = '';
    add(child: AnyRecord) {
      this.children.push(child);
      child.parent = this;
    }
    getObjectByName(name: string) {
      return this.children.find(child => child && child.name === name) || null;
    }
  }

  class PlaneGeometry {
    constructor(
      public width: number,
      public height: number
    ) {}
  }

  class BoxGeometry {
    constructor(
      public width: number,
      public height: number,
      public depth: number
    ) {}
  }

  class MeshStandardMaterial {
    map: unknown = null;
    needsUpdate = false;
    lastColor: string | null = null;
    lastHex: number | null = null;
    color = {
      set: (value: string) => {
        this.lastColor = value;
      },
      setHex: (value: number) => {
        this.lastHex = value;
      },
    };
    constructor(public opts: AnyRecord) {}
  }

  class MeshBasicMaterial extends MeshStandardMaterial {}

  class Mesh {
    rotation = { x: 0, y: 0, z: 0 };
    position = {
      x: 0,
      y: 0,
      z: 0,
      set: (x: number, y: number, z: number) => {
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
      },
    };
    receiveShadow = false;
    visible = true;
    name = '';
    parent: AnyRecord | null = null;
    constructor(
      public geometry: unknown,
      public material: AnyRecord
    ) {}
  }

  class CanvasTexture {
    repeat = { set() {} };
    disposed = false;
    canvas: unknown;
    constructor(canvas: unknown) {
      textureCreateCount += 1;
      this.canvas = canvas;
    }
    dispose() {
      this.disposed = true;
    }
  }

  const scene = {
    children: [] as AnyRecord[],
    add(obj: AnyRecord) {
      this.children.push(obj);
      obj.parent = this;
    },
    remove(obj: AnyRecord) {
      this.children = this.children.filter(entry => entry !== obj);
      if (obj && typeof obj === 'object') obj.parent = null;
    },
    getObjectByName(name: string) {
      return this.children.find(child => child && child.name === name) || null;
    },
  };

  const App: AnyRecord = {
    services: { roomDesign: {} },
    deps: {
      THREE: {
        Group,
        PlaneGeometry,
        MeshStandardMaterial,
        Mesh,
        BoxGeometry,
        MeshBasicMaterial,
        CanvasTexture,
        RepeatWrapping: 'repeat',
        SRGBColorSpace: 'srgb',
        BackSide: 'back',
      },
    },
    platform: {
      createCanvas() {
        return createCanvasLike();
      },
      triggerRender() {
        renderCount += 1;
      },
    },
    render: { scene },
    store: {
      getState() {
        return {
          ui: {
            currentFloorType: 'parquet',
            lastSelectedFloorStyleIdByType: { parquet: 'oak_light' },
            lastSelectedWallColor: '#ffffff',
          },
          runtime: runtimeState,
          config: {},
          mode: {},
          meta: {},
        };
      },
    },
  };

  installRoomDesign(App as never);

  return {
    App,
    scene,
    getRenderCount() {
      return renderCount;
    },
    getTextureCreateCount() {
      return textureCreateCount;
    },
  };
}

function createRoomHarness() {
  let textureCreateCount = 0;
  let renderCount = 0;
  const runtimeState = { roomDesignActive: true, sketchMode: false };
  const createdTextures: TextureRecord[] = [];
  const floorMaterial: AnyRecord = {
    color: {
      set(value: string) {
        floorMaterial.lastColor = value;
      },
      setHex(value: number) {
        floorMaterial.lastHex = value;
      },
    },
    map: null,
    needsUpdate: false,
  };
  const roomWalls: AnyRecord = {
    name: 'roomWalls',
    material: [
      {
        color: {
          set(value: string) {
            roomWalls.lastColor = value;
          },
          setHex(value: number) {
            roomWalls.lastHex = value;
          },
        },
      },
    ],
  };
  const smartFloor: AnyRecord = {
    name: 'smartFloor',
    material: floorMaterial,
    visible: true,
  };
  const roomGroup: AnyRecord = {
    getObjectByName(name: string) {
      if (name === 'roomWalls') return roomWalls;
      if (name === 'smartFloor') return smartFloor;
      return null;
    },
  };
  const App: AnyRecord = {
    services: { roomDesign: {} },
    deps: {
      THREE: {
        CanvasTexture: class {
          repeat = { set() {} };
          disposed = false;
          canvas: unknown;
          constructor(canvas: unknown) {
            textureCreateCount += 1;
            this.canvas = canvas;
            createdTextures.push(this as unknown as TextureRecord);
          }
          dispose() {
            this.disposed = true;
          }
        },
        RepeatWrapping: 'repeat',
        SRGBColorSpace: 'srgb',
      },
    },
    platform: {
      createCanvas() {
        return createCanvasLike();
      },
      triggerRender() {
        renderCount += 1;
      },
    },
    store: {
      getState() {
        return {
          ui: {
            currentFloorType: 'parquet',
            lastSelectedFloorStyleIdByType: { parquet: 'oak_light' },
            lastSelectedWallColor: '#ffffff',
          },
          runtime: runtimeState,
          config: {},
          mode: {},
          meta: {},
        };
      },
    },
  };

  installRoomDesign(App as never);
  setRoomGroup(App as never, roomGroup as never);

  return {
    App,
    smartFloor,
    floorMaterial,
    roomWalls,
    runtimeState,
    createdTextures,
    getTextureCreateCount() {
      return textureCreateCount;
    },
    getRenderCount() {
      return renderCount;
    },
  };
}

test('builder room runtime: canvas-like structural objects stay valid outside browser-only globals', () => {
  const canvasLike = createCanvasLike();
  assert.equal(_asCanvasLike(canvasLike), canvasLike);
});

test('builder room runtime: identical floor updates do not churn textures or renders', () => {
  const harness = createRoomHarness();

  updateFloorTexture({ id: 'oak_light', color1: '#eaddcf', color2: '#d4c5b0' }, null, harness.App as never);
  assert.equal(harness.getTextureCreateCount(), 1);
  assert.equal(harness.getRenderCount(), 1);
  const firstTexture = harness.floorMaterial.map;

  updateFloorTexture({ id: 'oak_light', color1: '#eaddcf', color2: '#d4c5b0' }, null, harness.App as never);
  assert.equal(harness.getTextureCreateCount(), 1);
  assert.equal(harness.getRenderCount(), 1);
  assert.equal(harness.floorMaterial.map, firstTexture);
});

test('builder room runtime: same floor signature still renders once when sketch visibility changes', () => {
  const harness = createRoomHarness();

  updateFloorTexture({ id: 'oak_light', color1: '#eaddcf', color2: '#d4c5b0' }, null, harness.App as never);
  assert.equal(harness.smartFloor.visible, true);
  assert.equal(harness.getRenderCount(), 1);

  harness.runtimeState.sketchMode = true;
  updateFloorTexture({ id: 'oak_light', color1: '#eaddcf', color2: '#d4c5b0' }, null, harness.App as never);

  assert.equal(harness.smartFloor.visible, false);
  assert.equal(harness.getTextureCreateCount(), 1);
  assert.equal(harness.getRenderCount(), 2);
});

test('builder room runtime: default reset heals sketch visibility drift without replaying full reset work', () => {
  const harness = createRoomHarness();

  resetRoomToDefault(harness.App as never);
  assert.equal(harness.smartFloor.visible, true);
  assert.equal(harness.getRenderCount(), 1);

  harness.runtimeState.sketchMode = true;
  resetRoomToDefault(harness.App as never);

  assert.equal(harness.smartFloor.visible, false);
  assert.equal(harness.floorMaterial.map, null);
  assert.equal(harness.getTextureCreateCount(), 0);
  assert.equal(harness.getRenderCount(), 2);

  resetRoomToDefault(harness.App as never);
  assert.equal(harness.getRenderCount(), 2);
});

test('builder room runtime: replacing floor styles disposes the previous texture and renders once', () => {
  const harness = createRoomHarness();

  updateFloorTexture({ id: 'oak_light', color1: '#eaddcf', color2: '#d4c5b0' }, null, harness.App as never);
  const firstTexture = harness.floorMaterial.map as TextureRecord;
  assert.equal(firstTexture.disposed, false);

  updateFloorTexture({ id: 'walnut', color1: '#8d6e63', color2: '#795548' }, null, harness.App as never);

  assert.equal(harness.getTextureCreateCount(), 2);
  assert.equal(firstTexture.disposed, true);
  assert.notEqual(harness.floorMaterial.map, firstTexture);
  assert.equal(harness.getRenderCount(), 2);
});

test('builder room runtime: identical wall colors and repeated default resets stay idempotent', () => {
  const harness = createRoomHarness();

  updateRoomWall('#fafafa', null, harness.App as never);
  assert.equal(harness.roomWalls.lastColor, '#fafafa');
  assert.equal(harness.getRenderCount(), 1);

  updateRoomWall('#fafafa', null, harness.App as never);
  assert.equal(harness.getRenderCount(), 1);

  resetRoomToDefault(harness.App as never);
  assert.equal(harness.getRenderCount(), 2);
  assert.equal(harness.roomWalls.lastColor, '#ffffff');

  resetRoomToDefault(harness.App as never);
  assert.equal(harness.getRenderCount(), 2);
});

test('builder room runtime: same wall color heals replaced wall materials and renders once', () => {
  const harness = createRoomHarness();

  updateRoomWall('#fafafa', null, harness.App as never);
  assert.equal(harness.getRenderCount(), 1);

  const replacementWallMaterial: AnyRecord = {
    color: {
      set(value: string) {
        replacementWallMaterial.lastColor = value;
      },
      setHex(value: number) {
        replacementWallMaterial.lastHex = value;
      },
    },
  };
  harness.roomWalls.material = [replacementWallMaterial];

  updateRoomWall('#fafafa', null, harness.App as never);

  assert.equal(replacementWallMaterial.lastColor, '#fafafa');
  assert.equal(harness.getRenderCount(), 2);
});

test('builder room runtime: default reset heals replaced room materials without replaying texture churn', () => {
  const harness = createRoomHarness();

  resetRoomToDefault(harness.App as never);
  assert.equal(harness.getRenderCount(), 1);

  const replacementFloorMaterial: AnyRecord = {
    color: {
      set(value: string) {
        replacementFloorMaterial.lastColor = value;
      },
      setHex(value: number) {
        replacementFloorMaterial.lastHex = value;
      },
    },
    map: { stale: true },
    needsUpdate: false,
  };
  const replacementWallMaterial: AnyRecord = {
    color: {
      set(value: string) {
        replacementWallMaterial.lastColor = value;
      },
      setHex(value: number) {
        replacementWallMaterial.lastHex = value;
      },
    },
    needsUpdate: false,
  };
  harness.smartFloor.material = replacementFloorMaterial;
  harness.roomWalls.material = [replacementWallMaterial];

  resetRoomToDefault(harness.App as never);

  assert.equal(replacementFloorMaterial.map, null);
  assert.equal(replacementFloorMaterial.lastHex, 0xffffff);
  assert.equal(replacementWallMaterial.lastColor, '#ffffff');
  assert.equal(harness.getTextureCreateCount(), 0);
  assert.equal(harness.getRenderCount(), 2);

  resetRoomToDefault(harness.App as never);
  assert.equal(harness.getRenderCount(), 2);
});

test('builder room runtime: buildRoom batches active room design into one render and reapplies visuals after primitive rebuild', () => {
  const harness = createThreeRoomHarness();

  buildRoom(true, harness.App as never);
  assert.equal(harness.getRenderCount(), 1);
  assert.equal(harness.getTextureCreateCount(), 1);

  const firstRoomGroup = getRoomGroup(harness.App as never) as AnyRecord;
  const firstFloor = firstRoomGroup.getObjectByName('smartFloor') as AnyRecord;
  const firstFloorTexture = firstFloor.material.map;
  const firstWalls = firstRoomGroup.getObjectByName('roomWalls') as AnyRecord;
  assert.ok(firstFloorTexture);
  assert.equal(firstWalls.material.lastColor, '#ffffff');

  buildRoom(true, harness.App as never);

  assert.equal(harness.getRenderCount(), 2);
  assert.equal(harness.getTextureCreateCount(), 2);

  const secondRoomGroup = getRoomGroup(harness.App as never) as AnyRecord;
  const secondFloor = secondRoomGroup.getObjectByName('smartFloor') as AnyRecord;
  const secondWalls = secondRoomGroup.getObjectByName('roomWalls') as AnyRecord;
  assert.notEqual(secondRoomGroup, firstRoomGroup);
  assert.notEqual(secondFloor.material.map, firstFloorTexture);
  assert.ok(secondFloor.material.map);
  assert.equal(secondWalls.material.lastColor, '#ffffff');
});
