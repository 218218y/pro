import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createNoMainSketchModuleConfig,
  syncNoMainSketchWorkspaceMetrics,
} from '../esm/native/builder/build_no_main_sketch_host.ts';
import { __readNoMainWardrobeFallbackBox } from '../esm/native/services/canvas_picking_projection_runtime_box_wardrobe_fallback.ts';

type AnyRecord = Record<string, any>;

function createApp(overrides: Partial<AnyRecord> = {}): AnyRecord {
  const state = {
    ui: {
      doors: 0,
      width: 0,
      height: 0,
      depth: 0,
      raw: { doors: 0, width: 0, height: 0, depth: 0 },
    },
    config: {},
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false, version: 0, updatedAt: 0 },
    ...(overrides.state || {}),
  };

  return {
    services: {
      runtimeCache: {},
      ...(overrides.services || {}),
    },
    store: {
      getState: () => state,
      patch: () => undefined,
    },
    ...overrides,
  };
}

test('no-main sketch workspace runtime: module config keeps only free-placement boxes and preserves explicit sketch extras', () => {
  const next = createNoMainSketchModuleConfig({
    layout: 'drawers',
    extDrawersCount: 4,
    sketchExtras: {
      boxes: [
        { id: 'free-a', freePlacement: true, absX: -0.5, widthM: 0.6 },
        { id: 'module-a', absX: 0.1, widthM: 0.8 },
        { id: 'free-b', freePlacement: true, absX: 0.7, widthM: 0.4 },
      ],
      shelves: [{ id: 'shelf-1' }],
      storageBarriers: [{ id: 'barrier-1' }],
      rods: [{ id: 'rod-1' }],
      drawers: [{ id: 'drawer-1' }],
    },
  });

  assert.equal(next.layout, 'shelves');
  assert.equal(next.extDrawersCount, 0);
  assert.equal(next.hasDrawersInside, false);
  assert.deepEqual(next.sketchExtras?.boxes, [
    { id: 'free-a', freePlacement: true, absX: -0.5, widthM: 0.6 },
    { id: 'free-b', freePlacement: true, absX: 0.7, widthM: 0.4 },
  ]);
  assert.deepEqual(next.sketchExtras?.shelves, [{ id: 'shelf-1' }]);
  assert.deepEqual(next.sketchExtras?.storageBarriers, [{ id: 'barrier-1' }]);
  assert.deepEqual(next.sketchExtras?.rods, [{ id: 'rod-1' }]);
  assert.deepEqual(next.sketchExtras?.drawers, [{ id: 'drawer-1' }]);
});

test('no-main sketch workspace runtime: cache metrics and wardrobe fallback use canonical free-box workspace span', () => {
  const App = createApp({
    state: {
      ui: {
        doors: 0,
        width: 0,
        height: 0,
        depth: 0,
        raw: { doors: 0, width: 0, height: 0, depth: 0 },
      },
      config: {
        modulesConfiguration: [
          {
            sketchExtras: {
              boxes: [
                { id: 'free-a', freePlacement: true, absX: -0.5, widthM: 0.6 },
                { id: 'module-a', absX: 0.1, widthM: 0.8 },
                { id: 'free-b', freePlacement: true, absX: 0.7, widthM: 0.4 },
              ],
            },
          },
        ],
      },
    },
  });

  syncNoMainSketchWorkspaceMetrics({
    App,
    enabled: true,
    cfg: App.store.getState().config,
    totalW: 0,
    H: 2.4,
    woodThick: 0.02,
    internalDepth: 0.56,
    internalZ: -0.31,
  });

  const metrics = App.services.runtimeCache.noMainSketchWorkspaceMetrics;
  assert.equal(metrics.centerX, 0);
  assert.equal(metrics.centerY, 1.2);
  assert.equal(metrics.centerZ, -0.31);
  assert.ok(Math.abs(metrics.width - 1.82) < 1e-9);
  assert.equal(metrics.height, 2.4);
  assert.equal(metrics.depth, 0.56);
  assert.ok(Math.abs(metrics.backZ - -0.59) < 1e-9);

  const cachedBox = __readNoMainWardrobeFallbackBox(App);
  assert.ok(cachedBox);
  assert.equal(cachedBox?.centerX, 0);
  assert.equal(cachedBox?.centerY, 1.2);
  assert.equal(cachedBox?.centerZ, -0.31);
  assert.ok(Math.abs((cachedBox?.width || 0) - 1.82) < 1e-9);
  assert.equal(cachedBox?.height, 2.4);
  assert.equal(cachedBox?.depth, 0.56);

  App.services.runtimeCache.noMainSketchWorkspaceMetrics = null;

  const fallbackBox = __readNoMainWardrobeFallbackBox(App);
  assert.ok(fallbackBox);
  assert.equal(fallbackBox?.centerX, 0);
  assert.equal(fallbackBox?.centerY, 1.2);
  assert.equal(fallbackBox?.centerZ, -0.275);
  assert.ok(Math.abs((fallbackBox?.width || 0) - 1.82) < 1e-9);
  assert.equal(fallbackBox?.height, 2.4);
  assert.equal(fallbackBox?.depth, 0.55);
});
