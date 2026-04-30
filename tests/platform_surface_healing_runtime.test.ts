import test from 'node:test';
import assert from 'node:assert/strict';

import { installPlatformUtilSurface } from '../esm/native/platform/platform_util.ts';
import { installPlatformServiceSurface } from '../esm/native/platform/platform_services.ts';

test('platform util install heals drifted util/reportError seams while preserving canonical refs', () => {
  const calls: unknown[] = [];
  const legacyStr = (value: unknown, fallback?: unknown) => `legacy:${value ?? fallback ?? ''}`;
  const legacyReportError = (err: unknown, ctx?: unknown) => calls.push(['report', err, ctx]);
  const App: any = {
    platform: {
      util: Object.assign(Object.create(null), {
        str: legacyStr,
      }),
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

  const firstStr = App.platform.util.str;
  const firstClone = App.platform.util.clone;
  const firstReportError = App.platform.reportError;
  const firstAfterPaint = App.platform.util.afterPaint;

  App.platform.util.str = () => 'stale';
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

  assert.equal(App.platform.util.str, firstStr);
  assert.equal(App.platform.util.clone, firstClone);
  assert.equal(App.platform.reportError, firstReportError);
  assert.equal(App.platform.util.afterPaint, firstAfterPaint);
  assert.equal(App.platform.util.str('wardrobe'), 'legacy:wardrobe');
  App.platform.reportError('boom', 'ctx');
  const clone = App.platform.util.clone({ a: 1 });
  assert.deepEqual(clone, { a: 1 });
  assert.deepEqual(calls, [['report', 'boom', 'ctx']]);
});

test('platform util afterPaint keeps heavy work outside the RAF callback', () => {
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

  assert.equal(rafQueue.length, 1);
  assert.equal(timeoutQueue.length, 0);
  assert.deepEqual(order, []);

  rafQueue.shift()?.(0);
  assert.equal(rafQueue.length, 1);
  assert.equal(timeoutQueue.length, 0);
  assert.deepEqual(order, []);

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

test('platform service ensureRenderLoop keeps the first animate kick outside the RAF callback', () => {
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

  assert.deepEqual(calls, ['raf-scheduled']);
  assert.equal(typeof rafCb, 'function');
  assert.equal(timeoutQueue.length, 0);

  rafCb?.(16);
  assert.deepEqual(calls, ['raf-scheduled', 'timeout-scheduled']);
  assert.equal(timeoutQueue.length, 1);

  timeoutQueue.shift()?.();
  assert.deepEqual(calls, ['raf-scheduled', 'timeout-scheduled', 'animate']);
});
