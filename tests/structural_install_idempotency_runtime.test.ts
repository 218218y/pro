import test from 'node:test';
import assert from 'node:assert/strict';

import { installBrowserSurfaceAdapter } from '../esm/native/adapters/browser/surface.ts';
import { installProjectIo } from '../esm/native/io/project_io.ts';
import { installStateApiHistoryMetaReactivity } from '../esm/native/kernel/state_api_history_meta_reactivity.ts';
import { installRenderLoopImpl } from '../esm/native/platform/render_loop_impl.ts';
import { installDoorsRuntimeService } from '../esm/native/services/doors_runtime.ts';

test('structural installs remain idempotent without namespace install flags', () => {
  const calls: string[] = [];
  const App: any = {
    deps: {
      browser: {
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
          requestAnimationFrame(cb: FrameRequestCallback) {
            cb(0);
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
      },
      THREE: {},
    },
    services: {
      builder: {
        requestBuild() {
          calls.push('build');
        },
      },
      autosave: {
        schedule() {
          calls.push('autosave');
        },
      },
    },
    store: {
      subscribe(fn: (state: unknown, meta: unknown) => void) {
        calls.push('subscribe');
        return () => {
          calls.push('unsubscribe');
        };
      },
      getState() {
        return { meta: { version: 1 }, runtime: {}, ui: {} };
      },
    },
    render: { animate: () => 'stale' },
  };

  installBrowserSurfaceAdapter(App);
  const browserBefore = App.browser;
  installBrowserSurfaceAdapter(App);
  assert.equal(App.browser, browserBefore);
  assert.equal(typeof App.browser.getWindow, 'function');
  assert.equal(typeof App.browser.setDoorStatusCss, 'function');

  const projectIO1 = installProjectIo(App as never);
  const projectIO2 = installProjectIo(App as never);
  assert.equal(projectIO1, projectIO2);
  assert.equal(typeof projectIO1?.exportCurrentProject, 'function');

  const storeNs: any = {};
  installStateApiHistoryMetaReactivity({
    A: App,
    store: App.store,
    storeNs,
    historyNs: {},
    metaActionsNs: {},
    asObj: (v: any) => (v && typeof v === 'object' ? v : null),
    safeCall: (fn: () => unknown) => fn(),
    normMeta: (meta: any) => (meta && typeof meta === 'object' ? meta : {}),
    mergeMeta: (meta: any, defaults: any) => ({
      ...(defaults || {}),
      ...(meta && typeof meta === 'object' ? meta : {}),
    }),
    isObj: (v: any): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v),
    commitMetaTouch: () => null,
    asMeta: (meta: any) => (meta && typeof meta === 'object' ? meta : {}),
    commitMetaPatch: () => null,
  } as never);
  assert.equal(storeNs.installReactivity?.(), true);
  assert.equal(storeNs.installReactivity?.(), true);
  assert.equal(calls.filter(x => x === 'subscribe').length, 1);
  assert.equal(storeNs.hasReactivityInstalled?.(), true);

  const staleAnimate = App.render.animate;
  const renderBefore = installRenderLoopImpl(App as never);
  const installedAnimate = renderBefore.animate;
  const renderAfter = installRenderLoopImpl(App as never);
  assert.equal(renderBefore, renderAfter);
  assert.notEqual(installedAnimate, staleAnimate);
  assert.equal(renderAfter.animate, installedAnimate);
  assert.equal(typeof renderAfter.loopRaf, 'number');
  assert.equal(typeof renderAfter.__lastFrameTs, 'number');
  assert.equal(typeof renderAfter.__rafScheduledAt, 'number');

  const doorsBefore = installDoorsRuntimeService(App as never);
  const getOpenBefore = doorsBefore.getOpen;
  const doorsAfter = installDoorsRuntimeService(App as never);
  assert.equal(doorsBefore, doorsAfter);
  assert.equal(doorsAfter.getOpen, getOpenBefore);
});
