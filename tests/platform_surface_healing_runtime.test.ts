import test from 'node:test';
import assert from 'node:assert/strict';

import { installPlatformUtilSurface } from '../esm/native/platform/platform_util.ts';
import { installPlatformServiceSurface } from '../esm/native/platform/platform_services.ts';
import { PLATFORM_STARTUP_DIMENSION_DEFAULTS_POLICY } from '../esm/shared/dimensions/platform_startup_dimension_defaults_policy.ts';
import { getDefaultDepthForWardrobeType } from '../esm/shared/dimensions/wardrobe_default_resolution_policy.ts';
import { DEFAULT_HEIGHT, DEFAULT_WIDTH } from '../esm/shared/dimensions/wardrobe_defaults.ts';

test('platform util install heals drifted util/reportError seams while preserving canonical refs', () => {
  const calls: unknown[] = [];
  const legacyReportError = (err: unknown, ctx?: unknown) => calls.push(['report', err, ctx]);
  const App: any = {
    platform: {
      util: Object.create(null),
      reportError: legacyReportError,
    },
  };

  installPlatformUtilSurface(App, {
    getVerboseCfg: () => ({ enabled: true, dedupeMs: 0 }),
    isDebugOn: () => true,
    setTimeoutFn: (fn: () => void) => {
      fn();
      return 1;
    },
    clearTimeoutFn: () => {},
    requestAnimationFrameFn: (cb: (ts?: number) => void) => {
      cb(0);
      return 1;
    },
    requestIdleCallbackFn: null,
  });

  const firstClone = App.platform.util.clone;
  const firstReportError = App.platform.reportError;
  const firstAfterPaint = App.platform.util.afterPaint;

  delete App.platform.util.clone;
  App.platform.reportError = () => calls.push(['stale']);
  delete App.platform.util.afterPaint;

  installPlatformUtilSurface(App, {
    getVerboseCfg: () => ({ enabled: true, dedupeMs: 0 }),
    isDebugOn: () => true,
    setTimeoutFn: (fn: () => void) => {
      fn();
      return 2;
    },
    clearTimeoutFn: () => {},
    requestAnimationFrameFn: (cb: (ts?: number) => void) => {
      cb(0);
      return 2;
    },
    requestIdleCallbackFn: null,
  });

  assert.equal(App.platform.util.clone, firstClone);
  assert.equal(App.platform.reportError, firstReportError);
  assert.equal(App.platform.util.afterPaint, firstAfterPaint);
  App.platform.reportError('boom', 'ctx');
  const clone = App.platform.util.clone({ a: 1 });
  assert.deepEqual(clone, { a: 1 });
  assert.deepEqual(calls, [['report', 'boom', 'ctx']]);
});

test('platform util afterPaint prefers idle work after the paint boundary when available', () => {
  const App: any = { platform: { util: Object.create(null) } };
  const order: string[] = [];
  const rafQueue: Array<(ts?: number) => void> = [];
  const idleQueue: Array<() => void> = [];
  const timeoutQueue: Array<() => void> = [];

  installPlatformUtilSurface(App, {
    getVerboseCfg: () => ({ enabled: true, dedupeMs: 0 }),
    isDebugOn: () => true,
    setTimeoutFn: (fn: () => void) => {
      timeoutQueue.push(fn);
      return timeoutQueue.length;
    },
    clearTimeoutFn: () => {},
    requestAnimationFrameFn: (cb: (ts?: number) => void) => {
      rafQueue.push(cb);
      return rafQueue.length;
    },
    requestIdleCallbackFn: cb => {
      idleQueue.push(cb);
      return idleQueue.length;
    },
  });

  App.platform.util.afterPaint(() => order.push('afterPaint-task'));

  assert.equal(rafQueue.length, 1);
  assert.equal(idleQueue.length, 0);
  assert.equal(timeoutQueue.length, 0);
  assert.deepEqual(order, []);

  rafQueue.shift()?.(0);
  assert.equal(rafQueue.length, 1);
  assert.equal(idleQueue.length, 0);
  assert.equal(timeoutQueue.length, 0);
  assert.deepEqual(order, []);

  rafQueue.shift()?.(16);
  assert.equal(idleQueue.length, 1);
  assert.equal(timeoutQueue.length, 0);
  assert.deepEqual(order, [], 'second RAF should schedule idle work but not run it inline');

  idleQueue.shift()?.();
  assert.deepEqual(order, ['afterPaint-task']);
});

test('platform util afterPaint falls back to a macrotask when idle callback is unavailable', () => {
  const App: any = { platform: { util: Object.create(null) } };
  const order: string[] = [];
  const rafQueue: Array<(ts?: number) => void> = [];
  const timeoutQueue: Array<() => void> = [];

  installPlatformUtilSurface(App, {
    getVerboseCfg: () => ({ enabled: true, dedupeMs: 0 }),
    isDebugOn: () => true,
    setTimeoutFn: (fn: () => void) => {
      timeoutQueue.push(fn);
      return timeoutQueue.length;
    },
    clearTimeoutFn: () => {},
    requestAnimationFrameFn: (cb: (ts?: number) => void) => {
      rafQueue.push(cb);
      return rafQueue.length;
    },
    requestIdleCallbackFn: null,
  });

  App.platform.util.afterPaint(() => order.push('afterPaint-task'));

  rafQueue.shift()?.(0);
  rafQueue.shift()?.(16);

  assert.equal(timeoutQueue.length, 1);
  assert.deepEqual(order, [], 'second RAF should schedule the task but not run it inline');

  timeoutQueue.shift()?.();
  assert.deepEqual(order, ['afterPaint-task']);
});

test('platform service install heals drifted service seams while preserving canonical refs', () => {
  const legacyGetBuildUI = () => ({ width: 180, height: 240, depth: 55 });
  const App: any = {
    services: {
      platform: Object.assign(Object.create(null), {
        getBuildUI: legacyGetBuildUI,
      }),
    },
    store: {
      getState: () => ({
        ui: {},
        config: {},
        runtime: { wardrobeWidthM: 2.2, wardrobeHeightM: 2.4, wardrobeDepthM: 0.55 },
        mode: {},
        meta: {},
      }),
    },
    render: Object.create(null),
    lifecycle: Object.create(null),
  };

  installPlatformServiceSurface(App, (cb: (ts?: number) => void) => {
    cb(0);
    return 1;
  });

  const firstGetBuildUI = App.services.platform.getBuildUI;
  const firstGetDimsM = App.services.platform.getDimsM;
  const firstSetAnimate = App.services.platform.setAnimate;
  const firstEnsureRenderLoop = App.services.platform.ensureRenderLoop;

  App.services.platform.getBuildUI = () => ({ width: 999, height: 999, depth: 999 });
  delete App.services.platform.getDimsM;
  delete App.services.platform.setAnimate;
  delete App.services.platform.ensureRenderLoop;

  installPlatformServiceSurface(App, () => 2);

  assert.equal(App.services.platform.getBuildUI, firstGetBuildUI);
  assert.equal(App.services.platform.getDimsM, firstGetDimsM);
  assert.equal(App.services.platform.setAnimate, firstSetAnimate);
  assert.equal(App.services.platform.ensureRenderLoop, firstEnsureRenderLoop);
  assert.deepEqual(App.services.platform.getBuildUI(), { width: 180, height: 240, depth: 55 });
  assert.deepEqual(App.services.platform.getDimsM(), { w: 1.8, h: 2.4, d: 0.55 });
});

test('platform service ensureRenderLoop prefers idle work for the first animate kick', () => {
  const calls: string[] = [];
  let rafCb: ((ts?: number) => void) | null = null;
  const idleQueue: Array<() => void> = [];
  const timeoutQueue: Array<() => void> = [];
  const App: any = {
    services: { platform: Object.create(null) },
    store: {
      getState: () => ({
        ui: {},
        config: {},
        runtime: { wardrobeWidthM: 1.8, wardrobeHeightM: 2.4, wardrobeDepthM: 0.55 },
        mode: {},
        meta: {},
      }),
    },
    render: Object.create(null),
    lifecycle: Object.create(null),
    deps: {
      browser: {
        requestIdleCallback: (cb: IdleRequestCallback) => {
          calls.push('idle-scheduled');
          idleQueue.push(() => cb({} as IdleDeadline));
          return idleQueue.length;
        },
        setTimeout: (fn: () => void) => {
          calls.push('timeout-scheduled');
          timeoutQueue.push(fn);
          return timeoutQueue.length;
        },
        clearTimeout: () => {},
        performanceNow: () => 0,
      },
    },
  };

  installPlatformServiceSurface(App, cb => {
    calls.push('raf-scheduled');
    rafCb = cb;
    return 7;
  });

  App.services.platform.setAnimate(() => calls.push('animate'));

  assert.deepEqual(calls, ['raf-scheduled']);
  assert.equal(typeof rafCb, 'function');
  assert.equal(idleQueue.length, 0);
  assert.equal(timeoutQueue.length, 0);

  rafCb?.(16);
  assert.deepEqual(calls, ['raf-scheduled', 'idle-scheduled']);
  assert.equal(idleQueue.length, 1);
  assert.equal(timeoutQueue.length, 0);

  idleQueue.shift()?.();
  assert.deepEqual(calls, ['raf-scheduled', 'idle-scheduled', 'animate']);
});

test('platform service ensureRenderLoop falls back to a macrotask for the first animate kick', () => {
  const calls: string[] = [];
  let rafCb: ((ts?: number) => void) | null = null;
  const timeoutQueue: Array<() => void> = [];
  const App: any = {
    services: { platform: Object.create(null) },
    store: {
      getState: () => ({
        ui: {},
        config: {},
        runtime: { wardrobeWidthM: 1.8, wardrobeHeightM: 2.4, wardrobeDepthM: 0.55 },
        mode: {},
        meta: {},
      }),
    },
    render: Object.create(null),
    lifecycle: Object.create(null),
    deps: {
      browser: {
        setTimeout: (fn: () => void) => {
          calls.push('timeout-scheduled');
          timeoutQueue.push(fn);
          return timeoutQueue.length;
        },
        clearTimeout: () => {},
        performanceNow: () => 0,
      },
    },
  };

  installPlatformServiceSurface(App, cb => {
    calls.push('raf-scheduled');
    rafCb = cb;
    return 7;
  });

  App.services.platform.setAnimate(() => calls.push('animate'));

  rafCb?.(16);
  assert.deepEqual(calls, ['raf-scheduled', 'timeout-scheduled']);
  assert.equal(timeoutQueue.length, 1);

  timeoutQueue.shift()?.();
  assert.deepEqual(calls, ['raf-scheduled', 'timeout-scheduled', 'animate']);
});

test('platform getDimsM uses wardrobe-type depth fallback when build/runtime depth is missing', () => {
  const createApp = (wardrobeType: 'hinged' | 'sliding') => ({
    services: { platform: Object.create(null) },
    store: {
      getState: () => ({
        ui: {},
        config: { wardrobeType },
        runtime: {},
        mode: {},
        meta: {},
      }),
    },
    render: Object.create(null),
    lifecycle: Object.create(null),
  });

  const hingedApp: any = createApp('hinged');
  installPlatformServiceSurface(hingedApp, () => 1);
  assert.deepEqual(hingedApp.services.platform.getDimsM(), { w: 1.6, h: 2.4, d: 0.55 });

  const slidingApp: any = createApp('sliding');
  installPlatformServiceSurface(slidingApp, () => 1);
  assert.deepEqual(slidingApp.services.platform.getDimsM(), { w: 1.6, h: 2.4, d: 0.6 });
});

test('platform getDimsM preserves per-axis UI, raw, runtime, and generic fallback precedence', () => {
  assert.equal(PLATFORM_STARTUP_DIMENSION_DEFAULTS_POLICY.widthCm, DEFAULT_WIDTH);
  assert.equal(PLATFORM_STARTUP_DIMENSION_DEFAULTS_POLICY.heightCm, DEFAULT_HEIGHT);
  assert.equal(PLATFORM_STARTUP_DIMENSION_DEFAULTS_POLICY.resolveDepthCm, getDefaultDepthForWardrobeType);
  assert.equal(Object.isFrozen(PLATFORM_STARTUP_DIMENSION_DEFAULTS_POLICY), true);

  const createApp = (wardrobeType: unknown, runtime: Record<string, unknown> = {}) => {
    const App: any = {
      services: { platform: Object.create(null) },
      store: {
        getState: () => ({
          ui: {},
          config: { wardrobeType },
          runtime,
          mode: {},
          meta: {},
        }),
      },
      render: Object.create(null),
      lifecycle: Object.create(null),
    };
    installPlatformServiceSurface(App, () => 1);
    return App;
  };

  const runtimeApp = createApp('sliding', {
    wardrobeWidthM: 2.1,
    wardrobeHeightM: 2.2,
    wardrobeDepthM: 0.57,
  });
  assert.deepEqual(
    runtimeApp.services.platform.getDimsM({
      width: '1.8',
      h: '245',
      depth: '0.58',
      raw: { width: 190, height: 250, depth: 59 },
    }),
    { w: 1.8, h: 2.45, d: 0.58 }
  );
  assert.deepEqual(
    runtimeApp.services.platform.getDimsM({
      raw: { width: '190', h: '2.5', d: '59' },
    }),
    { w: 1.9, h: 2.5, d: 0.59 }
  );
  assert.deepEqual(runtimeApp.services.platform.getDimsM({ width: 'invalid' }), {
    w: 2.1,
    h: 2.2,
    d: 0.57,
  });
  assert.deepEqual(runtimeApp.services.platform.getDimsM({ width: 200 }), {
    w: 2,
    h: 2.2,
    d: 0.57,
  });

  const unknownTypeApp = createApp('future-type', {
    wardrobeWidthM: Number.NaN,
    wardrobeHeightM: Number.POSITIVE_INFINITY,
    wardrobeDepthM: Number.NEGATIVE_INFINITY,
  });
  assert.deepEqual(unknownTypeApp.services.platform.getDimsM(), { w: 1.6, h: 2.4, d: 0.55 });
});
