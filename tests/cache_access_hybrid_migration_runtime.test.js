import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { loadTsRuntimeModule } from './_ts_runtime_module_loader.mjs';
function loadTsModule(relPath, cache = new Map()) {
  return loadTsRuntimeModule(path.join(process.cwd(), relPath), { cache });
}

const { getInternalGridMap, getRuntimeCacheServiceMaybe, readStackSplitLowerTopY } = loadTsModule(
  'esm/native/runtime/cache_access.ts'
);

test('cache_access drops hybrid root cache without overwriting canonical values', () => {
  const canonicalTop = {
    shared: { source: 'runtime-cache' },
    liveOnly: { source: 'runtime-cache' },
  };
  const canonicalBottom = {
    bottomLive: { source: 'runtime-cache' },
  };
  const App = {
    services: {
      runtimeCache: {
        stackSplitLowerTopY: 44,
        internalGridMap: canonicalTop,
        internalGridMapSplitBottom: canonicalBottom,
        noMainSketchWorkspaceMetrics: { source: 'runtime-cache' },
      },
    },
    cache: {
      stackSplitLowerTopY: 12,
      internalGridMap: {
        shared: { source: 'root-cache' },
        rootOnly: { source: 'root-cache' },
      },
      internalGridMapSplitBottom: {
        bottomLive: { source: 'root-cache' },
        bottomRootOnly: { source: 'root-cache' },
      },
      lateOnlyMetric: { source: 'root-cache' },
    },
  };

  const cache = getRuntimeCacheServiceMaybe(App);

  assert.equal(cache, App.services.runtimeCache);
  assert.equal(App.cache, undefined);
  assert.equal(readStackSplitLowerTopY(App), 44);
  assert.equal(App.services.runtimeCache.internalGridMap, canonicalTop);
  assert.equal(App.services.runtimeCache.internalGridMap.shared.source, 'runtime-cache');
  assert.equal(App.services.runtimeCache.internalGridMap.liveOnly.source, 'runtime-cache');
  assert.equal('rootOnly' in App.services.runtimeCache.internalGridMap, false);
  assert.equal(App.services.runtimeCache.internalGridMapSplitBottom, canonicalBottom);
  assert.equal(App.services.runtimeCache.internalGridMapSplitBottom.bottomLive.source, 'runtime-cache');
  assert.equal('bottomRootOnly' in App.services.runtimeCache.internalGridMapSplitBottom, false);
  assert.deepEqual(App.services.runtimeCache.noMainSketchWorkspaceMetrics, { source: 'runtime-cache' });
  assert.equal('lateOnlyMetric' in App.services.runtimeCache, false);
});

test('cache_access drops root cache when no runtimeCache exists', () => {
  const top = { migrated: true };
  const App = {
    cache: {
      stackSplitLowerTopY: 12,
      internalGridMap: top,
    },
  };

  const cache = getRuntimeCacheServiceMaybe(App);

  assert.equal(cache, null);
  assert.equal(App.cache, undefined);
  assert.equal(App.services, undefined);
  assert.equal(readStackSplitLowerTopY(App), null);
  assert.notEqual(getInternalGridMap(App), top);
});
