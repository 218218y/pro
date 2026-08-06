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
    detail: 'system-not-ready',
  });
  assert.deepEqual(notReady.writes, []);

  const restoring = createApp({ systemReady: true, restoring: true });
  assert.equal(canAutosaveRun(restoring.App), false);
  assert.equal(commitAutosaveNow(restoring.App), false);
  assert.deepEqual(commitAutosaveNowResult(restoring.App), {
    ok: false,
    reason: 'autosave-not-ready',
    detail: 'restore-in-progress',
  });
  assert.deepEqual(restoring.writes, []);

  const unavailableReports: Array<{ error: unknown; ctx: any }> = [];
  const unavailable = createApp({ systemReady: true, restoring: false });
  unavailable.App.services.errors = {
    report(error: unknown, ctx: any) {
      unavailableReports.push({ error, ctx });
    },
  };
  unavailable.App.store.getState = () => {
    throw new Error('runtime selector failed');
  };
  assert.equal(canAutosaveRun(unavailable.App), false);
  assert.deepEqual(commitAutosaveNowResult(unavailable.App), {
    ok: false,
    reason: 'autosave-not-ready',
    detail: 'runtime-state-unavailable',
  });
  assert.deepEqual(unavailable.writes, []);
  assert.equal(
    unavailableReports.every(
      report =>
        report.ctx?.where === 'native/services/autosave_shared' &&
        report.ctx?.op === 'readReadiness.runtimeState' &&
        report.ctx?.fatal === false
    ),
    true
  );
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
  assert.equal(reports[0].ctx?.where, 'native/services/autosave_runtime');
  assert.equal(reports[0].ctx?.op, 'commitAutosaveNow.writeStorageRejected');
  assert.equal(reports[0].ctx?.fatal, false);
});

test('autosave service reports snapshot unavailability without exposing project data', () => {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const { App, writes } = createApp({ systemReady: true, restoring: false });
  App.services.errors = {
    report(error: unknown, ctx: any) {
      reports.push({ error, ctx });
    },
  };
  App.services.project.capture = () => null;

  assert.deepEqual(commitAutosaveNowResult(App), {
    ok: false,
    reason: 'snapshot-unavailable',
  });
  assert.deepEqual(writes, []);
  assert.deepEqual(
    reports.map(report => [report.ctx?.where, report.ctx?.op]),
    [
      ['native/services/autosave_snapshot', 'capture.projectInvalidResult'],
      ['native/services/autosave_runtime', 'commitAutosaveNow.snapshotUnavailable'],
    ]
  );
  assert.equal(
    reports.every(report => report.ctx?.fatal === false),
    true
  );
});

test('autosave service keeps a successful storage commit when the UI status stamp fails', () => {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const { App, writes } = createApp({ systemReady: true, restoring: false });
  App.services.errors = {
    report(error: unknown, ctx: any) {
      reports.push({ error, ctx });
    },
  };
  App.actions = {
    ui: {
      setScalarSoft() {
        throw new Error('autosave status UI unavailable');
      },
    },
  };

  assert.deepEqual(commitAutosaveNowResult(App), { ok: true });
  assert.equal(writes.length, 1);
  assert.equal(
    reports.some(
      report => report.ctx?.where === 'native/services/autosave_shared' && report.ctx?.op === 'stampInfoUi'
    ),
    true
  );
});
