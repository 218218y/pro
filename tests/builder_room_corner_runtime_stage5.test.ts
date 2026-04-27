import test from 'node:test';
import assert from 'node:assert/strict';

import { setRoomGroup } from '../esm/native/runtime/render_access.ts';
import {
  __readRoomDesignRuntimeFlags,
  __readRoomSceneNodes,
} from '../esm/native/builder/room_internal_shared.ts';
import {
  createEqualShelfBottomYs,
  createInsetPolygon,
  resolveCornerConnectorSpecialMetrics,
} from '../esm/native/builder/corner_connector_interior_special.ts';

function createStore(state: Record<string, unknown>) {
  return {
    getState() {
      return state;
    },
  };
}

test('room builder shared helpers read runtime flags and scene nodes through canonical seams', () => {
  const App: Record<string, unknown> = {
    store: createStore({
      runtime: { roomDesignActive: 'true', sketchMode: 1 },
      ui: {},
      config: {},
      mode: {},
      meta: {},
    }),
  };

  const floorMaterial = { marker: 'floor' };
  const roomWalls = {
    name: 'roomWalls',
    material: [{ color: { set() {}, setHex() {} } }],
  };
  const smartFloor = {
    name: 'smartFloor',
    material: floorMaterial,
  };
  const roomGroup = {
    getObjectByName(name: string) {
      if (name === 'roomWalls') return roomWalls;
      if (name === 'smartFloor') return smartFloor;
      return null;
    },
  };

  setRoomGroup(App, roomGroup as never);

  assert.deepEqual(__readRoomDesignRuntimeFlags(App as never), { isActive: true, isSketch: true });

  const nodes = __readRoomSceneNodes(App as never);
  assert.equal(nodes.roomGroup, roomGroup);
  assert.equal(nodes.walls, roomWalls);
  assert.equal(nodes.floor, smartFloor);
  assert.equal(nodes.floorMaterial, floorMaterial);
});

test('corner special metrics normalize depth, clearances, and optional wall offset into one plan', () => {
  const metrics = resolveCornerConnectorSpecialMetrics({
    uiAny: {
      cornerPentSpecialPostDepthCm: 70,
      cornerPentSpecialPostHeightCm: 210,
      cornerPentSpecialTopCellHeightCm: 28,
      cornerPentSpecialPostOffsetFromWallCm: 200,
    },
    mx: x => x,
    L: 1,
    Dmain: 0.6,
    woodThick: 0.018,
    startY: 0,
    wingH: 2.4,
    panelThick: 0.018,
    backPanelThick: 0.004,
    backPanelOutsideInsetZ: 0.002,
  });

  assert.ok(metrics);
  assert.equal(metrics?.depth, 0.6);
  assert.ok(Math.abs((metrics?.backInset ?? 0) - 0.0066) < 1e-9);
  assert.ok(Math.abs((metrics?.sideInset ?? 0) - 0.0186) < 1e-9);
  assert.ok(Math.abs((metrics?.wallX ?? 0) + 1) < 1e-9);
  assert.ok(Math.abs((metrics?.postX ?? 0) + 0.05) < 1e-9);
  assert.ok((metrics?.shelf2BottomY ?? 0) > (metrics?.shelf1BottomY ?? 0));
  assert.ok((metrics?.needH ?? 0) <= (metrics?.availH ?? 0) + 0.596);
});

test('corner special helpers derive equal shelf bottoms and inset polygons from pure geometry inputs', () => {
  const bottoms = createEqualShelfBottomYs({
    enabled: true,
    floorTopY: 0.018,
    targetTop: 1.8,
    woodThick: 0.018,
  });

  assert.equal(bottoms.length, 3);
  assert.ok(bottoms[0] < bottoms[1] && bottoms[1] < bottoms[2]);
  assert.ok(Math.abs(bottoms[0] - 0.45) < 0.02);
  assert.ok(Math.abs(bottoms[2] - 1.35) < 0.02);

  const inset = createInsetPolygon(
    [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 1, z: 1 },
      { x: 0, z: 1 },
    ],
    { x: 0.5, z: 0.5 },
    [0.1, 0.1, 0.1, 0.1]
  );

  assert.deepEqual(inset, [
    { x: 0.1, z: 0.1 },
    { x: 0.9, z: 0.1 },
    { x: 0.9, z: 0.9 },
    { x: 0.1, z: 0.9 },
  ]);
});
