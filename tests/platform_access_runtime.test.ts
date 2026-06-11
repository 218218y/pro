import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensurePlatformService,
  getPlatformService,
  getBuildUIFromPlatform,
  getDimsMFromPlatform,
  ensureRenderLoopViaPlatform,
  getPlatformComputePerfFlags,
  computePerfFlagsViaPlatform,
  getPlatformSetAnimate,
  installRenderAnimateViaPlatform,
  touchPlatformActivity,
  getPlatformPerf,
  ensurePlatformPerf,
  markPlatformPerfFlagsDirty,
  setPlatformHasInternalDrawers,
  reportErrorViaPlatform,
  triggerRenderViaPlatform,
  runPlatformRenderFollowThrough,
  runPlatformWakeupFollowThrough,
  runPlatformActivityRenderTouch,
  createCanvasViaPlatform,
  getPlatformRenderDebugStats,
  resetPlatformRenderDebugStats,
  getPlatformRenderDebugBudget,
} from '../esm/native/runtime/platform_access.ts';

test('platform access runtime: service slot + buildUI/dims/render loop seams are stable', () => {
  let ensureCount = 0;
  let perfCount = 0;
  const animateCalls: any[] = [];
  const App: any = {
    services: {
      platform: {
        getBuildUI: () => ({ width: 100 }),
        getDimsM: (raw?: any) => ({ w: Number(raw?.width) || 0, h: 220, d: 60 }),
        ensureRenderLoop: () => {
          ensureCount += 1;
        },
        computePerfFlags() {
          perfCount += 1;
          this.perf = { ...(this.perf || {}), fps: 60, hasInternalDrawers: true, perfFlagsDirty: false };
        },
        setAnimate(fn: () => unknown) {
          animateCalls.push(fn);
        },
        perf: { fps: 60, perfFlagsDirty: true },
      },
    },
  };

  assert.equal(ensurePlatformService(App), getPlatformService(App));
  assert.deepEqual(getBuildUIFromPlatform(App), { width: 100 });
  assert.deepEqual(getDimsMFromPlatform(App, { width: 250 }), { w: 250, h: 220, d: 60 });
  assert.equal(ensureRenderLoopViaPlatform(App), true);
  assert.equal(ensureCount, 1);
  assert.equal(typeof getPlatformComputePerfFlags(App), 'function');
  assert.equal(computePerfFlagsViaPlatform(App), true);
  assert.equal(perfCount, 1);
  assert.deepEqual(getPlatformPerf(App), { fps: 60, hasInternalDrawers: true, perfFlagsDirty: false });
  const animate = () => 'ok';
  assert.equal(typeof getPlatformSetAnimate(App), 'function');
  assert.equal(installRenderAnimateViaPlatform(App, animate), true);
  assert.deepEqual(animateCalls, [animate]);
});

test('platform access runtime: activity/report/render/canvas fall back to canonical platform seams', () => {
  const calls: any[] = [];
  const App: any = {
    services: {
      platform: {
        reportError: (err: unknown, ctx?: unknown) => calls.push(['svcError', err, ctx]),
        triggerRender: (updateShadows?: boolean) => calls.push(['svcRender', !!updateShadows]),
        createCanvas: (w: number, h: number) => ({ w, h, via: 'service' }),
      },
    },
  };

  assert.equal(touchPlatformActivity(App), true);
  assert.equal(typeof App.services.platform.activity.touch, 'function');
  assert.equal(typeof App.services.platform.activity.lastActionTime, 'number');
  assert.equal(reportErrorViaPlatform(App, 'boom', { where: 'test' }), true);
  assert.equal(triggerRenderViaPlatform(App, true), true);
  assert.deepEqual(createCanvasViaPlatform(App, 10, 20), { w: 10, h: 20, via: 'service' });
  assert.deepEqual(calls, [
    ['svcError', 'boom', { where: 'test' }],
    ['svcRender', true],
  ]);
});

test('platform access runtime: perf helpers canonically own service perf flags', () => {
  const App: any = { services: { platform: {} } };

  assert.equal(typeof ensurePlatformPerf(App), 'object');
  assert.equal(App.services.platform.perf.hasInternalDrawers, undefined);
  assert.equal(App.services.platform.perf.perfFlagsDirty, undefined);
  assert.equal(markPlatformPerfFlagsDirty(App, true), true);
  assert.equal(setPlatformHasInternalDrawers(App, true), true);
  assert.deepEqual({ ...getPlatformPerf(App) }, { hasInternalDrawers: true, perfFlagsDirty: false });
  assert.equal(markPlatformPerfFlagsDirty(App, false), true);
  assert.deepEqual({ ...getPlatformPerf(App) }, { hasInternalDrawers: true, perfFlagsDirty: false });
});

test('platform access runtime: wakeup follow-through canonically owns activity touch + callback + ensure loop', () => {
  const calls: any[] = [];
  const App: any = {
    services: {
      platform: {
        ensureRenderLoop() {
          calls.push(['ensure']);
        },
      },
    },
  };

  const result = runPlatformWakeupFollowThrough(App, {
    afterTouch() {
      calls.push(['afterTouch']);
    },
  });

  assert.deepEqual(result, {
    touchedActivity: true,
    ranAfterTouch: true,
    ensuredRenderLoop: true,
  });
  assert.equal(typeof App.services.platform.activity.touch, 'function');
  assert.equal(typeof App.services.platform.activity.lastActionTime, 'number');
  assert.deepEqual(calls, [['afterTouch'], ['ensure']]);
});

test('platform access runtime: wakeup follow-through tolerates callback failure while still ensuring render loop', () => {
  const calls: any[] = [];
  const App: any = {
    services: {
      platform: {
        ensureRenderLoop() {
          calls.push(['ensure']);
        },
      },
    },
  };

  const result = runPlatformWakeupFollowThrough(App, {
    afterTouch() {
      calls.push(['afterTouch']);
      throw new Error('boom');
    },
  });

  assert.deepEqual(result, {
    touchedActivity: true,
    ranAfterTouch: false,
    ensuredRenderLoop: true,
  });
  assert.deepEqual(calls, [['afterTouch'], ['ensure']]);
});

test('platform access runtime: activity-backed render touch canonically owns touch + render + optional ensure loop', () => {
  const calls: any[] = [];
  const App: any = {
    services: {
      platform: {
        triggerRender(updateShadows?: boolean) {
          calls.push(['render', !!updateShadows]);
        },
        ensureRenderLoop() {
          calls.push(['ensure']);
        },
      },
    },
  };

  const result = runPlatformActivityRenderTouch(App, {
    updateShadows: true,
    ensureRenderLoopAfterTrigger: true,
  });

  assert.deepEqual(result, {
    touchedActivity: true,
    triggeredRender: true,
    usedFallbackTrigger: false,
    ensuredRenderLoop: true,
  });
  assert.equal(typeof App.services.platform.activity.touch, 'function');
  assert.equal(typeof App.services.platform.activity.lastActionTime, 'number');
  assert.deepEqual(calls, [['render', true], ['ensure']]);
});

test('platform access runtime: render follow-through canonically falls back to fallback trigger or ensureRenderLoop', () => {
  const calls: any[] = [];
  const App: any = {
    services: {
      platform: {
        ensureRenderLoop() {
          calls.push(['ensure']);
        },
      },
    },
  };

  const fallbackResult = runPlatformRenderFollowThrough(App, {
    updateShadows: true,
    fallbackTrigger(updateShadows?: boolean) {
      calls.push(['fallback', !!updateShadows]);
    },
  });

  assert.deepEqual(fallbackResult, {
    triggeredRender: true,
    usedFallbackTrigger: true,
    ensuredRenderLoop: false,
  });
  assert.deepEqual(calls, [['fallback', true]]);

  calls.length = 0;
  const ensureResult = runPlatformRenderFollowThrough(App, { updateShadows: false });
  assert.deepEqual(ensureResult, {
    triggeredRender: false,
    usedFallbackTrigger: false,
    ensuredRenderLoop: true,
  });
  assert.deepEqual(calls, [['ensure']]);
});

test('platform access runtime: render follow-through telemetry tracks trigger, fallback, ensure, no-op, and wakeup churn canonically', () => {
  const calls: any[] = [];
  const App: any = {
    services: {
      platform: {
        triggerRender(updateShadows?: boolean) {
          calls.push(['render', !!updateShadows]);
        },
        ensureRenderLoop() {
          calls.push(['ensure']);
        },
      },
    },
  };

  assert.equal(getPlatformRenderDebugStats(App), null);
  assert.equal(getPlatformRenderDebugBudget(App), null);

  assert.deepEqual(runPlatformRenderFollowThrough(App, { updateShadows: true }), {
    triggeredRender: true,
    usedFallbackTrigger: false,
    ensuredRenderLoop: false,
  });

  delete App.services.platform.triggerRender;
  assert.deepEqual(
    runPlatformRenderFollowThrough(App, {
      updateShadows: false,
      fallbackTrigger(updateShadows?: boolean) {
        calls.push(['fallback', !!updateShadows]);
      },
    }),
    {
      triggeredRender: true,
      usedFallbackTrigger: true,
      ensuredRenderLoop: false,
    }
  );

  assert.deepEqual(runPlatformRenderFollowThrough(App, { updateShadows: false }), {
    triggeredRender: false,
    usedFallbackTrigger: false,
    ensuredRenderLoop: true,
  });

  delete App.services.platform.ensureRenderLoop;
  assert.deepEqual(runPlatformRenderFollowThrough(App, { updateShadows: false }), {
    triggeredRender: false,
    usedFallbackTrigger: false,
    ensuredRenderLoop: false,
  });

  assert.deepEqual(
    runPlatformWakeupFollowThrough(App, {
      touchActivity: false,
      ensureRenderLoop: false,
    }),
    {
      touchedActivity: false,
      ranAfterTouch: false,
      ensuredRenderLoop: false,
    }
  );

  App.services.platform.ensureRenderLoop = function () {
    calls.push(['ensure']);
  };
  assert.deepEqual(
    runPlatformActivityRenderTouch(App, {
      updateShadows: false,
      ensureRenderLoopAfterTrigger: true,
      touchActivity: true,
      fallbackTrigger(updateShadows?: boolean) {
        calls.push(['activity-fallback', !!updateShadows]);
      },
    }),
    {
      touchedActivity: true,
      triggeredRender: true,
      usedFallbackTrigger: true,
      ensuredRenderLoop: true,
    }
  );

  assert.deepEqual(getPlatformRenderDebugStats(App), {
    renderRequestCount: 5,
    triggerRenderCount: 3,
    fallbackTriggerCount: 2,
    ensureRenderLoopCount: 1,
    noOpRenderRequestCount: 1,
    wakeupRequestCount: 1,
    wakeupEnsureRenderLoopCount: 0,
    noOpWakeupCount: 1,
    activityTouchCount: 1,
    afterTouchCount: 0,
    ensureRenderLoopAfterTriggerCount: 1,
  });
  assert.deepEqual(getPlatformRenderDebugBudget(App), {
    renderRequestCount: 5,
    triggerRenderCount: 3,
    fallbackTriggerCount: 2,
    ensureRenderLoopCount: 1,
    noOpRenderRequestCount: 1,
    wakeupRequestCount: 1,
    wakeupEnsureRenderLoopCount: 0,
    noOpWakeupCount: 1,
    activityTouchCount: 1,
    afterTouchCount: 0,
    ensureRenderLoopAfterTriggerCount: 1,
    renderNoOpRate: 0.2,
    wakeupNoOpRate: 1,
    renderEnsureFallbackRate: 0.2,
    renderFallbackTriggerRate: 0.4,
  });
  assert.deepEqual(resetPlatformRenderDebugStats(App), {
    renderRequestCount: 5,
    triggerRenderCount: 3,
    fallbackTriggerCount: 2,
    ensureRenderLoopCount: 1,
    noOpRenderRequestCount: 1,
    wakeupRequestCount: 1,
    wakeupEnsureRenderLoopCount: 0,
    noOpWakeupCount: 1,
    activityTouchCount: 1,
    afterTouchCount: 0,
    ensureRenderLoopAfterTriggerCount: 1,
  });
  assert.deepEqual(getPlatformRenderDebugStats(App), {
    renderRequestCount: 0,
    triggerRenderCount: 0,
    fallbackTriggerCount: 0,
    ensureRenderLoopCount: 0,
    noOpRenderRequestCount: 0,
    wakeupRequestCount: 0,
    wakeupEnsureRenderLoopCount: 0,
    noOpWakeupCount: 0,
    activityTouchCount: 0,
    afterTouchCount: 0,
    ensureRenderLoopAfterTriggerCount: 0,
  });
});
