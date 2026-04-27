import test from 'node:test';
import assert from 'node:assert/strict';

import { ensureUiBootService } from '../esm/native/runtime/boot_entry_access.ts';
import {
  ensureUiBootRuntimeService,
  getUiBootRuntimeServiceMaybe,
  getUiBootRuntimeState,
  markUiBootDidInit,
  setUiBootBooting,
  setUiBootBuildScheduled,
} from '../esm/native/runtime/ui_boot_state_access.ts';
import {
  beginUiBootSession,
  clearUiBootRuntimeState,
  installUiBootReadyTimers,
} from '../esm/native/services/ui_boot_runtime.ts';
import {
  isUiBootMainInstalled,
  markUiBootMainInstalled,
} from '../esm/native/runtime/install_state_access.ts';

test('ui boot runtime state lives in canonical uiBootRuntime service and install flag lives in install-state', () => {
  const App: any = {};
  const uiBoot = ensureUiBootService(App);
  const runtime = ensureUiBootRuntimeService(App);

  assert.equal(App.services.uiBoot, uiBoot);
  assert.equal(App.services.uiBootRuntime, runtime);
  assert.equal(Object.getPrototypeOf(runtime), null);

  assert.equal(markUiBootDidInit(App), true);
  assert.equal(markUiBootDidInit(App), false);
  assert.equal(setUiBootBooting(App, true), true);
  assert.equal(setUiBootBuildScheduled(App, true, { phase: 'seed' }), true);
  markUiBootMainInstalled(App);

  assert.deepEqual(getUiBootRuntimeState(App), {
    didInit: true,
    booting: true,
    bootBuildScheduled: true,
    bootBuildArgs: { phase: 'seed' },
  });
  assert.equal(isUiBootMainInstalled(App), true);

  assert.equal((uiBoot as any).__bootMainInstalled, undefined);
  assert.equal((uiBoot as any).__didInit, undefined);
  assert.equal((uiBoot as any).__booting, undefined);
  assert.equal((uiBoot as any).__bootBuildScheduled, undefined);
  assert.equal((uiBoot as any).__bootBuildArgs, undefined);
  assert.equal(getUiBootRuntimeServiceMaybe(App), runtime);
});

test('ui boot runtime lifecycle keeps public uiBoot surface clean after begin/install/clear cycles', () => {
  const App: any = {};
  const uiBoot = ensureUiBootService(App);

  assert.equal(beginUiBootSession(App), true);
  installUiBootReadyTimers(App, {
    setTimeout: () => 1,
    clearTimeout: () => undefined,
  } as any);
  clearUiBootRuntimeState(App);

  assert.equal(App.services.uiBoot, uiBoot);
  assert.equal((uiBoot as any).__bootMainInstalled, undefined);
  assert.equal((uiBoot as any).__didInit, undefined);
  assert.equal((uiBoot as any).__booting, undefined);
  assert.equal((uiBoot as any).__bootBuildScheduled, undefined);
  assert.equal((uiBoot as any).__bootBuildArgs, undefined);
  assert.deepEqual(getUiBootRuntimeState(App), {
    didInit: true,
    booting: false,
    bootBuildScheduled: false,
    bootBuildArgs: null,
  });
});
