import test from 'node:test';
import assert from 'node:assert/strict';

import {
  loadFromFileEvent,
  restoreLastSession,
  saveProject,
} from '../esm/native/ui/react/actions/project_actions.ts';
import {
  runProjectResetDefaultAction,
  runProjectRestoreAction,
} from '../esm/native/ui/project_recovery_runtime.ts';

test('project actions expose normalized save/load/restore command results', async () => {
  const App = {
    services: {
      storage: {
        KEYS: { AUTOSAVE_LATEST: 'autosave-key' },
        getString() {
          return JSON.stringify({ settings: {} });
        },
      },
      uiFeedback: {
        confirm(_title: string, _message: string, onYes?: (() => void) | null) {
          if (onYes) onYes();
        },
      },
      projectIO: {
        loadProjectData: () => ({ ok: false, reason: 'invalid' }),
        loadProjectDataFailFast: () => ({ ok: false, reason: 'invalid' }),
        buildDefaultProjectData: () => ({ settings: {}, toggles: {}, modulesConfiguration: [] }),
      },
    },
    actions: {
      saveProject: () => true,
    },
  } as any;

  const file = new Blob(['{"settings":{}}'], { type: 'application/json' }) as Blob & { name: string };
  file.name = 'project.json';
  assert.deepEqual(
    await loadFromFileEvent(App, { target: { files: [file], value: 'C:/fake/project.json' } } as any),
    {
      ok: false,
      reason: 'invalid',
    }
  );
  assert.deepEqual(await loadFromFileEvent({} as any, { target: { files: [file] } } as any), {
    ok: false,
    reason: 'not-installed',
  });
  assert.deepEqual(await restoreLastSession(App), { ok: false, reason: 'invalid' });
  assert.deepEqual(await restoreLastSession({} as any), { ok: false, reason: 'missing-autosave' });
  assert.deepEqual(saveProject(App), { ok: true });
  assert.deepEqual(saveProject({} as any), { ok: false, reason: 'not-installed' });

  const settled = Promise.resolve({ ok: true } as const);
  App.actions.saveProject = () => ({
    accepted: true,
    reused: false,
    operationId: 'project-save-test-1',
    requestedAt: 1,
    acceptedAt: 1,
    settled,
  });
  const pending = saveProject(App);
  assert.deepEqual(pending, {
    accepted: true,
    reused: false,
    operationId: 'project-save-test-1',
    requestedAt: 1,
    acceptedAt: 1,
    settled,
  });

  App.actions.saveProject = () => ({ ok: false, reason: 'busy' });
  assert.deepEqual(saveProject(App), { ok: false, reason: 'busy' });
});

test('project recovery feedback failures stay non-fatal after terminal success', async () => {
  const reports: string[] = [];
  const App = {
    services: {
      errors: {
        report(error: unknown) {
          reports.push((error as Error).message);
        },
      },
    },
  } as any;
  let toastCalls = 0;
  const feedback = {
    toast() {
      toastCalls += 1;
      throw new Error(`recovery toast exploded ${toastCalls}`);
    },
  };

  assert.deepEqual(
    await runProjectRestoreAction(App, feedback, async () => ({
      ok: true,
      warnings: [{ effect: 'build', message: 'final build failed' }],
    })),
    {
      ok: true,
      warnings: [{ effect: 'build', message: 'final build failed' }],
    }
  );
  assert.deepEqual(
    await runProjectResetDefaultAction(App, feedback, async () => ({ ok: true, restoreGen: 3 })),
    { ok: true, restoreGen: 3 }
  );
  assert.deepEqual(reports, ['recovery toast exploded 1', 'recovery toast exploded 2']);
});

test('project save action preserves actionable thrown messages through the canonical action seam', () => {
  const stringErrorApp = {
    actions: {
      saveProject() {
        throw 'save string exploded';
      },
    },
  } as any;

  const recordErrorApp = {
    actions: {
      saveProject() {
        throw { message: 'save record exploded' };
      },
    },
  } as any;

  assert.deepEqual(saveProject(stringErrorApp), {
    ok: false,
    reason: 'error',
    message: 'save string exploded',
  });
  assert.deepEqual(saveProject(recordErrorApp), {
    ok: false,
    reason: 'error',
    message: 'save record exploded',
  });
});
