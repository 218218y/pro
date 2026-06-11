import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAppStartServiceMaybe,
  ensureAppStartService,
  getUiBootServiceMaybe,
  ensureUiBootService,
  getBootStartEntry,
} from '../esm/native/runtime/boot_entry_access.ts';

test('boot entry access runtime: ensure/get service slots are stable', () => {
  const App: any = {};
  const appStart = ensureAppStartService(App);
  const uiBoot = ensureUiBootService(App);

  assert.equal(appStart, getAppStartServiceMaybe(App));
  assert.equal(uiBoot, getUiBootServiceMaybe(App));
  assert.equal(appStart, ensureAppStartService(App));
  assert.equal(uiBoot, ensureUiBootService(App));
});

test('boot entry access runtime: getBootStartEntry prefers appStart.start then uiBoot.bootMain', () => {
  const calls: string[] = [];
  const App: any = {
    services: {
      appStart: { start: () => calls.push('appStart') },
      uiBoot: { bootMain: () => calls.push('uiBoot') },
    },
  };

  const startEntry = getBootStartEntry(App);
  assert.equal(typeof startEntry, 'function');
  startEntry?.();
  assert.deepEqual(calls, ['appStart']);

  delete App.services.appStart.start;
  const fallbackEntry = getBootStartEntry(App);
  assert.equal(typeof fallbackEntry, 'function');
  fallbackEntry?.();
  assert.deepEqual(calls, ['appStart', 'uiBoot']);
});

test('boot entry access runtime: returns null when no canonical start surface exists', () => {
  assert.equal(getBootStartEntry({}), null);
});
