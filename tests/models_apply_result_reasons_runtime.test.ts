import test from 'node:test';
import assert from 'node:assert/strict';

import { loadProjectStructureResult } from '../esm/native/services/models_apply_project.ts';
import { normalizeModelsCommandReason } from '../esm/native/runtime/models_access.ts';

test('model apply load result preserves canonical project load failure reasons', () => {
  const projectStructure = { settings: { width: 120 } } as any;
  const seen: string[] = [];

  const makeApp = (reason: string) =>
    ({
      services: {
        history: {
          system: {
            pushState() {
              seen.push(`push:${reason}`);
            },
          },
        },
        projectIO: {
          loadProjectData() {
            seen.push(`load:${reason}`);
            return { ok: false, reason };
          },
        },
      },
    }) as any;

  assert.deepEqual(loadProjectStructureResult(makeApp('invalid'), projectStructure), {
    ok: false,
    reason: 'invalid',
  });
  assert.deepEqual(loadProjectStructureResult(makeApp('superseded'), projectStructure), {
    ok: false,
    reason: 'superseded',
  });
  assert.deepEqual(loadProjectStructureResult(makeApp('error'), projectStructure), {
    ok: false,
    reason: 'error',
  });
  assert.deepEqual(loadProjectStructureResult({ services: {} } as any, projectStructure), {
    ok: false,
    reason: 'not-installed',
  });
  assert.deepEqual(seen, [
    'push:invalid',
    'load:invalid',
    'push:superseded',
    'load:superseded',
    'push:error',
    'load:error',
  ]);
});

test('models command reason normalization includes project-load-derived reasons', () => {
  assert.equal(normalizeModelsCommandReason('invalid'), 'invalid');
  assert.equal(normalizeModelsCommandReason('error'), 'error');
  assert.equal(normalizeModelsCommandReason('superseded'), 'superseded');
});

test('model apply load result preserves project-load error messages and thrown failures', () => {
  const projectStructure = { settings: { width: 120 } } as any;

  const appWithResultMessage = {
    services: {
      history: {
        system: {
          pushState() {},
        },
      },
      projectIO: {
        loadProjectData() {
          return { ok: false, reason: 'error', message: 'snapshot apply failed' };
        },
      },
    },
  } as any;

  const appWithThrownMessage = {
    services: {
      history: {
        system: {
          pushState() {},
        },
      },
      projectIO: {
        loadProjectData() {
          throw new Error('project loader exploded');
        },
      },
      uiFeedback: {
        toast() {},
      },
    },
  } as any;

  assert.deepEqual(loadProjectStructureResult(appWithResultMessage, projectStructure), {
    ok: false,
    reason: 'error',
    message: 'snapshot apply failed',
  });
  assert.deepEqual(loadProjectStructureResult(appWithThrownMessage, projectStructure), {
    ok: false,
    reason: 'error',
    message: 'project loader exploded',
  });
});
