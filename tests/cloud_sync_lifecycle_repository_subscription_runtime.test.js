import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createFetchStub,
  createTimerHarness,
  installCloudSyncService,
  makeApp,
} from './cloud_sync_lifecycle_runtime_helpers.js';
import { installCloudCollectionsService } from '../esm/native/services/cloud_collections_service.ts';

function installCrossTabLockHarness(app) {
  const tails = new Map();
  app.deps.browser.navigator.locks = {
    request(name, operation) {
      const previous = tails.get(name) || Promise.resolve();
      const request = previous.catch(() => undefined).then(operation);
      const settled = request.then(
        () => undefined,
        () => undefined
      );
      tails.set(name, settled);
      void settled.finally(() => {
        if (tails.get(name) === settled) tails.delete(name);
      });
      return request;
    },
  };
}

test('cloud_sync lifecycle: canonical repository events coalesce nested commits to one push timer', async () => {
  const timers = createTimerHarness();
  const fetchStub = createFetchStub();
  timers.install();
  fetchStub.install();

  try {
    const { app } = makeApp({ realtime: false, pollMs: 25 });
    installCrossTabLockHarness(app);

    const collections = installCloudCollectionsService(app).repository;
    assert.ok(collections);
    let nestedWrites = 0;
    const unsubscribe = collections.subscribe(() => {
      if (nestedWrites === 0) {
        nestedWrites++;
        void collections.transact(() => ({ savedColors: [{ id: 'c1', value: '#111111' }] }));
      }
    });

    await installCloudSyncService(app);

    assert.equal(timers.activeCount('interval'), 1);
    assert.equal(timers.activeCount('timeout'), 0);

    await collections.transact(() => ({ savedModels: [{ id: 'm1', name: 'Model 1' }] }));

    assert.equal(nestedWrites, 1, 'canonical repository notification should re-enter exactly once');
    assert.equal(
      timers.activeCount('timeout'),
      1,
      'nested synced writes should debounce/coalesce into one pending push timeout'
    );

    await collections.transact(() => ({ hiddenPresets: [] }));
    assert.deepEqual(collections.readEnvelope().savedColors, [{ id: 'c1', value: '#111111' }]);
    assert.equal(timers.activeCount('timeout'), 1);

    unsubscribe();
    app.services.cloudSync.dispose();
    assert.equal(timers.activeCount('interval'), 0);
    assert.equal(timers.activeCount('timeout'), 0);
  } finally {
    fetchStub.restore();
    timers.restore();
  }
});

test('cloud_sync lifecycle: dispose during repository notification leaves no timers or subscriptions', async () => {
  const timers = createTimerHarness();
  const fetchStub = createFetchStub();
  timers.install();
  fetchStub.install();

  try {
    const { app, storage } = makeApp({ realtime: false, pollMs: 25 });
    installCrossTabLockHarness(app);

    const userSetStringBeforeInstall = storage.setString;
    const collections = installCloudCollectionsService(app).repository;
    assert.ok(collections);
    let disposedInsideWrite = 0;
    await installCloudSyncService(app);
    const unsubscribe = collections.subscribe(() => {
      if (disposedInsideWrite === 0) {
        disposedInsideWrite++;
        const cs = app.services && app.services.cloudSync;
        if (cs && typeof cs.dispose === 'function') cs.dispose();
      }
    });

    assert.equal(storage.setString, userSetStringBeforeInstall, 'storage methods must remain unwrapped');
    assert.equal(timers.activeCount('interval'), 1);

    await collections.transact(() => ({ savedModels: [{ id: 'm1', name: 'Model 1' }] }));

    assert.equal(disposedInsideWrite, 1, 'dispose should have been triggered from inside storage callback');
    assert.equal(timers.activeCount('interval'), 0, 'dispose inside callback must clear polling interval');
    assert.equal(
      timers.activeCount('timeout'),
      0,
      'dispose inside callback must prevent push timeout scheduling'
    );

    assert.equal(storage.setString, userSetStringBeforeInstall);

    unsubscribe();
    await collections.transact(() => ({ savedModels: [] }));
    assert.equal(disposedInsideWrite, 1, 'restored method should not recursively dispose again');
    assert.equal(timers.activeCount('timeout'), 0);
  } finally {
    fetchStub.restore();
    timers.restore();
  }
});
