import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAppStartServiceMaybe,
  getBootStartEntry,
  getUiBootServiceMaybe,
} from '../esm/native/runtime/boot_entry_access.ts';
import {
  getServiceInstallStateMaybe,
  isAppStartInstalled,
  isAppStartStarted,
} from '../esm/native/runtime/install_state_access.ts';
import { installAppStartService } from '../esm/native/services/app_start.ts';

test('app start runtime: installs canonical appStart seam and uiBoot start entry', () => {
  const calls: string[] = [];
  const App: any = {
    services: {
      uiBoot: {
        bootMain() {
          calls.push('bootMain');
        },
      },
    },
  };

  const svc = installAppStartService(App);
  assert.equal(installAppStartService(App), svc);
  assert.equal(getAppStartServiceMaybe(App), svc);
  assert.equal(typeof svc.start, 'function');
  assert.equal(isAppStartInstalled(App), true);
  assert.equal(getServiceInstallStateMaybe(App)?.appStartInstalled, true);

  const uiBoot = getUiBootServiceMaybe(App);
  assert.equal(typeof uiBoot?.start, 'function');
  const entry = getBootStartEntry(App);
  assert.equal(typeof entry, 'function');

  entry?.();
  assert.deepEqual(calls, ['bootMain']);
});

test('app start runtime: failed boot clears started flag for retry', () => {
  const App: any = {
    platform: {
      reportError() {},
    },
    services: {
      uiBoot: {
        bootMain() {
          throw new Error('boom');
        },
      },
    },
  };

  const svc = installAppStartService(App);
  assert.throws(() => svc.start?.(), /boom/);
  assert.equal(isAppStartStarted(App), false);
});
