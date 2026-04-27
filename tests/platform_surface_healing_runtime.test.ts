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
