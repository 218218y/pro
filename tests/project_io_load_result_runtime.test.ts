import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeProjectIoLoadResult,
  normalizeProjectLoadActionResultViaProjectIo,
} from '../esm/native/runtime/project_io_access.ts';
import { loadProjectStructure } from '../esm/native/services/models_apply_project.ts';

test('project io load result normalization keeps command outcomes canonical', () => {
  assert.deepEqual(normalizeProjectIoLoadResult(true), { ok: true });
  assert.deepEqual(normalizeProjectIoLoadResult(false, 'load'), { ok: false, reason: 'load' });
  assert.deepEqual(
    normalizeProjectIoLoadResult({ ok: false, restoreGen: 3, reason: 'superseded', message: 'stale' }),
    { ok: false, restoreGen: 3, reason: 'superseded', message: 'stale' }
  );
  assert.deepEqual(normalizeProjectIoLoadResult(undefined, 'missing'), { ok: false, reason: 'missing' });
});

test('project io exposes a separate canonical load-action normalization seam for runtime callers', () => {
  assert.deepEqual(normalizeProjectLoadActionResultViaProjectIo(true), { ok: true });
  assert.deepEqual(
    normalizeProjectLoadActionResultViaProjectIo({ ok: false, reason: 'load', message: 'legacy' }, 'error'),
    { ok: false, reason: 'error', message: 'legacy' }
  );
  assert.deepEqual(normalizeProjectLoadActionResultViaProjectIo(undefined, 'not-installed'), {
    ok: false,
    reason: 'not-installed',
  });
});

test('model apply only reports success when project io confirms a successful load', () => {
  const calls: string[] = [];
  const projectStructure = { settings: { width: 120 } } as any;

  const AppFail = {
    services: {
      history: {
        system: {
          pushState() {
            calls.push('fail:push');
          },
        },
      },
      projectIO: {
        loadProjectData() {
          calls.push('fail:load');
          return { ok: false, reason: 'error' };
        },
      },
    },
  } as any;

  assert.equal(loadProjectStructure(AppFail, projectStructure), false);
  assert.deepEqual(calls, ['fail:push', 'fail:load']);

  const AppOk = {
    services: {
      history: {
        system: {
          pushState() {
            calls.push('ok:push');
          },
        },
      },
      projectIO: {
        loadProjectData() {
          calls.push('ok:load');
          return { ok: true, restoreGen: 7 };
        },
      },
    },
  } as any;

  assert.equal(loadProjectStructure(AppOk, projectStructure), true);
  assert.deepEqual(calls, ['fail:push', 'fail:load', 'ok:push', 'ok:load', 'ok:push']);
});
