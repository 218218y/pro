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
  assert.equal(calls[1].op, 'setKey');
  assert.deepEqual(calls[1].args, [
    'handlesMap',
    '__wp_edge_handle_variant:d12_front',
    'short',
    { source: 'handles:assignEdgeVariant', immediate: true },
  ]);
  assert.equal(calls[0].owner, App.maps);
  assert.equal(calls[1].owner, App.maps);
  assert.equal(calls[2].op, 'setKey');
  assert.deepEqual(calls[2].args, [
    'handlesMap',
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
    'handlesMap',
    '__wp_handle_color:d2_full',
    'nickel',
    { source: 'handles:assignColor', immediate: true },
  ]);
  assert.equal(calls[2].op, 'setKey');
  assert.equal(calls[2].args[0], 'handlesMap');
  assert.equal(calls[2].args[1], '__wp_manual_handle_position:d2_full');
  assert.deepEqual(JSON.parse(String(calls[2].args[2])), { xRatio: 0.75, yRatio: 0.75 });
  assert.deepEqual(calls[2].args[3], { source: 'handles:assignManualPosition', immediate: true });
});

test('manual handle position reader accepts the canonical serialized shape only', () => {
  assert.deepEqual(readManualHandlePosition('{"xRatio":0.25,"yRatio":0.75}'), {
    xRatio: 0.25,
    yRatio: 0.75,
  });
  assert.equal(readManualHandlePosition('0.25,0.75'), null);
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
    'handlesMap',
    '__wp_manual_handle_position:d3_full',
    null,
    { source: 'handles:clearManualPosition', immediate: true },
  ]);
  assert.deepEqual(calls[1].args, ['d3_full', 'standard', { source: 'handles:assign', immediate: true }]);
});
