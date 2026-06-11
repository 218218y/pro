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

test('cache_access migrates legacy root cache bag into canonical runtimeCache service slot', () => {
  const legacyTop = { persisted: true } as any;
  const App: any = {
    cache: {
      stackSplitLowerTopY: 12,
      internalGridMap: legacyTop,
    },
  };

  const cache = getRuntimeCacheServiceMaybe(App);

  assert.equal(cache, App.services.runtimeCache);
  assert.equal(App.cache, undefined);
  assert.equal(readStackSplitLowerTopY(App), 12);
  assert.equal(getInternalGridMap(App), legacyTop);

  const reset = resetInternalGridMaps(App);
  assert.notEqual(reset.top, legacyTop);
  assert.equal(App.services.runtimeCache.internalGridMap, reset.top);
  assert.equal(App.services.runtimeCache.internalGridMapSplitBottom, reset.bottom);
});
