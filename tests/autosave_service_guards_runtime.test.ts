import test from 'node:test';
import assert from 'node:assert/strict';

import { canAutosaveRun, commitAutosaveNow } from '../esm/native/services/autosave.ts';
import { commitAutosaveNowResult } from '../esm/native/services/autosave_runtime.ts';

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
  assert.deepEqual(commitAutosaveNowResult(notReady.App), {
    ok: false,
    reason: 'autosave-not-ready',
  });
  assert.deepEqual(notReady.writes, []);

  const restoring = createApp({ systemReady: true, restoring: true });
  assert.equal(canAutosaveRun(restoring.App), false);
  assert.equal(commitAutosaveNow(restoring.App), false);
  assert.deepEqual(commitAutosaveNowResult(restoring.App), {
    ok: false,
    reason: 'autosave-not-ready',
  });
  assert.deepEqual(restoring.writes, []);
});

test('autosave service reports storage write failures without marking the save successful', () => {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const { App } = createApp({ systemReady: true, restoring: false });
  App.services.storage.setString = () => false;
  App.services.platform = {
    reportError(error: unknown, ctx: any) {
      reports.push({ error, ctx });
    },
  };

  assert.equal(commitAutosaveNow(App), false);
  assert.deepEqual(commitAutosaveNowResult(App), {
    ok: false,
    reason: 'storage-write-failed',
  });
  assert.equal(reports.length, 2);
  assert.equal(reports[0].ctx?.where, 'services/autosave');
  assert.equal(reports[0].ctx?.op, 'commitAutosaveNow.writeStorage');
  assert.equal(reports[0].ctx?.nonFatal, true);
});

test('autosave service reports snapshot unavailability without exposing project data', () => {
  const { App, writes } = createApp({ systemReady: true, restoring: false });
  App.services.project.capture = () => null;

  assert.deepEqual(commitAutosaveNowResult(App), {
    ok: false,
    reason: 'snapshot-unavailable',
  });
  assert.deepEqual(writes, []);
});
