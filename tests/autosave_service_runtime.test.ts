import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureAutosaveService,
  getAutosaveServiceMaybe,
  setAutosaveAllowed,
  scheduleAutosaveViaService,
  cancelAutosavePendingViaService,
  flushAutosavePendingViaService,
  forceAutosaveNowViaService,
  normalizeAutosaveInfo,
  normalizeAutosavePayload,
  readAutosaveInfoFromStorage,
  readAutosavePayloadFromStorage,
  readAutosavePayloadFromStorageResult,
} from '../esm/native/runtime/autosave_access.ts';
import {
  ensureProjectCaptureService,
  captureProjectSnapshotMaybe,
} from '../esm/native/runtime/project_capture_access.ts';

test('autosave/project-capture runtime: canonical access helpers drive the service surfaces', () => {
  const calls: string[] = [];
  const App: Record<string, unknown> = { services: {} };

  const autosave = ensureAutosaveService(App);
  autosave.schedule = () => calls.push('schedule');
  autosave.cancelPending = () => (calls.push('cancel'), true);
  autosave.flushPending = () => (calls.push('flush'), true);
  autosave.forceSaveNow = () => (calls.push('force'), true);

  assert.equal(getAutosaveServiceMaybe(App), autosave);
  assert.equal(setAutosaveAllowed(App, true), true);
  assert.equal(autosave.allow, true);
  assert.equal(scheduleAutosaveViaService(App), true);
  assert.equal(cancelAutosavePendingViaService(App), true);
  assert.equal(flushAutosavePendingViaService(App), true);
  assert.equal(forceAutosaveNowViaService(App), true);

  const project = ensureProjectCaptureService(App);
  project.capture = (scope: unknown) => ({ scope, ok: true });
  assert.deepEqual(captureProjectSnapshotMaybe(App, 'persist'), { scope: 'persist', ok: true });

  assert.deepEqual(calls, ['schedule', 'cancel', 'flush', 'force']);
});

test('autosave access: canonical autosave info normalization keeps restore availability but drops junk fields', () => {
  assert.deepEqual(normalizeAutosaveInfo({ timestamp: 123, dateString: 'saved', junk: true }), {
    timestamp: 123,
    dateString: 'saved',
  });
  assert.deepEqual(normalizeAutosaveInfo({ timestamp: Number.NaN, dateString: 42 }), {});
  assert.deepEqual(normalizeAutosaveInfo({ settings: { width: 120 } }), {});
  assert.equal(normalizeAutosaveInfo(null), null);
  assert.equal(normalizeAutosaveInfo([]), null);
});

test('autosave access: canonical autosave payload normalization keeps valid restore payloads and rejects junk', () => {
  assert.deepEqual(normalizeAutosavePayload({ settings: { width: 120 }, timestamp: 123 }), {
    settings: { width: 120 },
    timestamp: 123,
  });
  assert.equal(normalizeAutosavePayload(null), null);
  assert.equal(normalizeAutosavePayload([]), null);
});

test('autosave access: storage helpers share one canonical payload seam and self-clean invalid payloads', () => {
  const removed: string[] = [];
  const App = {
    services: {
      storage: {
        KEYS: { AUTOSAVE_LATEST: 'autosave-key' },
        getString(key: string) {
          if (key === 'autosave-key')
            return JSON.stringify({ settings: {}, timestamp: 555, dateString: '17:30' });
          return null;
        },
        remove(key: string) {
          removed.push(key);
          return true;
        },
      },
    },
  } as any;

  assert.deepEqual(readAutosavePayloadFromStorageResult(App), {
    ok: true,
    payload: { settings: {}, timestamp: 555, dateString: '17:30' },
  });
  assert.deepEqual(readAutosavePayloadFromStorage(App), {
    settings: {},
    timestamp: 555,
    dateString: '17:30',
  });
  assert.deepEqual(readAutosaveInfoFromStorage(App), { timestamp: 555, dateString: '17:30' });
  assert.deepEqual(removed, []);

  App.services.storage.getString = () => JSON.stringify({ settings: {} });
  assert.deepEqual(readAutosavePayloadFromStorageResult(App), {
    ok: true,
    payload: { settings: {} },
  });
  assert.deepEqual(readAutosavePayloadFromStorage(App), { settings: {} });
  assert.deepEqual(readAutosaveInfoFromStorage(App), {});
  assert.deepEqual(removed, []);

  App.services.storage.getString = () => '{bad-json';
  assert.deepEqual(readAutosavePayloadFromStorageResult(App), { ok: false, reason: 'invalid' });
  assert.equal(readAutosavePayloadFromStorage(App), null);
  assert.equal(readAutosaveInfoFromStorage(App), null);
  assert.deepEqual(removed, ['autosave-key', 'autosave-key', 'autosave-key']);

  App.services.storage.getString = () => '[]';
  assert.deepEqual(readAutosavePayloadFromStorageResult(App), { ok: false, reason: 'invalid' });
  assert.equal(readAutosavePayloadFromStorage(App), null);
  assert.equal(readAutosaveInfoFromStorage(App), null);
  assert.deepEqual(removed, [
    'autosave-key',
    'autosave-key',
    'autosave-key',
    'autosave-key',
    'autosave-key',
    'autosave-key',
  ]);

  App.services.storage.getString = () => null;
  assert.deepEqual(readAutosavePayloadFromStorageResult(App), { ok: false, reason: 'missing-autosave' });
  assert.equal(readAutosavePayloadFromStorage(App), null);
  assert.equal(readAutosaveInfoFromStorage(App), null);
});
