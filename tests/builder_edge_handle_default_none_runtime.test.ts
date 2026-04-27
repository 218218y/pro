import test from 'node:test';
import assert from 'node:assert/strict';

import { makeDoorStateAccessors, makeHandleTypeResolver } from '../esm/native/builder/doors_state_utils.ts';
import { createHandlesApplyRuntime } from '../esm/native/builder/handles_apply_shared.ts';
import {
  markEdgeHandleDefaultNone,
  resetEdgeHandleDefaultNoneCacheMaps,
} from '../esm/native/builder/edge_handle_default_none_runtime.ts';

function createApp(): any {
  return {
    services: {},
    render: { doors: [] },
    store: {
      getState() {
        return {
          ui: {},
          config: { globalHandleType: 'edge', handlesMap: {} },
          runtime: {},
          mode: {},
          meta: {},
        };
      },
    },
    actions: {
      cfg: {
        getSnapshot() {
          return { globalHandleType: 'edge', handlesMap: {} };
        },
      },
      ui: {
        getState() {
          return {};
        },
      },
    },
  };
}

test('builder edge-handle default-none runtime: door-state handle resolver reads canonical module/corner/pent cache ownership', () => {
  const App = createApp();
  resetEdgeHandleDefaultNoneCacheMaps(App);
  markEdgeHandleDefaultNone(App, 'top', 'd2');
  markEdgeHandleDefaultNone(App, 'top', 'corner_door_4', 'corner');
  markEdgeHandleDefaultNone(App, 'bottom', 'corner_pent_door_6', 'pent');

  const topResolver = makeHandleTypeResolver({
    App,
    cfg: { globalHandleType: 'edge', handlesMap: {} },
    doorState: makeDoorStateAccessors({}),
    handleControlEnabled: true,
    stackKey: 'top',
  });
  const bottomResolver = makeHandleTypeResolver({
    App,
    cfg: { globalHandleType: 'edge', handlesMap: {} },
    doorState: makeDoorStateAccessors({ splitDoorsBottomMap: {} }),
    handleControlEnabled: true,
    stackKey: 'bottom',
  });

  assert.equal(topResolver('d2'), 'none');
  assert.equal(topResolver('corner_door_4_full'), 'none');
  assert.equal(bottomResolver('corner_pent_door_6_bot'), 'none');
  assert.equal(topResolver('d9'), 'edge');
});

test('builder edge-handle default-none runtime: handles apply runtime reads the same canonical cache ownership', () => {
  const App = createApp();
  resetEdgeHandleDefaultNoneCacheMaps(App);
  markEdgeHandleDefaultNone(App, 'top', 'd8');
  markEdgeHandleDefaultNone(App, 'bottom', 'corner_pent_door_3', 'pent');

  const runtime = createHandlesApplyRuntime({ App });

  assert.equal(runtime.getHandleType('d8_full', 'top'), 'none');
  assert.equal(runtime.getHandleType('corner_pent_door_3_bot', 'bottom'), 'none');
  assert.equal(runtime.getHandleType('d11_full', 'top'), 'edge');
});
