import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createFetchStub,
  createTimerHarness,
  installCloudSyncService,
  makeApp,
} from './cloud_sync_lifecycle_runtime_helpers.js';

test('cloud_sync lifecycle: storage wrapper reentrancy coalesces nested writes to one push timer', async () => {
  const timers = createTimerHarness();
  const fetchStub = createFetchStub();
  timers.install();
  fetchStub.install();

  try {
    const { app, storage } = makeApp({ realtime: false, pollMs: 25 });

    const baseSetJSON = storage.setJSON;
    let nestedWrites = 0;
    storage.setJSON = function wrappedBaseSetJSON(k, v) {
      const ok = baseSetJSON.call(this, k, v);
      if (String(k) === String(storage.KEYS.SAVED_MODELS) && nestedWrites === 0) {
        nestedWrites++;
        this.setString(storage.KEYS.SAVED_COLORS, '[]');
      }
      return ok;
    };

    await installCloudSyncService(app);

    assert.equal(timers.activeCount('interval'), 1);
    assert.equal(timers.activeCount('timeout'), 0);

    storage.setJSON(storage.KEYS.SAVED_MODELS, [{ id: 'm1' }]);

    assert.equal(nestedWrites, 1, 'base storage method should have re-entered exactly once');
    assert.equal(
      timers.activeCount('timeout'),
      1,
      'nested synced writes should debounce/coalesce into one pending push timeout'
    );

    storage.remove(storage.KEYS.SAVED_COLORS);
    assert.equal(timers.activeCount('timeout'), 1);

    app.services.cloudSync.dispose();
    assert.equal(timers.activeCount('interval'), 0);
    assert.equal(timers.activeCount('timeout'), 0);
  } finally {
    fetchStub.restore();
    timers.restore();
  }
});

test('cloud_sync lifecycle: dispose during wrapped storage callback leaves no timers and restores wrappers', async () => {
  const timers = createTimerHarness();
  const fetchStub = createFetchStub();
  timers.install();
  fetchStub.install();

  try {
    const { app, storage } = makeApp({ realtime: false, pollMs: 25 });

    const userSetStringBeforeInstall = storage.setString;
    let disposedInsideWrite = 0;
    const userWrappedSetString = function wrappedBaseSetString(k, v) {
      const ok = userSetStringBeforeInstall.call(this, k, v);
      if (String(k) === String(storage.KEYS.SAVED_MODELS) && disposedInsideWrite === 0) {
        disposedInsideWrite++;
        const cs = app.services && app.services.cloudSync;
        if (cs && typeof cs.dispose === 'function') cs.dispose();
      }
      return ok;
    };
    storage.setString = userWrappedSetString;

    await installCloudSyncService(app);

    assert.notEqual(storage.setString, userSetStringBeforeInstall, 'cloud_sync wrapper should be installed');
    assert.equal(timers.activeCount('interval'), 1);

    storage.setString(storage.KEYS.SAVED_MODELS, '[]');

    assert.equal(disposedInsideWrite, 1, 'dispose should have been triggered from inside storage callback');
    assert.equal(timers.activeCount('interval'), 0, 'dispose inside callback must clear polling interval');
    assert.equal(
      timers.activeCount('timeout'),
      0,
      'dispose inside callback must prevent push timeout scheduling'
    );

    assert.equal(storage.setString, userWrappedSetString);
    assert.notEqual(storage.setString, userSetStringBeforeInstall);
    assert.equal('__wp_cloudSync_origStorageFns' in storage, false);

    storage.setString(storage.KEYS.SAVED_MODELS, '[]');
    assert.equal(disposedInsideWrite, 1, 'restored method should not recursively dispose again');
    assert.equal(timers.activeCount('timeout'), 0);
  } finally {
    fetchStub.restore();
    timers.restore();
  }
});
