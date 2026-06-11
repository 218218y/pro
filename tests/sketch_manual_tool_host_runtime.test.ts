import test from 'node:test';
import assert from 'node:assert/strict';

import { getInternalGridMap } from '../esm/native/runtime/cache_access.ts';
import { readActiveManualTool } from '../esm/native/services/canvas_picking_manual_tool_access.ts';
import { pickSketchFreeBoxHost } from '../esm/native/services/canvas_picking_sketch_free_boxes.ts';

type AppLike = {
  store: {
    getState: () => Record<string, unknown>;
    patch: () => void;
  };
  services?: Record<string, unknown>;
};

function createApp(
  overrides: {
    state?: Record<string, unknown>;
    services?: Record<string, unknown>;
  } = {}
): AppLike {
  const state = {
    ui: { raw: {} },
    config: {},
    runtime: {},
    mode: { opts: {} },
    meta: {},
    ...(overrides.state || {}),
  };

  return {
    store: {
      getState: () => state,
      patch: () => undefined,
    },
    services: { ...(overrides.services || {}) },
  };
}

test('manual tool access prefers canonical mode-state value before runtime tools fallback', () => {
  const App = createApp({
    state: {
      mode: { opts: { manualTool: 'sketch_box:90:55:45' } },
    },
    services: {
      tools: {
        getInteriorManualTool: () => 'rod',
      },
    },
  });

  assert.equal(readActiveManualTool(App as never), 'sketch_box:90:55:45');
});

test('manual tool access falls back to runtime tools when mode-state tool is absent', () => {
  const App = createApp({
    state: {
      mode: { opts: {} },
    },
    services: {
      tools: {
        getInteriorManualTool: () => 'sketch_shelf:glass',
      },
    },
  });

  assert.equal(readActiveManualTool(App as never), 'sketch_shelf:glass');
});

test('sketch-free host falls back to internal grid maps before the zero-door hinged default host', () => {
  const App = createApp({
    state: {
      config: {},
      ui: { raw: {} },
    },
  });

  const topGrid = getInternalGridMap(App as never, false);
  topGrid['3'] = { module: true };
  topGrid['1'] = { module: true };
  topGrid['corner:2'] = { module: true };

  const bottomGrid = getInternalGridMap(App as never, true);
  bottomGrid['corner:5'] = { module: true };

  assert.deepEqual(pickSketchFreeBoxHost(App as never), { moduleKey: 1, isBottom: false });

  delete topGrid['1'];
  delete topGrid['3'];

  assert.deepEqual(pickSketchFreeBoxHost(App as never), { moduleKey: 'corner:2', isBottom: false });

  delete topGrid['corner:2'];

  assert.deepEqual(pickSketchFreeBoxHost(App as never), { moduleKey: 'corner:5', isBottom: true });
});

test('sketch-free host uses the hinged zero-door fallback only when no config or grid host exists', () => {
  const App = createApp({
    state: {
      config: { wardrobeType: 'hinged' },
      ui: { raw: { doors: 0 } },
    },
  });

  assert.deepEqual(pickSketchFreeBoxHost(App as never), { moduleKey: 0, isBottom: false });
});
