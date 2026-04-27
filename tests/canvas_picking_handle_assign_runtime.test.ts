import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleCanvasHandleAssignClick } from '../esm/native/services/canvas_picking_handle_assign_flow.ts';

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
