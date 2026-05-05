import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getBrowserTimers,
  getBrowserFetchMaybe,
  getLocationSearchMaybe,
  getUserAgentMaybe,
} from '../esm/native/runtime/browser_env.ts';
import {
  getInternalGridMap,
  getRuntimeCacheServiceMaybe,
  readStackSplitLowerTopY,
  resetInternalGridMaps,
  writeStackSplitLowerTopY,
} from '../esm/native/runtime/cache_access.ts';

test('browser_env prefers injected browser deps and cache_access keeps normalized cache seams stable', async () => {
  const marks: string[] = [];
  const fetchCalls: Array<[unknown, unknown]> = [];
  const App: any = {
    deps: {
      browser: {
        window: {
          document: { createElement: () => ({}), querySelector: () => null },
          navigator: { userAgent: 'fallback-UA' },
          location: { search: '?fallback=1' },
        },
        document: { createElement: () => ({}), querySelector: () => null },
        navigator: { userAgent: 'Injected-UA' },
        location: { search: '?strict=1' },
        setTimeout: (fn: () => void) => {
          marks.push('setTimeout');
          fn();
          return 11;
        },
        clearTimeout: () => {
          marks.push('clearTimeout');
        },
        setInterval: (fn: () => void) => {
          marks.push('setInterval');
          fn();
          return 22;
        },
        clearInterval: () => {
          marks.push('clearInterval');
        },
        requestAnimationFrame: (cb: FrameRequestCallback) => {
          marks.push('raf');
          cb(123);
          return 33;
        },
        cancelAnimationFrame: () => {
          marks.push('caf');
        },
        queueMicrotask: (cb: () => void) => {
          marks.push('qm');
          cb();
        },
        performanceNow: () => 456,
        fetch: async (input: unknown, init?: unknown) => {
          fetchCalls.push([input, init]);
          return { ok: true } as Response;
        },
      },
    },
  };

  const timers = getBrowserTimers(App);
  assert.equal(
    timers.setTimeout(() => marks.push('timeout-run')),
    11
  );
  assert.equal(
    timers.setInterval(() => marks.push('interval-run')),
    22
  );
  assert.equal(
    timers.requestAnimationFrame(() => marks.push('raf-run')),
    33
  );
  timers.clearTimeout(undefined);
  timers.clearInterval(undefined);
  timers.cancelAnimationFrame(33);
  timers.queueMicrotask?.(() => marks.push('qm-run'));
  assert.equal(timers.now(), 456);

  const fetch = getBrowserFetchMaybe(App);
  assert.equal(typeof fetch, 'function');
  await fetch?.('/api/test', { method: 'POST' } as RequestInit);
  assert.deepEqual(fetchCalls, [['/api/test', { method: 'POST' }]]);
  assert.equal(getLocationSearchMaybe(App), '?strict=1');
  assert.equal(getUserAgentMaybe(App), 'Injected-UA');

  writeStackSplitLowerTopY(App, '91.5');
  assert.equal(readStackSplitLowerTopY(App), 91.5);
  assert.equal(App.cache, undefined);
  assert.equal(App.services?.runtimeCache, getRuntimeCacheServiceMaybe(App));

  const top = getInternalGridMap(App);
  top.alpha = true;
  assert.equal(getInternalGridMap(App).alpha, true);

  const reset = resetInternalGridMaps(App);
  assert.notEqual(reset.top, top);
  assert.deepEqual(Object.keys(reset.top), []);
  assert.deepEqual(Object.keys(reset.bottom), []);

  assert.deepEqual(marks, [
    'setTimeout',
    'timeout-run',
    'setInterval',
    'interval-run',
    'raf',
    'raf-run',
    'clearTimeout',
    'clearInterval',
    'caf',
    'qm',
    'qm-run',
  ]);
});

test('cache_access drops obsolete root cache alias without adopting it into runtimeCache', () => {
  const rootTop = { persisted: true } as any;
  const App: any = {
    cache: {
      stackSplitLowerTopY: 12,
      internalGridMap: rootTop,
    },
  };

  const cache = getRuntimeCacheServiceMaybe(App);

  assert.equal(cache, null);
  assert.equal(App.cache, undefined);
  assert.equal(App.services, undefined);
  assert.equal(readStackSplitLowerTopY(App), null);
  assert.notEqual(getInternalGridMap(App), rootTop);

  const reset = resetInternalGridMaps(App);
  assert.notEqual(reset.top, rootTop);
  assert.equal(App.services.runtimeCache.internalGridMap, reset.top);
  assert.equal(App.services.runtimeCache.internalGridMapSplitBottom, reset.bottom);
});

test('cache_access drops hybrid root cache without overwriting canonical runtimeCache values', () => {
  const canonicalTop = {
    shared: { source: 'runtime-cache' },
    liveOnly: { source: 'runtime-cache' },
  } as any;
  const canonicalBottom = {
    bottomLive: { source: 'runtime-cache' },
  } as any;
  const App: any = {
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
