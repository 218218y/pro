import test from 'node:test';
import assert from 'node:assert/strict';

import { createProjectIoLoadOps } from '../esm/native/io/project_io_orchestrator_load_ops.ts';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

test('project io load ops normalize restore callback results before restore toasts', () => {
  const toasts: Array<{ message: unknown; type: unknown }> = [];
  const App = {
    services: {
      storage: {
        KEYS: { AUTOSAVE_LATEST: 'autosave-key' },
        getString(key: string) {
          return key === 'autosave-key' ? JSON.stringify({ settings: { width: 120 } }) : null;
        },
      },
      projectIO: {
        loadProjectData() {
          return { ok: false, reason: 'not installed' };
        },
      },
    },
  } as any;

  const loadOps = createProjectIoLoadOps({
    App,
    showToast(message, type) {
      toasts.push({ message, type });
    },
    openCustomConfirm(_title, _message, onConfirm) {
      if (typeof onConfirm === 'function') onConfirm();
    },
    userAgent: 'node:test',
    schemaId: 'schema:test',
    schemaVersion: 1,
    reportNonFatal() {},
    metaRestore(source, meta) {
      return { source, ...(asRecord(meta) || {}) };
    },
    metaUiOnly(source, meta) {
      return { source, ...(asRecord(meta) || {}) };
    },
    setProjectIoRestoring() {},
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
  });

  const pending = loadOps.restoreLastSession();

  assert.deepEqual(pending, { ok: true, pending: true });
  assert.deepEqual(toasts, [{ message: 'שחזור העריכה לא זמין כרגע', type: 'error' }]);
});

test('project io load ops use the shared autosave-restore seam for legacy restore failures', () => {
  const toasts: Array<{ message: unknown; type: unknown }> = [];
  const App = {
    services: {
      storage: {
        KEYS: { AUTOSAVE_LATEST: 'autosave-key' },
        getString(key: string) {
          return key === 'autosave-key' ? JSON.stringify({ settings: { width: 120 } }) : null;
        },
      },
      projectIO: {
        loadProjectData() {
          return { ok: false, reason: 'load', message: 'legacy restore reason' };
        },
      },
    },
  } as any;

  const loadOps = createProjectIoLoadOps({
    App,
    showToast(message, type) {
      toasts.push({ message, type });
    },
    openCustomConfirm(_title, _message, onConfirm) {
      if (typeof onConfirm === 'function') onConfirm();
    },
    userAgent: 'node:test',
    schemaId: 'schema:test',
    schemaVersion: 1,
    reportNonFatal() {},
    metaRestore(source, meta) {
      return { source, ...(asRecord(meta) || {}) };
    },
    metaUiOnly(source, meta) {
      return { source, ...(asRecord(meta) || {}) };
    },
    setProjectIoRestoring() {},
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
  });

  const pending = loadOps.restoreLastSession();

  assert.deepEqual(pending, { ok: true, pending: true });
  assert.deepEqual(toasts, [{ message: 'legacy restore reason', type: 'error' }]);
});
