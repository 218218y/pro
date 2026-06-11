import test from 'node:test';
import assert from 'node:assert/strict';

import { installRenderLoopImpl } from '../esm/native/platform/render_loop_impl.ts';
import { installRenderScheduler } from '../esm/native/platform/render_scheduler.ts';

function createBrowserStub() {
  return {
    window: {
      document: {
        body: { setAttribute() {} },
        createElement() {
          return {};
        },
        querySelector() {
          return null;
        },
      },
      navigator: { userAgent: 'UA/1.0' },
      location: { search: '' },
      addEventListener() {},
      removeEventListener() {},
      setTimeout(fn: () => void) {
        return setTimeout(fn, 0);
      },
      clearTimeout(id: ReturnType<typeof setTimeout>) {
        clearTimeout(id);
      },
      requestAnimationFrame(_cb: FrameRequestCallback) {
        return 1;
      },
      cancelAnimationFrame() {},
      getSelection() {
        return null;
      },
      getComputedStyle() {
        return {} as CSSStyleDeclaration;
      },
      scrollTo() {},
      confirm() {
        return true;
      },
      prompt() {
        return 'ok';
      },
      performance: { now: () => 0 },
    },
    document: {
      body: { setAttribute() {} },
      createElement() {
        return {};
      },
      querySelector() {
        return null;
      },
    },
    navigator: { userAgent: 'UA/1.0' },
    location: { search: '' },
  };
}

test('installRenderLoopImpl heals drifted animate surface while preserving canonical animate ref', () => {
  const App: any = {
    deps: {
      browser: createBrowserStub(),
      THREE: {},
    },
    services: Object.create(null),
    render: { animate: () => 'legacy' },
    lifecycle: Object.create(null),
  };

  const firstRender = installRenderLoopImpl(App);
  const firstAnimate = firstRender.animate;
  assert.equal(App.render.__wpCanonicalRenderAnimate, firstAnimate);

  App.render.animate = () => 'drifted';

  const secondRender = installRenderLoopImpl(App);

  assert.equal(secondRender, firstRender);
  assert.equal(secondRender.animate, firstAnimate);
  assert.equal(App.render.animate, firstAnimate);
});

test('installRenderScheduler heals drifted triggerRender while preserving canonical triggerRender ref', () => {
  const calls: unknown[] = [];
  const legacyTriggerRender = (updateShadows?: boolean) => calls.push(['legacy', !!updateShadows]);
  const App: any = {
    deps: {
      browser: createBrowserStub(),
      THREE: {},
    },
    services: {
      platform: {
        ensureRenderLoop() {
          calls.push(['ensureRenderLoop']);
        },
      },
    },
    platform: {
      triggerRender: legacyTriggerRender,
    },
    render: {
      renderer: {
        shadowMap: {
          needsUpdate: false,
        },
      },
    },
    lifecycle: Object.create(null),
  };

  installRenderScheduler(App);
  const firstTriggerRender = App.platform.triggerRender;

  App.platform.triggerRender = () => calls.push(['drifted']);

  installRenderScheduler(App);

  assert.equal(App.platform.triggerRender, firstTriggerRender);
  assert.equal(App.platform.triggerRender, legacyTriggerRender);

  App.platform.triggerRender(true);
  assert.deepEqual(calls, [['legacy', true]]);
});

test('render scheduler triggerRender uses canonical wakeup follow-through once per call', () => {
  let touchCount = 0;
  const calls: unknown[] = [];
  const App: any = {
    deps: {
      browser: createBrowserStub(),
      THREE: {},
    },
    services: {
      platform: {
        ensureRenderLoop() {
          calls.push(['ensureRenderLoop']);
        },
      },
    },
    platform: {},
    render: {
      renderer: {
        shadowMap: {
          needsUpdate: false,
        },
      },
    },
    lifecycle: Object.create(null),
  };

  installRenderScheduler(App);
  App.services.platform.activity.touch = () => {
    touchCount += 1;
    App.services.platform.activity.lastActionTime = 123;
  };

  App.platform.triggerRender(true);

  assert.equal(touchCount, 1);
  assert.equal(App.render.renderer.shadowMap.needsUpdate, true);
  assert.deepEqual(calls, [['ensureRenderLoop']]);
});
