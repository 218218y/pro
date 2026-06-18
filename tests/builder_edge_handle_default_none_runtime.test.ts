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

function readConfigSnapshot(App: any): Record<string, unknown> {
  return App.store.getState().config;
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

  const runtime = createHandlesApplyRuntime({ App, cfgSnapshot: readConfigSnapshot(App) });

  assert.equal(runtime.getHandleType('d8_full', 'top'), 'none');
  assert.equal(runtime.getHandleType('corner_pent_door_3_bot', 'bottom'), 'none');
  assert.equal(runtime.getHandleType('d11_full', 'top'), 'edge');
});

test('builder handle resolvers default sketch-box internal drawer handles to none', () => {
  const App = {
    ...createApp(),
    store: {
      getState() {
        return {
          ui: {},
          config: { globalHandleType: 'standard', handlesMap: {} },
          runtime: {},
          mode: {},
          meta: {},
        };
      },
    },
  } as any;

  const runtime = createHandlesApplyRuntime({ App, cfgSnapshot: readConfigSnapshot(App) });

  assert.equal(runtime.getHandleType('div_int_sketch_0_d1_lower'), 'none');
  assert.equal(runtime.getHandleType('box_0_int_drawers_d1_lower'), 'none');
  assert.equal(runtime.getHandleType('sketch_box_free_0_freeDrawerBox_int_drawers_fd1_upper'), 'none');
  assert.equal(runtime.getHandleType('sketch_box_free_0_freeDrawerBox_ext_drawers_ed1_0'), 'standard');
});

test('builder handle resolvers still honor explicit sketch-box internal drawer handle overrides', () => {
  const handlesMap = {
    box_0_int_drawers_d1_lower: 'edge',
    sketch_box_free_0_freeDrawerBox_int_drawers_fd1_upper: 'standard',
  };
  const App = {
    ...createApp(),
    maps: {
      getMap(name: string) {
        return name === 'handlesMap' ? handlesMap : {};
      },
    },
    store: {
      getState() {
        return {
          ui: {},
          config: {
            globalHandleType: 'standard',
            handlesMap,
          },
          runtime: {},
          mode: {},
          meta: {},
        };
      },
    },
  } as any;

  const runtime = createHandlesApplyRuntime({ App, cfgSnapshot: readConfigSnapshot(App) });

  assert.equal(runtime.getHandleType('box_0_int_drawers_d1_lower'), 'edge');
  assert.equal(runtime.getHandleType('sketch_box_free_0_freeDrawerBox_int_drawers_fd1_upper'), 'standard');
});
