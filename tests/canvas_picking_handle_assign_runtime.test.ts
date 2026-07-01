import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleCanvasHandleAssignClick } from '../esm/native/services/canvas_picking_handle_assign_flow.ts';
import { readManualHandlePosition } from '../esm/native/features/manual_handle_position.ts';

test('handle assign click reads parent-chain part ids and preserves edge variant writes through typed mode opts', () => {
  const calls: Array<{ op: string; args: unknown[]; owner?: unknown }> = [];
  const App: any = {
    store: {
      getState() {
        return {
          ui: {},
          config: {},
          runtime: {},
          mode: { opts: { edgeHandleVariant: 'left' } },
          meta: {},
        };
      },
      patch() {
        return undefined;
      },
    },
    services: {
      tools: {
        getHandlesType() {
          return 'edge';
        },
      },
    },
    maps: {
      setHandle(partId: string, handleType: string, meta?: unknown) {
        calls.push({ op: 'setHandle', args: [partId, handleType, meta], owner: this });
      },
      setKey(mapName: string, key: string, value: unknown, meta?: unknown) {
        calls.push({ op: 'setKey', args: [mapName, key, value, meta], owner: this });
      },
    },
  };

  const primaryHitObject = {
    userData: {},
    parent: {
      userData: { partId: 'd12_front' },
      parent: null,
    },
  };

  const handled = tryHandleCanvasHandleAssignClick({
    App,
    primaryHitObject,
    foundDrawerId: null,
    effectiveDoorId: null,
    foundPartId: null,
    isHandleEditMode: true,
  });

  assert.equal(handled, true);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].op, 'setHandle');
  assert.deepEqual(calls[0].args, ['d12_front', 'edge', { source: 'handles:assign', immediate: true }]);
  assert.equal(calls[1].op, 'setHandle');
  assert.deepEqual(calls[1].args, [
    '__wp_edge_handle_variant:d12_front',
    'short',
    { source: 'handles:assignEdgeVariant', immediate: true },
  ]);
  assert.equal(calls[0].owner, App.maps);
  assert.equal(calls[1].owner, App.maps);
  assert.equal(calls[2].op, 'setHandle');
  assert.deepEqual(calls[2].args, [
    '__wp_handle_color:d12_front',
    'nickel',
    { source: 'handles:assignColor', immediate: true },
  ]);
  assert.equal(calls[2].owner, App.maps);
});

test('manual handle position click stores normalized door-local position and explicit handle override', () => {
  const calls: Array<{ op: string; args: unknown[]; owner?: unknown }> = [];
  class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  }

  const App: any = {
    deps: { THREE: { Vector3 } },
    store: {
      getState() {
        return {
          ui: {},
          config: {},
          runtime: {},
          mode: { opts: { handlePlacement: 'manual', handleColor: undefined } },
          meta: {},
        };
      },
      patch() {
        return undefined;
      },
    },
    services: {
      tools: {
        getHandlesType() {
          return 'none';
        },
      },
    },
    maps: {
      setHandle(partId: string, handleType: string, meta?: unknown) {
        calls.push({ op: 'setHandle', args: [partId, handleType, meta], owner: this });
      },
      setKey(mapName: string, key: string, value: unknown, meta?: unknown) {
        calls.push({ op: 'setKey', args: [mapName, key, value, meta], owner: this });
      },
    },
  };

  const doorHitObject = {
    userData: { partId: 'd2_full', __doorWidth: 1, __doorHeight: 2 },
    worldToLocal(target: Vector3) {
      return target;
    },
    parent: null,
  };

  const handled = tryHandleCanvasHandleAssignClick({
    App,
    primaryHitObject: doorHitObject,
    doorHitObject,
    primaryHitPoint: { x: 0.25, y: 0.5, z: 0 },
    doorHitPoint: { x: 0.25, y: 0.5, z: 0 },
    foundDrawerId: null,
    effectiveDoorId: null,
    foundPartId: null,
    isHandleEditMode: true,
  });

  assert.equal(handled, true);
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0].args, ['d2_full', 'standard', { source: 'handles:assign', immediate: true }]);
  assert.deepEqual(calls[1].args, [
    '__wp_handle_color:d2_full',
    'nickel',
    { source: 'handles:assignColor', immediate: true },
  ]);
  assert.equal(calls[2].op, 'setHandle');
  assert.equal(calls[2].args[0], '__wp_manual_handle_position:d2_full');
  assert.deepEqual(JSON.parse(String(calls[2].args[1])), { xRatio: 0.75, yRatio: 0.75 });
  assert.deepEqual(calls[2].args[2], { source: 'handles:assignManualPosition', immediate: true });
});

test('manual handle position click stores drawer-local position for external drawer fronts', () => {
  const calls: Array<{ op: string; args: unknown[]; owner?: unknown }> = [];
  class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  }

  const App: any = {
    deps: { THREE: { Vector3 } },
    store: {
      getState() {
        return {
          ui: {},
          config: {},
          runtime: {},
          mode: { opts: { handlePlacement: 'manual', handleColor: 'black' } },
          meta: {},
        };
      },
      patch() {
        return undefined;
      },
    },
    services: {
      tools: {
        getHandlesType() {
          return 'edge';
        },
      },
    },
    maps: {
      setHandle(partId: string, handleType: string, meta?: unknown) {
        calls.push({ op: 'setHandle', args: [partId, handleType, meta], owner: this });
      },
      setKey(mapName: string, key: string, value: unknown, meta?: unknown) {
        calls.push({ op: 'setKey', args: [mapName, key, value, meta], owner: this });
      },
    },
  };

  const drawerOwner = {
    userData: { partId: 'd2_draw_0', __doorWidth: 1.2, __doorHeight: 0.2 },
    worldToLocal(target: Vector3) {
      return target;
    },
    parent: null,
  };

  const handled = tryHandleCanvasHandleAssignClick({
    App,
    primaryHitObject: drawerOwner,
    doorHitObject: null,
    primaryHitPoint: { x: 0.3, y: 0.04, z: 0 },
    doorHitPoint: null,
    foundDrawerId: 'd2_draw_0',
    effectiveDoorId: null,
    foundPartId: null,
    isHandleEditMode: true,
  });

  assert.equal(handled, true);
  assert.equal(calls.length, 4);
  assert.deepEqual(calls[0].args, ['d2_draw_0', 'edge', { source: 'handles:assign', immediate: true }]);
  assert.deepEqual(calls[1].args, [
    '__wp_edge_handle_variant:d2_draw_0',
    'short',
    { source: 'handles:assignEdgeVariant', immediate: true },
  ]);
  assert.deepEqual(calls[2].args, [
    '__wp_handle_color:d2_draw_0',
    'black',
    { source: 'handles:assignColor', immediate: true },
  ]);
  assert.equal(calls[3].op, 'setHandle');
  assert.equal(calls[3].args[0], '__wp_manual_handle_position:d2_draw_0');
  const manualPosition = JSON.parse(String(calls[3].args[1]));
  assert.ok(Math.abs(Number(manualPosition.xRatio) - 0.75) < 1e-12);
  assert.ok(Math.abs(Number(manualPosition.yRatio) - 0.7) < 1e-12);
  assert.deepEqual(calls[3].args[2], { source: 'handles:assignManualPosition', immediate: true });
});

test('manual handle position reader accepts the canonical serialized shape only', () => {
  assert.deepEqual(readManualHandlePosition('{"xRatio":0.25,"yRatio":0.75}'), {
    xRatio: 0.25,
    yRatio: 0.75,
  });
  assert.equal(readManualHandlePosition('0.25,0.75'), null);
});

test('handle assignment treats chest drawers as drawers without targeting chest frame parts', () => {
  const calls: Array<{ op: string; args: unknown[] }> = [];
  const App: any = {
    store: {
      getState() {
        return {
          ui: {},
          config: {},
          runtime: {},
          mode: { opts: {} },
          meta: {},
        };
      },
      patch() {
        return undefined;
      },
    },
    services: {
      tools: {
        getHandlesType() {
          return 'standard';
        },
      },
    },
    maps: {
      setHandle(partId: string, handleType: string, meta?: unknown) {
        calls.push({ op: 'setHandle', args: [partId, handleType, meta] });
      },
      setKey(mapName: string, key: string, value: unknown, meta?: unknown) {
        calls.push({ op: 'setKey', args: [mapName, key, value, meta] });
      },
    },
  };

  tryHandleCanvasHandleAssignClick({
    App,
    primaryHitObject: { userData: { partId: 'chest_left' }, parent: null },
    foundDrawerId: null,
    effectiveDoorId: null,
    foundPartId: null,
    isHandleEditMode: true,
  });
  assert.deepEqual(calls, []);

  tryHandleCanvasHandleAssignClick({
    App,
    primaryHitObject: { userData: { partId: 'chest_drawer_0' }, parent: null },
    foundDrawerId: null,
    effectiveDoorId: null,
    foundPartId: null,
    isHandleEditMode: true,
  });
  assert.equal(calls[0].op, 'setHandle');
  assert.deepEqual(calls[0].args, [
    'chest_drawer_0',
    'standard',
    { source: 'handles:assign', immediate: true },
  ]);
});

test('handle assignment targets internal drawer owner ids from drawer-box hits', () => {
  const calls: Array<{ op: string; args: unknown[] }> = [];
  const App: any = {
    store: {
      getState() {
        return {
          ui: {},
          config: {},
          runtime: {},
          mode: { opts: { handleColor: 'black' } },
          meta: {},
        };
      },
      patch() {
        return undefined;
      },
    },
    services: {
      tools: {
        getHandlesType() {
          return 'standard';
        },
      },
    },
    maps: {
      setHandle(partId: string, handleType: string, meta?: unknown) {
        calls.push({ op: 'setHandle', args: [partId, handleType, meta] });
      },
      setKey(mapName: string, key: string, value: unknown, meta?: unknown) {
        calls.push({ op: 'setKey', args: [mapName, key, value, meta] });
      },
    },
  };

  const internalDrawerBox = {
    userData: {
      partId: 'drawer_box__div_int_sketch_0_d1_lower',
      __wpInternalDrawerBox: true,
      __wpDrawerOwnerPartId: 'div_int_sketch_0_d1_lower',
      __doorWidth: 0.68,
      __doorHeight: 0.18,
    },
    parent: null,
  };
  const frontPanel = { userData: {}, parent: internalDrawerBox };

  const handled = tryHandleCanvasHandleAssignClick({
    App,
    primaryHitObject: frontPanel,
    foundDrawerId: 'div_int_sketch_0_d1_lower',
    effectiveDoorId: null,
    foundPartId: 'drawer_box__div_int_sketch_0_d1_lower',
    isHandleEditMode: true,
  });

  assert.equal(handled, true);
  assert.deepEqual(calls[0].args, [
    'div_int_sketch_0_d1_lower',
    'standard',
    { source: 'handles:assign', immediate: true },
  ]);
  assert.deepEqual(calls[1].args, [
    '__wp_handle_color:div_int_sketch_0_d1_lower',
    'black',
    { source: 'handles:assignColor', immediate: true },
  ]);
});

test('normal handle assignment clears a previous manual door handle position', () => {
  const calls: Array<{ op: string; args: unknown[] }> = [];
  const App: any = {
    store: {
      getState() {
        return {
          ui: {},
          config: {},
          runtime: {},
          mode: { opts: { handleColor: 'black' } },
          meta: {},
        };
      },
      patch() {
        return undefined;
      },
    },
    services: {
      tools: {
        getHandlesType() {
          return 'standard';
        },
      },
    },
    maps: {
      handlesMap: {
        '__wp_manual_handle_position:d3_full': '{"xRatio":0.4,"yRatio":0.6}',
      },
      setHandle(partId: string, handleType: string, meta?: unknown) {
        calls.push({ op: 'setHandle', args: [partId, handleType, meta] });
      },
      setKey(mapName: string, key: string, value: unknown, meta?: unknown) {
        calls.push({ op: 'setKey', args: [mapName, key, value, meta] });
      },
    },
  };

  const primaryHitObject = {
    userData: { partId: 'd3_full' },
    parent: null,
  };

  const handled = tryHandleCanvasHandleAssignClick({
    App,
    primaryHitObject,
    foundDrawerId: null,
    effectiveDoorId: null,
    foundPartId: null,
    isHandleEditMode: true,
  });

  assert.equal(handled, true);
  assert.deepEqual(calls[0].args, [
    '__wp_manual_handle_position:d3_full',
    null,
    { source: 'handles:clearManualPosition', immediate: true },
  ]);
  assert.deepEqual(calls[1].args, ['d3_full', 'standard', { source: 'handles:assign', immediate: true }]);
});
