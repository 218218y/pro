import test from 'node:test';
import assert from 'node:assert/strict';

import {
  __wp_measureObjectLocalBox,
  __wp_measureWardrobeLocalBox,
} from '../esm/native/services/canvas_picking_projection_runtime_box.ts';

function createApp(stateOverrides: Record<string, unknown> = {}, runtimeCache: Record<string, unknown> = {}) {
  const state = {
    ui: {
      doors: 0,
      raw: { doors: 0, width: 0, height: 0, depth: 0 },
    },
    config: {},
    mode: { primary: 'none' },
    ...stateOverrides,
  } as any;

  return {
    store: {
      getState() {
        return state;
      },
      patch() {
        return undefined;
      },
    },
    services: {
      runtimeCache,
    },
    render: {
      wardrobeGroup: null,
    },
  } as any;
}

test('projection box measures geometry parameters with local scale before any world bounds fallback', () => {
  const App = {} as any;
  const obj = {
    geometry: { parameters: { width: 0.8, height: 2, depth: 0.6 } },
    position: { x: 1.1, y: 1.4, z: -0.3 },
    scale: { x: 2, y: 0.5, z: 1.5 },
  } as any;

  const box = __wp_measureObjectLocalBox(App, obj);
  assert.ok(box);
  assert.equal(box?.centerX, 1.1);
  assert.equal(box?.centerY, 1.4);
  assert.equal(box?.centerZ, -0.3);
  assert.equal(box?.width, 1.6);
  assert.equal(box?.height, 1);
  assert.ok(Math.abs((box?.depth ?? 0) - 0.9) < 1e-9);
});

test('projection box uses cached no-main workspace metrics before raw ui fallback widths', () => {
  const App = createApp(
    {},
    {
      noMainSketchWorkspaceMetrics: {
        centerX: 0.2,
        centerY: 1.1,
        centerZ: -0.45,
        width: 2.4,
        height: 2.2,
        depth: 0.62,
      },
    }
  );

  const box = __wp_measureWardrobeLocalBox(App);
  assert.deepEqual(box, {
    centerX: 0.2,
    centerY: 1.1,
    centerZ: -0.45,
    width: 2.4,
    height: 2.2,
    depth: 0.62,
  });
});
