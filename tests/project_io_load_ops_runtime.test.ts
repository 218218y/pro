import test from 'node:test';
import assert from 'node:assert/strict';

import { createProjectIoLoadOps } from '../esm/native/io/project_io_orchestrator_load_ops.ts';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function createLoadOps(App: Record<string, unknown>) {
  return createProjectIoLoadOps({
    App,
    showToast() {
      throw new Error('restore must not emit Project I/O feedback');
    },
    userAgent: 'node:test',
    schemaId: 'schema:test',
    schemaVersion: 1,
    reportNonFatal() {},
    metaRestore(source, meta) {
      return { source, ...(asRecord(meta) || {}) };
    },
    getHistorySystem() {
      return null;
    },
    deepCloneJson(value) {
      return JSON.parse(JSON.stringify(value));
    },
    getProjectNameFromState() {
      return '';
    },
    asRecord,
    log() {},
  } as never);
}

test('project io load ops expose a terminal autosave restore without owning confirmation or feedback', () => {
  const loadOps = createLoadOps({ services: {} });

  assert.equal('restoreLastSession' in loadOps, false);
  assert.deepEqual(loadOps.restoreAutosaveFailFast(), {
    ok: false,
    reason: 'missing-autosave',
  });
});

test('project io autosave restore reports invalid persisted data terminally without UI side effects', () => {
  const loadOps = createLoadOps({
    services: {
      storage: {
        KEYS: { AUTOSAVE_LATEST: 'autosave-key' },
        getString() {
          return '{bad-json';
        },
      },
    },
  });

  assert.deepEqual(loadOps.restoreAutosaveFailFast(), {
    ok: false,
    reason: 'invalid',
  });
});
