import test from 'node:test';
import assert from 'node:assert/strict';

import { installAppStartService } from '../esm/native/services/app_start.ts';
import { installUiBootMain } from '../esm/native/ui/boot_main.ts';

test('ui boot regression: installUiBootMain must not alias uiBoot.bootMain to appStart.start', () => {
  const App: any = {
    services: {
      uiBoot: {},
    },
  };

  const appStart = installAppStartService(App);
  const inheritedStart = App.services.uiBoot.start;

  assert.equal(typeof appStart.start, 'function');
  assert.equal(typeof inheritedStart, 'function');
  assert.equal(inheritedStart, appStart.start, 'app_start should seed the start alias first');
  assert.equal(App.services.uiBoot.bootMain, undefined);

  const uiBoot = installUiBootMain(App);

  assert.equal(typeof uiBoot?.bootMain, 'function');
  assert.equal(typeof uiBoot?.start, 'function');
  assert.notEqual(uiBoot?.bootMain, inheritedStart, 'bootMain must remain the real UI boot entry');
  assert.equal(uiBoot?.start, inheritedStart, 'start alias should preserve the existing appStart bridge');
  assert.doesNotThrow(() => appStart.start?.(), 'appStart.start should not recurse into itself');
});
