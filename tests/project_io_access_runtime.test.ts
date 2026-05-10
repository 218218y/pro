import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureProjectIoRuntime,
  ensureProjectIoService,
  handleProjectFileLoadActionResultViaService,
  getProjectIoRestoreGeneration,
  handleProjectFileLoadResultViaService,
  loadProjectDataActionResultViaService,
  isProjectIoRestoreGenerationCurrent,
  loadProjectDataResultViaService,
  nextProjectIoRestoreGeneration,
  readAutosaveProjectPayload,
  restoreProjectAutosavePayloadActionResultViaService,
  restoreProjectSessionActionResultViaService,
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

test('project io access preserves concrete load failures through the shared load-result seam', () => {
  const missingApp = {} as any;
  assert.deepEqual(loadProjectDataResultViaService(missingApp, { settings: {} }), {
    ok: false,
    reason: 'not-installed',
  });

  const App = {} as any;
  const svc = ensureProjectIoService(App) as any;
  App.services.platform = { reportError() {} };
  svc.loadProjectData = () => ({ ok: false, reason: 'invalid', message: 'bad snapshot' });
  assert.deepEqual(loadProjectDataResultViaService(App, { settings: {} }, undefined, 'load'), {
    ok: false,
    reason: 'invalid',
    message: 'bad snapshot',
  });

  svc.loadProjectData = () => {
    throw new Error('loader exploded');
  };
  assert.deepEqual(
    loadProjectDataResultViaService(
      App,
      { settings: {} },
      { toast: false } as any,
      'load',
      '[WardrobePro] Shared load seam failed.'
    ),
    {
      ok: false,
      reason: 'error',
      message: 'loader exploded',
    }
  );
});

test('project io access preserves concrete legacy handleFileLoad failures through the shared file-load seam', async () => {
  const missingApp = {} as any;
  assert.deepEqual(await handleProjectFileLoadResultViaService(missingApp, { name: 'demo.json' }), {
    ok: false,
    reason: 'not-installed',
  });

  const App = {} as any;
  const svc = ensureProjectIoService(App) as any;
  App.services.platform = { reportError() {} };
  svc.handleFileLoad = async () => ({ ok: false, reason: 'invalid', message: 'bad file payload' });
  assert.deepEqual(await handleProjectFileLoadResultViaService(App, { name: 'demo.json' }, 'load'), {
    ok: false,
    reason: 'invalid',
    message: 'bad file payload',
  });

  svc.handleFileLoad = async () => {
    throw new Error('legacy file handler exploded');
  };
  assert.deepEqual(
    await handleProjectFileLoadResultViaService(
      App,
      { name: 'demo.json' },
      'load',
      '[WardrobePro] Shared file-load seam failed.'
    ),
    {
      ok: false,
      reason: 'error',
      message: 'legacy file handler exploded',
    }
  );
});

test('project io access also exposes canonical load/file-load action results for runtime callers', async () => {
  const missingApp = {} as any;
  assert.deepEqual(loadProjectDataActionResultViaService(missingApp, { settings: {} }), {
    ok: false,
    reason: 'not-installed',
  });
  assert.deepEqual(await handleProjectFileLoadActionResultViaService(missingApp, { name: 'demo.json' }), {
    ok: false,
    reason: 'not-installed',
  });

  const App = {} as any;
  const svc = ensureProjectIoService(App) as any;
  svc.loadProjectData = () => ({ ok: false, reason: 'load', message: 'legacy loader reason' });
  svc.handleFileLoad = async () => ({ ok: false, reason: 'load', message: 'legacy file reason' });

  assert.deepEqual(loadProjectDataActionResultViaService(App, { settings: {} }, undefined, 'error'), {
    ok: false,
    reason: 'error',
    message: 'legacy loader reason',
  });
  assert.deepEqual(await handleProjectFileLoadActionResultViaService(App, { name: 'demo.json' }, 'error'), {
    ok: false,
    reason: 'error',
    message: 'legacy file reason',
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
  assert.equal((payload.opts.meta as any)?.source, 'restore.local');
  assert.equal((payload.opts.meta as any)?.scope, 'runtime-test');
  assert.equal(loadCalls, 0);
});

test('project io access centralizes autosave restore action results for runtime/service callers', () => {
  const missingApp = {} as any;
  assert.deepEqual(restoreProjectSessionActionResultViaService(missingApp), {
    ok: false,
    reason: 'missing-autosave',
  });

  const invalidApp = {
    services: {
      storage: {
        KEYS: { AUTOSAVE_LATEST: 'autosave-key' },
        getString() {
          return '{bad-json';
        },
      },
    },
  } as any;
  assert.deepEqual(restoreProjectSessionActionResultViaService(invalidApp), {
    ok: false,
    reason: 'invalid',
  });

  const notInstalledApp = {
    services: {
      storage: {
        KEYS: { AUTOSAVE_LATEST: 'autosave-key' },
        getString() {
          return JSON.stringify({ settings: { width: 120 } });
        },
      },
    },
  } as any;
  assert.deepEqual(restoreProjectSessionActionResultViaService(notInstalledApp), {
    ok: false,
    reason: 'not-installed',
  });
});

test('project io access preserves concrete restore-load failures through the autosave restore seam', () => {
  const App = {} as any;
  const svc = ensureProjectIoService(App) as any;
  App.services.platform = { reportError() {} };
  const autosavePayload = {
    ok: true,
    data: { settings: { width: 120 } },
    opts: { toast: false, meta: { source: 'restore.local' } },
  } as const;

  svc.loadProjectData = () => ({ ok: false, reason: 'load', message: 'legacy restore reason' });
  assert.deepEqual(restoreProjectAutosavePayloadActionResultViaService(App, autosavePayload), {
    ok: false,
    reason: 'error',
    message: 'legacy restore reason',
  });

  svc.loadProjectData = () => {
    throw new Error('restore seam exploded');
  };
  assert.deepEqual(restoreProjectAutosavePayloadActionResultViaService(App, autosavePayload), {
    ok: false,
    reason: 'error',
    message: 'restore seam exploded',
  });
});
