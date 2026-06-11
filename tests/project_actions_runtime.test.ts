import test from 'node:test';
import assert from 'node:assert/strict';

import {
  loadFromFileEvent,
  restoreLastSession,
  saveProject,
} from '../esm/native/ui/react/actions/project_actions.ts';

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

  App.actions.saveProject = () => ({ ok: true, pending: true });
  assert.deepEqual(saveProject(App), { ok: true, pending: true });

  App.actions.saveProject = () => ({ ok: false, reason: 'busy' });
  assert.deepEqual(saveProject(App), { ok: false, reason: 'busy' });
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
