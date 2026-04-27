import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureProjectIoService,
  getProjectIoServiceMaybe,
  nextProjectIoRestoreGeneration,
  isProjectIoRestoreGenerationCurrent,
  loadProjectDataViaService,
  loadProjectDataResultViaServiceOrThrow,
  exportProjectViaService,
  exportProjectResultViaService,
} from '../esm/native/runtime/project_io_access.ts';

test('project io access runtime: canonical access helpers keep restore-generation and command seams stable', () => {
  const calls: string[] = [];
  const App: Record<string, unknown> = { services: {} };

  const svc = ensureProjectIoService(App);
  (svc as Record<string, unknown>).loadProjectData = (_data: unknown, _opts?: unknown) => {
    calls.push('load');
    return { ok: true };
  };
  (svc as Record<string, unknown>).exportCurrentProject = () => {
    calls.push('export');
    return { payload: true };
  };

  assert.equal(getProjectIoServiceMaybe(App), svc);
  const gen = nextProjectIoRestoreGeneration(App);
  assert.equal(gen, 1);
  assert.equal(isProjectIoRestoreGenerationCurrent(App, gen), true);
  assert.deepEqual(loadProjectDataViaService(App, { ok: true }, { meta: { source: 'test' } } as any), {
    ok: true,
  });
  assert.deepEqual(exportProjectViaService(App, { source: 'test' }), { payload: true });
  assert.deepEqual(exportProjectResultViaService(App, { source: 'test' }), {
    ok: false,
    reason: 'invalid',
  });
  assert.deepEqual(calls, ['load', 'export', 'export']);
});

test('project io access runtime: export result seam preserves not-installed, invalid, and thrown-export outcomes', () => {
  const missingApp: Record<string, unknown> = { services: {} };
  assert.deepEqual(exportProjectResultViaService(missingApp, { source: 'missing' }), {
    ok: false,
    reason: 'not-installed',
  });

  const invalidApp: Record<string, unknown> = {
    services: { projectIO: { exportCurrentProject: () => ({ projectData: {} }) } },
  };
  assert.deepEqual(exportProjectResultViaService(invalidApp, { source: 'invalid' }), {
    ok: false,
    reason: 'invalid',
  });

  const okApp: Record<string, unknown> = {
    services: {
      projectIO: {
        exportCurrentProject: () => ({
          jsonStr: '{"ok":true}',
          projectData: { ok: true },
          defaultBaseName: 'demo',
        }),
      },
    },
  };
  assert.deepEqual(exportProjectResultViaService(okApp, { source: 'ok' }), {
    ok: true,
    exported: { jsonStr: '{"ok":true}', projectData: { ok: true }, defaultBaseName: 'demo' },
  });

  const errorApp: Record<string, unknown> = {
    services: {
      projectIO: {
        exportCurrentProject: () => {
          throw new Error('export exploded');
        },
      },
    },
  };
  assert.deepEqual(exportProjectResultViaService(errorApp, { source: 'error' }, 'fallback export message'), {
    ok: false,
    reason: 'error',
    message: 'export exploded',
  });
});

test('project io access runtime: strict load-result seam throws on missing installs, invalid results, pending results, and preserves real messages', () => {
  const okApp: Record<string, unknown> = {
    services: {
      projectIO: {
        loadProjectData: () => ({ ok: true, restoreGen: 3 }),
      },
    },
  };
  assert.deepEqual(
    loadProjectDataResultViaServiceOrThrow(
      okApp,
      { settings: {} } as any,
      { meta: { source: 'test' } } as any
    ),
    { ok: true, restoreGen: 3 }
  );

  assert.throws(
    () =>
      loadProjectDataResultViaServiceOrThrow(
        { services: {} },
        { settings: {} } as any,
        undefined,
        'not-installed',
        'fallback message',
        'smoke.reload'
      ),
    /smoke\.reload is not installed/i
  );

  const invalidApp: Record<string, unknown> = {
    services: {
      projectIO: {
        loadProjectData: () => ({ ok: false, reason: 'invalid' }),
      },
    },
  };
  assert.throws(
    () =>
      loadProjectDataResultViaServiceOrThrow(
        invalidApp,
        { settings: {} } as any,
        undefined,
        'invalid',
        'fallback message',
        'history.load'
      ),
    /history\.load returned an invalid result/i
  );

  const pendingApp: Record<string, unknown> = {
    services: {
      projectIO: {
        loadProjectData: () => ({ ok: true, pending: true }),
      },
    },
  };
  assert.throws(
    () =>
      loadProjectDataResultViaServiceOrThrow(
        pendingApp,
        { settings: {} } as any,
        undefined,
        'not-installed',
        'fallback message',
        'history.load'
      ),
    /history\.load returned an unexpected pending result/i
  );

  const messageApp: Record<string, unknown> = {
    services: {
      projectIO: {
        loadProjectData: () => ({ ok: false, reason: 'error', message: 'loader exploded' }),
      },
    },
  };
  assert.throws(
    () =>
      loadProjectDataResultViaServiceOrThrow(
        messageApp,
        { settings: {} } as any,
        undefined,
        'error',
        'fallback message',
        'history.load'
      ),
    /loader exploded/
  );
});
