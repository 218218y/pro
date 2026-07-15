import test from 'node:test';
import assert from 'node:assert/strict';

import { createProjectIoLoadOps } from '../esm/native/io/project_io_orchestrator_load_ops.ts';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

test('project io load ops settle restore callback results before restore toasts', async () => {
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
        loadProjectDataFailFast() {
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

  const result = await loadOps.restoreLastSession();

  assert.deepEqual(result, { ok: false, reason: 'not-installed' });
  assert.deepEqual(toasts, [{ message: 'שחזור העריכה לא זמין כרגע', type: 'error' }]);
});

test('project io load ops use the shared autosave-restore seam for concrete restore failures', async () => {
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
        loadProjectDataFailFast() {
          return { ok: false, reason: 'load', message: 'restore failure reason' };
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

  const result = await loadOps.restoreLastSession();

  assert.deepEqual(result, {
    ok: false,
    reason: 'error',
    message: 'restore failure reason',
  });
  assert.deepEqual(toasts, [{ message: 'restore failure reason', type: 'error' }]);
});

test('project io restore settles committed success before non-fatal warning feedback', async () => {
  const reports: string[] = [];
  const App = {
    services: {
      storage: {
        KEYS: { AUTOSAVE_LATEST: 'autosave-key' },
        getString() {
          return JSON.stringify({ settings: { width: 120 } });
        },
      },
      projectIO: {
        loadProjectDataFailFast() {
          return {
            ok: true,
            restoreGen: 4,
            warnings: [{ effect: 'build', message: 'final build failed' }],
          };
        },
      },
    },
  } as any;

  const loadOps = createProjectIoLoadOps({
    App,
    showToast() {
      throw new Error('toast exploded');
    },
    openCustomConfirm(_title, _message, onConfirm) {
      if (typeof onConfirm === 'function') onConfirm();
    },
    userAgent: 'node:test',
    schemaId: 'schema:test',
    schemaVersion: 1,
    reportNonFatal(op, error) {
      reports.push(`${op}:${(error as Error).message}`);
    },
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
  } as any);

  assert.deepEqual(await loadOps.restoreLastSession(), {
    ok: true,
    restoreGen: 4,
    warnings: [{ effect: 'build', message: 'final build failed' }],
  });
  assert.deepEqual(reports, ['restoreLastSession.feedback:toast exploded']);
});
