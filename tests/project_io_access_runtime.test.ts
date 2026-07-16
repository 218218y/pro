import test from 'node:test';
import assert from 'node:assert/strict';

import { withSuppressedConsole } from './_console_silence.ts';

import {
  ensureProjectIoRuntime,
  ensureProjectIoService,
  getProjectIoRestoreGeneration,
  loadProjectDataActionResultViaService,
  isProjectIoRestoreGenerationCurrent,
  nextProjectIoRestoreGeneration,
  readAutosaveProjectPayload,
  restoreProjectAutosaveFailFastResultViaService,
} from '../esm/native/runtime/project_io_access.ts';

test('project io access tracks restore generation on the canonical runtime seam', () => {
  const App = {} as any;

  const runtime = ensureProjectIoRuntime(App);
  assert.equal(typeof runtime, 'object');

  assert.equal(getProjectIoRestoreGeneration(App), 0);
  const gen1 = nextProjectIoRestoreGeneration(App);
  const gen2 = nextProjectIoRestoreGeneration(App);

  assert.equal(gen1, 1);
  assert.equal(gen2, 2);
  assert.equal(getProjectIoRestoreGeneration(App), 2);
  assert.equal(isProjectIoRestoreGenerationCurrent(App, 2), true);
  assert.equal(isProjectIoRestoreGenerationCurrent(App, 1), false);
});

test('project io access preserves concrete load failures through the terminal action-result seam', () => {
  const missingApp = {} as any;
  assert.deepEqual(loadProjectDataActionResultViaService(missingApp, { settings: {} }), {
    ok: false,
    reason: 'not-installed',
  });

  const App = {} as any;
  const svc = ensureProjectIoService(App) as any;
  App.services.platform = { reportError() {} };
  svc.loadProjectData = () => ({ ok: false, reason: 'invalid', message: 'bad snapshot' });
  assert.deepEqual(loadProjectDataActionResultViaService(App, { settings: {} }, undefined, 'error'), {
    ok: false,
    reason: 'invalid',
    message: 'bad snapshot',
  });

  svc.loadProjectData = () => {
    throw new Error('loader exploded');
  };
  assert.deepEqual(
    loadProjectDataActionResultViaService(
      App,
      { settings: {} },
      { toast: false } as any,
      'error',
      '[WardrobePro] Shared load seam failed.'
    ),
    {
      ok: false,
      reason: 'error',
      message: 'loader exploded',
    }
  );
});

test('project io access exposes canonical load action results for runtime callers', () => {
  const missingApp = {} as any;
  assert.deepEqual(loadProjectDataActionResultViaService(missingApp, { settings: {} }), {
    ok: false,
    reason: 'not-installed',
  });
  const App = {} as any;
  const svc = ensureProjectIoService(App) as any;
  svc.loadProjectData = () => ({ ok: false, reason: 'load', message: 'loader reason' });

  assert.deepEqual(loadProjectDataActionResultViaService(App, { settings: {} }, undefined, 'error'), {
    ok: false,
    reason: 'error',
    message: 'loader reason',
  });
});

test('project io access centralizes autosave payload parsing and restore-load opts without triggering the loader early', () => {
  const missingApp = {} as any;
  assert.deepEqual(readAutosaveProjectPayload(missingApp), {
    ok: false,
    reason: 'missing-autosave',
  });

  const removed: string[] = [];
  const invalidApp = {
    services: {
      storage: {
        KEYS: { AUTOSAVE_LATEST: 'autosave-key' },
        getString() {
          return '{bad-json';
        },
        remove(key: string) {
          removed.push(key);
          return true;
        },
      },
    },
  } as any;
  assert.deepEqual(readAutosaveProjectPayload(invalidApp), {
    ok: false,
    reason: 'invalid',
  });
  assert.deepEqual(removed, ['autosave-key']);

  let loadCalls = 0;
  const App = {} as any;
  const svc = ensureProjectIoService(App) as any;
  App.services.storage = {
    KEYS: { AUTOSAVE_LATEST: 'autosave-key' },
    getString(key: string) {
      return key === 'autosave-key' ? JSON.stringify({ settings: { depth: 60 } }) : null;
    },
  };
  svc.loadProjectData = () => {
    loadCalls += 1;
    return { ok: true };
  };

  const payload = readAutosaveProjectPayload(App, { meta: { scope: 'runtime-test' } } as any);
  assert.equal(payload.ok, true);
  if (!payload.ok) return;
  assert.deepEqual(payload.data, { settings: { depth: 60 } });
  assert.equal(payload.opts.toast, false);
  assert.equal(payload.opts.queueIfBusy, false);
  assert.equal((payload.opts.meta as any)?.source, 'restore.local');
  assert.equal((payload.opts.meta as any)?.scope, 'runtime-test');
  assert.equal(loadCalls, 0);
});

test('project io access exposes only the terminal autosave restore owner', async () => {
  assert.deepEqual(restoreProjectAutosaveFailFastResultViaService({}), {
    ok: false,
    reason: 'not-installed',
  });

  const App = {} as any;
  const svc = ensureProjectIoService(App) as any;
  App.services.platform = { reportError() {} };

  svc.restoreAutosaveFailFast = () => ({
    ok: true,
    restoreGen: 6,
    warnings: [
      { effect: 'build', message: 'final build failed' },
      { effect: 'autosave-refresh', message: 'autosave refresh failed' },
    ],
  });
  assert.deepEqual(restoreProjectAutosaveFailFastResultViaService(App), {
    ok: true,
    restoreGen: 6,
    warnings: [
      { effect: 'build', message: 'final build failed' },
      { effect: 'autosave-refresh', message: 'autosave refresh failed' },
    ],
  });

  svc.restoreAutosaveFailFast = () => ({
    ok: false,
    reason: 'load',
    message: 'legacy restore reason',
  });
  assert.deepEqual(restoreProjectAutosaveFailFastResultViaService(App), {
    ok: false,
    reason: 'error',
    message: 'legacy restore reason',
  });

  svc.restoreAutosaveFailFast = () => {
    throw new Error('restore seam exploded');
  };
  App.services.platform.reportError = () => {
    throw new Error('diagnostics exploded');
  };
  await withSuppressedConsole(async () => {
    assert.deepEqual(restoreProjectAutosaveFailFastResultViaService(App), {
      ok: false,
      reason: 'error',
      message: 'restore seam exploded',
    });
  });
});

test('project io autosave restore access enforces fail-fast options and rejects legacy pending results', () => {
  const restoreOptions: Array<Record<string, unknown> | undefined> = [];
  const App = {} as any;
  const svc = ensureProjectIoService(App) as any;

  svc.restoreAutosaveFailFast = (opts?: Record<string, unknown>) => {
    restoreOptions.push(opts);
    return { ok: false, reason: 'busy' };
  };

  assert.deepEqual(restoreProjectAutosaveFailFastResultViaService(App, { queueIfBusy: true } as never), {
    ok: false,
    reason: 'busy',
  });
  assert.equal(restoreOptions.length, 1);
  assert.equal(restoreOptions[0]?.queueIfBusy, false);

  svc.restoreAutosaveFailFast = () => ({ ok: true, pending: true });
  assert.deepEqual(restoreProjectAutosaveFailFastResultViaService(App), {
    ok: false,
    reason: 'error',
    message: 'Legacy pending restore results are not supported; recovery operations must settle terminally.',
  });
});
