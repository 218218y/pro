import test from 'node:test';
import assert from 'node:assert/strict';

import { canAutosaveRun, commitAutosaveNow } from '../esm/native/services/autosave.ts';

function createApp(runtime: Record<string, unknown>) {
  const writes: Array<unknown> = [];
  const App = {
    services: {
      storage: {
        setString(_key: string, _value: string) {
          writes.push(true);
          return true;
        },
      },
      project: {
        capture() {
          return { settings: { width: 120 } };
        },
      },
    },
    store: {
      getState() {
        return {
          ui: {},
          config: {},
          runtime,
          mode: {},
          meta: {},
        };
      },
    },
  } as any;
  return { App, writes };
}

test('autosave service guards: runtime gating blocks writes until the app is ready and not restoring', () => {
  const notReady = createApp({ systemReady: false, restoring: false });
  assert.equal(canAutosaveRun(notReady.App), false);
  assert.equal(commitAutosaveNow(notReady.App), false);
  assert.deepEqual(notReady.writes, []);

  const restoring = createApp({ systemReady: true, restoring: true });
  assert.equal(canAutosaveRun(restoring.App), false);
  assert.equal(commitAutosaveNow(restoring.App), false);
  assert.deepEqual(restoring.writes, []);
});
