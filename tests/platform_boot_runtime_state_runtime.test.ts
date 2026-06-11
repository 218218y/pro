import test from 'node:test';
import assert from 'node:assert/strict';

import { installBootMain } from '../esm/native/platform/boot_main.ts';
import { installSmokeChecks } from '../esm/native/platform/smoke_checks.ts';
import { installBrowserUiOpsAdapter } from '../esm/native/adapters/browser/ui_ops.ts';
import { installLifecycleVisibility } from '../esm/native/platform/lifecycle_visibility.ts';
import {
  getPlatformBootRuntimeServiceMaybe,
  isPlatformBootInitDone,
  isPlatformBootInitRunning,
  setPlatformBootInitDone,
  setPlatformBootInitRunning,
} from '../esm/native/runtime/platform_boot_runtime_access.ts';
import {
  isBootInstalled,
  isBrowserUiOpsInstalled,
  isLifecycleVisibilityInstalled,
  isSmokeChecksInstalled,
} from '../esm/native/runtime/install_state_access.ts';

test('platform boot runtime state: canonical runtime slot stores init flags centrally', () => {
  const App: any = {};

  assert.equal(getPlatformBootRuntimeServiceMaybe(App), null);
  assert.equal(isPlatformBootInitDone(App), false);
  assert.equal(isPlatformBootInitRunning(App), false);

  setPlatformBootInitRunning(App, true);
  setPlatformBootInitDone(App, true);

  assert.equal(App.services.platformBootRuntime.initRunning, true);
  assert.equal(App.services.platformBootRuntime.initDone, true);
  assert.equal(Object.getPrototypeOf(App.services.platformBootRuntime), null);
  assert.equal(isPlatformBootInitRunning(App), true);
  assert.equal(isPlatformBootInitDone(App), true);
});

test('platform install state: installers mark canonical flags without polluting public namespaces', () => {
  const win = {
    devicePixelRatio: 2,
    getSelection() {
      return null;
    },
    setTimeout(fn: () => void) {
      fn();
      return 1;
    },
    clearTimeout() {},
    document: { body: { style: {} } },
    navigator: { userAgent: 'UA' },
    location: { search: '' },
  };
  const App: any = {
    deps: {
      browser: {
        window: win,
        document: win.document,
      },
    },
    platform: { util: {} },
  };

  const boot = installBootMain(App);
  const smoke = installSmokeChecks(App, { autoRun: false });
  installBrowserUiOpsAdapter(App);
  installLifecycleVisibility(App);

  assert.equal(isBootInstalled(App), true);
  assert.equal(isSmokeChecksInstalled(App), true);
  assert.equal(isBrowserUiOpsInstalled(App), true);
  assert.equal(isLifecycleVisibilityInstalled(App), true);
  assert.equal('__installed' in boot, false);
  assert.equal('__installed' in smoke, false);
  assert.equal('__wpUiOpsInstalledV1' in App.browser, false);
  assert.equal('_installed_v1' in App.lifecycleHandlers, false);
});

test('installLifecycleVisibility heals missing and drifted handlers in place without duplicating browser listeners', () => {
  const docListeners: Record<string, Function[]> = { visibilitychange: [] };
  const winListeners: Record<string, Function[]> = { focus: [], pageshow: [] };
  const doc = {
    hidden: false,
    body: { style: {} },
    createElement() {
      return {};
    },
    querySelector() {
      return null;
    },
    addEventListener(type: string, fn: Function) {
      (docListeners[type] ||= []).push(fn);
    },
    removeEventListener(type: string, fn: Function) {
      docListeners[type] = (docListeners[type] || []).filter(entry => entry !== fn);
    },
  };
  const win = {
    document: doc,
    navigator: { userAgent: 'UA' },
    location: { search: '' },
    addEventListener(type: string, fn: Function) {
      (winListeners[type] ||= []).push(fn);
    },
    removeEventListener(type: string, fn: Function) {
      winListeners[type] = (winListeners[type] || []).filter(entry => entry !== fn);
    },
  };
  const App: any = {
    deps: { browser: { document: doc, window: win } },
    platform: { triggerRender() {} },
    services: { doors: { snapDrawersToTargets() {} } },
  };

  installLifecycleVisibility(App);

  const focusRef = App.lifecycleHandlers.onWindowFocus;
  assert.equal(docListeners.visibilitychange.length, 1);
  assert.equal(winListeners.focus.length, 1);
  assert.equal(winListeners.pageshow.length, 1);

  App.lifecycleHandlers.onWindowFocus = undefined;
  App.lifecycleHandlers.onWindowPageShow = () => {};
  installLifecycleVisibility(App);

  assert.equal(typeof App.lifecycleHandlers.onWindowFocus, 'function');
  assert.equal(typeof App.lifecycleHandlers.onWindowPageShow, 'function');
  assert.equal(docListeners.visibilitychange.length, 1);
  assert.equal(winListeners.focus.length, 1);
  assert.equal(winListeners.pageshow.length, 1);
  assert.equal(App.lifecycleHandlers.onWindowFocus, focusRef);
  assert.equal(App.lifecycleHandlers.onWindowPageShow, App.lifecycleHandlers.__wpOnWindowPageShow);
});
