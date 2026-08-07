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
  forceAutosaveNowResultViaService,
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
  autosave.forceSaveNowResult = () => (calls.push('force-result'), { ok: true });

  assert.equal(getAutosaveServiceMaybe(App), autosave);
  assert.equal(setAutosaveAllowed(App, true), true);
  assert.equal(autosave.allow, true);
  assert.equal(scheduleAutosaveViaService(App), true);
  assert.equal(cancelAutosavePendingViaService(App), true);
  assert.equal(flushAutosavePendingViaService(App), true);
  assert.equal(forceAutosaveNowViaService(App), true);
  assert.deepEqual(forceAutosaveNowResultViaService(App), { ok: true });

  const project = ensureProjectCaptureService(App);
  project.capture = (scope: unknown) => ({ scope, ok: true });
  assert.deepEqual(captureProjectSnapshotMaybe(App, 'persist'), { scope: 'persist', ok: true });

  assert.deepEqual(calls, ['schedule', 'cancel', 'flush', 'force-result', 'force-result']);
});

test('autosave access preserves safe failure reasons and rejects invalid owner results', () => {
  const App: Record<string, any> = {
    services: {
      autosave: {
        forceSaveNowResult: () => ({ ok: false, reason: 'storage-write-failed' }),
      },
    },
  };

  assert.deepEqual(forceAutosaveNowResultViaService(App), {
    ok: false,
    reason: 'storage-write-failed',
  });

  App.services.autosave.forceSaveNowResult = () => ({ ok: true });
  assert.deepEqual(forceAutosaveNowResultViaService(App), { ok: true });

  for (const invalidResult of [
    { ok: true, reason: 'storage-write-failed' },
    { ok: true, detail: 'owner-threw' },
    { ok: true, extra: true },
    Promise.resolve({ ok: true }),
    { ok: true, then() {} },
  ]) {
    App.services.autosave.forceSaveNowResult = () => invalidResult;
    assert.deepEqual(forceAutosaveNowResultViaService(App), {
      ok: false,
      reason: 'owner-rejected',
      detail: 'owner-invalid-result',
    });
  }

  App.services.autosave.forceSaveNowResult = () => ({ ok: false, reason: 'project-payload' });
  assert.deepEqual(forceAutosaveNowResultViaService(App), {
    ok: false,
    reason: 'owner-rejected',
    detail: 'owner-invalid-result',
  });

  App.services.autosave.forceSaveNowResult = undefined;
  App.services.autosave.forceSaveNow = () => true;
  assert.deepEqual(forceAutosaveNowResultViaService(App), { ok: true });

  App.services.autosave.forceSaveNow = () => false;
  assert.deepEqual(forceAutosaveNowResultViaService(App), {
    ok: false,
    reason: 'owner-rejected',
    detail: 'legacy-owner-returned-false',
  });

  for (const invalidLegacyResult of [Promise.resolve(false), {}, 'yes', 1]) {
    App.services.autosave.forceSaveNow = () => invalidLegacyResult;
    assert.deepEqual(forceAutosaveNowResultViaService(App), {
      ok: false,
      reason: 'owner-rejected',
      detail: 'owner-invalid-result',
    });
  }

  assert.deepEqual(forceAutosaveNowResultViaService({ services: {} }), {
    ok: false,
    reason: 'service-unavailable',
  });
});

test('autosave access sanitizes owner exceptions and returns only safe diagnostic detail', () => {
  const sensitiveValue = 'wardrobe_autosave_latest:{"privateProject":"secret"}';
  const ownerError = new Error(sensitiveValue);
  const reports: unknown[] = [];
  const App = {
    services: {
      autosave: {
        forceSaveNowResult() {
          throw ownerError;
        },
      },
    },
  };

  assert.deepEqual(
    forceAutosaveNowResultViaService(App, error => {
      reports.push(error);
    }),
    { ok: false, reason: 'owner-rejected', detail: 'owner-threw' }
  );
  assert.equal(reports.length, 1);
  assert.notEqual(reports[0], ownerError);
  assert.equal(reports[0] instanceof Error, true);
  assert.equal((reports[0] as Error).message, 'Autosave owner threw: Error');
  assert.equal((reports[0] as Error).message.includes(sensitiveValue), false);

  assert.deepEqual(
    forceAutosaveNowResultViaService(App, () => {
      throw new Error('reporter failed');
    }),
    { ok: false, reason: 'owner-rejected', detail: 'owner-threw' }
  );
});

test('autosave access observes malformed rejected thenables without awaiting or leaking rejection data', async () => {
  const sensitiveValue = 'wardrobe_autosave_latest:{"privateProject":"secret"}';
  const unhandledRejections: unknown[] = [];
  const reports: unknown[] = [];
  const onUnhandledRejection = (reason: unknown) => {
    unhandledRejections.push(reason);
  };
  process.on('unhandledRejection', onUnhandledRejection);

  const App: Record<string, any> = {
    services: {
      autosave: {},
    },
  };
  const expectedInvalidResult = {
    ok: false,
    reason: 'owner-rejected',
    detail: 'owner-invalid-result',
  };

  try {
    for (const typedThenable of [
      Promise.resolve({ ok: true }),
      Promise.reject(new Error(sensitiveValue)),
      {
        then(_resolve: (value: unknown) => void, reject: (reason: unknown) => void) {
          reject({ sensitiveValue });
        },
      },
      Object.create(
        Object.defineProperty({}, 'then', {
          get() {
            throw new Error(sensitiveValue);
          },
        }),
        { ok: { value: true, enumerable: true } }
      ),
    ]) {
      App.services.autosave.forceSaveNowResult = () => typedThenable;
      assert.deepEqual(
        forceAutosaveNowResultViaService(App, error => reports.push(error)),
        expectedInvalidResult
      );
    }

    App.services.autosave.forceSaveNowResult = undefined;
    for (const legacyThenable of [Promise.resolve(false), Promise.reject({ sensitiveValue })]) {
      App.services.autosave.forceSaveNow = () => legacyThenable;
      assert.deepEqual(
        forceAutosaveNowResultViaService(App, error => reports.push(error)),
        expectedInvalidResult
      );
    }

    await Promise.resolve();
    await new Promise<void>(resolve => setImmediate(resolve));

    assert.deepEqual(unhandledRejections, []);
    assert.deepEqual(reports, []);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
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
  assert.deepEqual(normalizeAutosavePayload({ settings: { width: 120 }, version: '2.1', timestamp: 123 }), {
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
            return JSON.stringify({ settings: {}, version: '2.1', timestamp: 555, dateString: '17:30' });
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

test('autosave access reports schedule/cancel/flush owner exceptions while preserving fail-soft results', () => {
  const reports: Array<{ op?: string }> = [];
  const App: any = {
    services: {
      errors: {
        report(_error: unknown, ctx?: { op?: string }) {
          reports.push(ctx || {});
        },
      },
      autosave: {
        schedule() {
          throw new Error('schedule failed');
        },
        cancelPending() {
          throw new Error('cancel failed');
        },
        flushPending() {
          throw new Error('flush failed');
        },
      },
    },
  };

  assert.equal(scheduleAutosaveViaService(App), false);
  assert.equal(cancelAutosavePendingViaService(App), false);
  assert.equal(flushAutosavePendingViaService(App), false);
  assert.equal(
    reports.some(ctx => ctx.op === 'schedule.ownerRejected'),
    true
  );
  assert.equal(
    reports.some(ctx => ctx.op === 'cancelPending.ownerRejected'),
    true
  );
  assert.equal(
    reports.some(ctx => ctx.op === 'flushPending.ownerRejected'),
    true
  );
});
