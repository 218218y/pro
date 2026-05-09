import test from 'node:test';
import assert from 'node:assert/strict';

import { createDebugConsoleSurface } from '../esm/native/runtime/debug_console_surface.ts';
import { runPlatformRenderFollowThrough } from '../esm/native/runtime/platform_access.ts';

test('debug console surface runtime: render debug helpers expose canonical render budget and reset flow', () => {
  const App: any = {
    services: {
      platform: {
        ensureRenderLoop() {},
      },
    },
  };

  runPlatformRenderFollowThrough(App, { updateShadows: false });
  runPlatformRenderFollowThrough(App, { updateShadows: false, ensureRenderLoop: false });

  const surface = createDebugConsoleSurface(App);
  assert.deepEqual(surface.render.getStats(), {
    renderRequestCount: 2,
    triggerRenderCount: 0,
    ensureRenderLoopCount: 1,
    noOpRenderRequestCount: 1,
    wakeupRequestCount: 0,
    wakeupEnsureRenderLoopCount: 0,
    noOpWakeupCount: 0,
    activityTouchCount: 0,
    afterTouchCount: 0,
    ensureRenderLoopAfterTriggerCount: 0,
  });
  assert.deepEqual(surface.render.getBudget(), {
    renderRequestCount: 2,
    triggerRenderCount: 0,
    ensureRenderLoopCount: 1,
    noOpRenderRequestCount: 1,
    wakeupRequestCount: 0,
    wakeupEnsureRenderLoopCount: 0,
    noOpWakeupCount: 0,
    activityTouchCount: 0,
    afterTouchCount: 0,
    ensureRenderLoopAfterTriggerCount: 0,
    renderNoOpRate: 0.5,
    wakeupNoOpRate: 0,
    renderEnsureFallbackRate: 0.5,
  });

  assert.deepEqual(surface.render.resetStats(), {
    renderRequestCount: 2,
    triggerRenderCount: 0,
    ensureRenderLoopCount: 1,
    noOpRenderRequestCount: 1,
    wakeupRequestCount: 0,
    wakeupEnsureRenderLoopCount: 0,
    noOpWakeupCount: 0,
    activityTouchCount: 0,
    afterTouchCount: 0,
    ensureRenderLoopAfterTriggerCount: 0,
  });
  assert.deepEqual(surface.render.getStats(), {
    renderRequestCount: 0,
    triggerRenderCount: 0,
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

test('debug console surface runtime: canvas helpers route through canonical canvas-picking handlers', () => {
  const clickCalls: Array<[number, number]> = [];
  const hoverCalls: Array<[number, number]> = [];
  const App: any = {
    services: {
      canvasPicking: {
        handleClickNDC(x: number, y: number) {
          clickCalls.push([x, y]);
        },
        handleHoverNDC(x: number, y: number) {
          hoverCalls.push([x, y]);
        },
      },
    },
  };

  const surface = createDebugConsoleSurface(App);
  assert.equal(surface.canvas.clickNdc(2, -2), true);
  assert.equal(surface.canvas.hoverNdc(0.25, -0.5), true);
  assert.equal(surface.canvas.inspectNdc(0.4, 0.2), null);
  assert.deepEqual(clickCalls, [[1, -1]]);
  assert.deepEqual(hoverCalls, [[0.25, -0.5]]);
});
