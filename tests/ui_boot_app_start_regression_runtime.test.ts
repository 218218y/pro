import test from 'node:test';
import assert from 'node:assert/strict';

import { installAppStartService } from '../esm/native/services/app_start.ts';
import { installUiBootMain } from '../esm/native/ui/boot_main.ts';

test('ui boot regression: appStart and uiBoot stay on separate canonical entries without uiBoot.start', () => {
  const App: any = {
    services: {
      uiBoot: {},
    },
  };

  const appStart = installAppStartService(App);

  assert.equal(typeof appStart.start, 'function');
  assert.equal(App.services.uiBoot.start, undefined);
  assert.equal(App.services.uiBoot.bootMain, undefined);

  const uiBoot = installUiBootMain(App);

  assert.equal(typeof uiBoot?.bootMain, 'function');
  assert.equal((uiBoot as Record<string, unknown> | null)?.start, undefined);
  assert.notEqual(uiBoot?.bootMain, appStart.start, 'bootMain must remain the real UI boot entry');
  assert.doesNotThrow(() => appStart.start?.(), 'appStart.start should not recurse into itself');
});
