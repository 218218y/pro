import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createFetchStub,
  createTimerHarness,
  installCloudSyncService,
  makeApp,
} from './cloud_sync_lifecycle_runtime_helpers.js';
import { clearCloudSyncPublishedState } from '../esm/native/services/cloud_sync_install_support.ts';

test('cloud_sync lifecycle: double install/uninstall stays idempotent and cleans listeners/wrappers', async () => {
  const timers = createTimerHarness();
  const fetchStub = createFetchStub();
  timers.install();
  fetchStub.install();

  try {
    const { app, win, doc, storage } = makeApp({ realtime: false, pollMs: 25 });

    await installCloudSyncService(app);
    assert.equal(typeof app.services.cloudSync.dispose, 'function');
    assert.equal(timers.activeCount('interval'), 1);
    assert.equal(win.listenerCount('focus'), 1);
    assert.equal(win.listenerCount('online'), 1);
    assert.equal(doc.listenerCount('visibilitychange'), 1);
    assert.notEqual(storage.setString, storage.__origFns.setString);
    assert.notEqual(storage.setJSON, storage.__origFns.setJSON);
    assert.notEqual(storage.remove, storage.__origFns.remove);
    assert.ok(storage.__wp_cloudSync_origStorageFns);

    await installCloudSyncService(app);
    assert.equal(typeof app.services.cloudSync.dispose, 'function');
    assert.equal(timers.activeCount('interval'), 1, 'reinstall should not leave old poll interval running');
    assert.equal(win.listenerCount('focus'), 1, 'reinstall should not duplicate focus listener');
    assert.equal(win.listenerCount('online'), 1, 'reinstall should not duplicate online listener');
    assert.equal(
      doc.listenerCount('visibilitychange'),
      1,
      'reinstall should not duplicate visibility listener'
    );

    app.services.cloudSync.dispose();
    app.services.cloudSync.dispose();

    assert.equal(timers.activeCount('interval'), 0);
    assert.equal(timers.activeCount('timeout'), 0);
    assert.equal(win.listenerCount('focus'), 0);
    assert.equal(win.listenerCount('online'), 0);
    assert.equal(doc.listenerCount('visibilitychange'), 0);

    assert.equal(storage.setString, storage.__origFns.setString);
    assert.equal(storage.setJSON, storage.__origFns.setJSON);
    assert.equal(storage.remove, storage.__origFns.remove);
    assert.equal('__wp_cloudSync_origStorageFns' in storage, false);
  } finally {
    fetchStub.restore();
    timers.restore();
  }
});

test('cloud_sync lifecycle: no timer/listener leaks after dispose', async () => {
  const timers = createTimerHarness();
  const fetchStub = createFetchStub();
  timers.install();
  fetchStub.install();

  try {
    const { app, win } = makeApp({ realtime: false, pollMs: 25 });
    await installCloudSyncService(app);

    const fetchCountBeforeDispose = fetchStub.calls.length;
    assert.equal(timers.activeCount('interval'), 1);

    app.services.cloudSync.dispose();

    assert.equal(timers.activeCount('interval'), 0);
    assert.equal(timers.activeCount('timeout'), 0);
    const ran = timers.runActive();
    assert.equal(ran, 0, 'no active timers should remain to run');

    win.dispatch('focus');
    win.dispatch('online');

    assert.equal(fetchStub.calls.length, fetchCountBeforeDispose);
  } finally {
    fetchStub.restore();
    timers.restore();
  }
});

test('cloud_sync lifecycle: installing a second app does not dispose the first app lifecycle', async () => {
  const timers = createTimerHarness();
  const fetchStub = createFetchStub();
  timers.install();
  fetchStub.install();

  try {
    const first = makeApp({ realtime: false, pollMs: 25 });
    const second = makeApp({ realtime: false, pollMs: 25 });

    await installCloudSyncService(first.app);
    assert.equal(typeof first.app.services.cloudSync.dispose, 'function');
    assert.equal(timers.activeCount('interval'), 1);
    assert.equal(first.win.listenerCount('focus'), 1);

    await installCloudSyncService(second.app);
    assert.equal(typeof second.app.services.cloudSync.dispose, 'function');
    assert.equal(timers.activeCount('interval'), 2, 'each app should keep its own polling lifecycle');
    assert.equal(first.win.listenerCount('focus'), 1, 'first app listeners must survive second app install');
    assert.equal(second.win.listenerCount('focus'), 1, 'second app should install its own listeners');

    second.app.services.cloudSync.dispose();

    assert.equal(timers.activeCount('interval'), 1, 'disposing app2 must not tear down app1');
    assert.equal(first.win.listenerCount('focus'), 1);
    assert.equal(second.win.listenerCount('focus'), 0);

    first.app.services.cloudSync.dispose();
    assert.equal(timers.activeCount('interval'), 0);
  } finally {
    fetchStub.restore();
    timers.restore();
  }
});

test('cloud_sync lifecycle: realtime reconnect/dispose race is ignored after dispose', async () => {
  const timers = createTimerHarness();
  const fetchStub = createFetchStub();
  timers.install();
  fetchStub.install();

  let subscribeCb = null;
  const realtimeChangeHandlers = [];
  const clientStats = { removeChannel: 0, disconnect: 0, channelCalls: 0 };

  const fakeChannel = {
    on(_event, _filter, cb) {
      if (typeof cb === 'function') realtimeChangeHandlers.push(cb);
      return fakeChannel;
    },
    subscribe(cb) {
      subscribeCb = cb;
      return fakeChannel;
    },
  };

  const fakeClient = {
    channel(_name) {
      clientStats.channelCalls++;
      return fakeChannel;
    },
    removeChannel(_ch) {
      clientStats.removeChannel++;
      return true;
    },
    realtime: {
      disconnect() {
        clientStats.disconnect++;
      },
    },
  };

  try {
    const { app } = makeApp({ realtime: true, testCreateSupabaseClient: () => fakeClient });

    await installCloudSyncService(app);
    await Promise.resolve();

    assert.equal(clientStats.channelCalls, 1);
    assert.equal(typeof subscribeCb, 'function');
    assert.equal(
      timers.activeCount('timeout'),
      1,
      'connect timeout should be armed before subscribe resolves'
    );
    assert.equal(
      timers.activeCount('interval'),
      0,
      'polling should not start before realtime disconnect/timeout'
    );

    app.services.cloudSync.dispose();
    assert.equal(timers.activeCount('timeout'), 0, 'dispose should clear realtime connect timeout');

    subscribeCb('CLOSED');
    subscribeCb('SUBSCRIBED');
    for (const cb of realtimeChangeHandlers) cb({});

    assert.equal(timers.activeCount('interval'), 0);
    assert.equal(timers.activeCount('timeout'), 0);
    assert.equal(clientStats.removeChannel, 1);
    assert.equal(clientStats.disconnect, 1);
  } finally {
    fetchStub.restore();
    timers.restore();
  }
});

test('cloud_sync lifecycle: dispose clears published public state but preserves test hooks', async () => {
  const timers = createTimerHarness();
  const fetchStub = createFetchStub();
  timers.install();
  fetchStub.install();

  try {
    const createSupabaseClient = () => ({ channel() {}, removeChannel() {} });
    const { app } = makeApp({ realtime: false, pollMs: 25, testCreateSupabaseClient: createSupabaseClient });

    await installCloudSyncService(app);
    assert.equal(typeof app.services.cloudSync.dispose, 'function');
    assert.ok(app.services.cloudSync.panelApi);
    assert.ok(app.services.cloudSync.status);
    assert.equal(typeof app.services.cloudSync.__testHooks?.createSupabaseClient, 'function');

    const heldStatus = app.services.cloudSync.status;
    const heldRealtime = heldStatus.realtime;
    const heldPolling = heldStatus.polling;

    app.services.cloudSync.dispose();

    assert.equal(
      typeof app.services.cloudSync.dispose,
      'function',
      'dispose should stay callable/idempotent'
    );
    assert.equal('panelApi' in app.services.cloudSync, false);
    assert.equal('status' in app.services.cloudSync, false);
    assert.equal('installedAt' in app.services.cloudSync, false);
    assert.equal(app.services.cloudSync.__testHooks?.createSupabaseClient, createSupabaseClient);
    assert.equal(heldStatus.realtime, heldRealtime);
    assert.equal(heldStatus.polling, heldPolling);
    assert.equal(heldStatus.room, '');
    assert.equal(heldStatus.realtime.state, 'unavailable');
    assert.equal(heldStatus.polling.reason, 'unavailable');
    assert.equal(heldStatus.lastError, 'unavailable');

    app.services.cloudSync.dispose();
    assert.equal('panelApi' in app.services.cloudSync, false);
  } finally {
    fetchStub.restore();
    timers.restore();
  }
});

test('cloud_sync lifecycle: invalidated publication epoch blocks stale polling and listener-driven pulls even before cleanup finishes', async () => {
  const timers = createTimerHarness();
  const fetchStub = createFetchStub();
  timers.install();
  fetchStub.install();

  try {
    const { app, win, doc } = makeApp({ realtime: false, pollMs: 25 });

    await installCloudSyncService(app);
    const fetchCountAfterInstall = fetchStub.calls.length;
    const publicationEpoch = Number(app.services.cloudSync.__publicationEpoch || 0);

    assert.equal(
      timers.activeCount('interval'),
      1,
      'install should leave one polling interval active before invalidation'
    );
    assert.equal(win.listenerCount('focus'), 1);
    assert.equal(win.listenerCount('online'), 1);
    assert.equal(doc.listenerCount('visibilitychange'), 1);

    clearCloudSyncPublishedState(app, {
      invalidatePublicationEpoch: true,
      publicationEpoch,
    });

    timers.runActive('interval');
    win.dispatch('focus');
    win.dispatch('online');
    doc.dispatch('visibilitychange');
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(
      fetchStub.calls.length,
      fetchCountAfterInstall,
      'stale lifecycle should stop scheduling new pulls once its publication epoch is invalidated'
    );
  } finally {
    fetchStub.restore();
    timers.restore();
  }
});

test('cloud_sync lifecycle: stale held dispose refs do not clear newer public state', async () => {
  const timers = createTimerHarness();
  const fetchStub = createFetchStub();
  timers.install();
  fetchStub.install();

  try {
    const createSupabaseClient = () => ({ channel() {}, removeChannel() {} });
    const { app } = makeApp({ realtime: false, pollMs: 25, testCreateSupabaseClient: createSupabaseClient });

    await installCloudSyncService(app);
    const staleDispose = app.services.cloudSync.dispose;
    const firstEpoch = Number(app.services.cloudSync.__publicationEpoch || 0);

    await installCloudSyncService(app);
    assert.ok(app.services.cloudSync.panelApi);
    assert.ok(app.services.cloudSync.status);
    assert.equal(typeof app.services.cloudSync.dispose, 'function');
    assert.equal(timers.activeCount('interval'), 1);

    staleDispose();

    assert.ok(app.services.cloudSync.panelApi, 'stale dispose should not clear newer panelApi');
    assert.ok(app.services.cloudSync.status, 'stale dispose should not clear newer status');
    assert.equal(typeof app.services.cloudSync.dispose, 'function');
    assert.equal(Number(app.services.cloudSync.__publicationEpoch || 0) > firstEpoch, true);
    assert.equal(
      timers.activeCount('interval'),
      1,
      'stale dispose should not tear down the live polling interval'
    );

    app.services.cloudSync.dispose();
    assert.equal(timers.activeCount('interval'), 0);
  } finally {
    fetchStub.restore();
    timers.restore();
  }
});

test('cloud_sync lifecycle: stale install stops initial pull fanout and never starts a new lifecycle after reinstall wins mid-bootstrap', async () => {
  const timers = createTimerHarness();
  const originalFetch = globalThis.fetch;
  timers.install();

  let releaseFirstFetch = null;
  const calls = [];
  globalThis.fetch = (url, init = {}) => {
    calls.push({
      url: String(url || ''),
      method: String((init && init.method) || 'GET'),
    });

    if (calls.length === 1) {
      return new Promise(resolve => {
        releaseFirstFetch = () => {
          resolve({
            ok: false,
            status: 404,
            async json() {
              return null;
            },
          });
        };
      });
    }

    return Promise.resolve({
      ok: false,
      status: 404,
      async json() {
        return null;
      },
    });
  };

  try {
    const { app, win, doc } = makeApp({ realtime: false, pollMs: 25 });

    const firstInstall = installCloudSyncService(app);
    await Promise.resolve();
    assert.equal(calls.length, 1, 'first install should be waiting on its first initial pull');
    assert.equal(typeof app.services.cloudSync.dispose, 'function');

    const secondInstall = installCloudSyncService(app);
    await secondInstall;
    const callsAfterWinningReinstall = calls.length;
    assert.equal(
      callsAfterWinningReinstall > 1,
      true,
      'winning reinstall should complete its own bootstrap pulls while the stale install stays parked'
    );

    releaseFirstFetch?.();
    await firstInstall;

    assert.equal(
      calls.length - callsAfterWinningReinstall <= 1,
      true,
      'stale install may finish only the already in-flight main pull work, but must not continue the remaining bootstrap fanout'
    );
    assert.equal(
      timers.activeCount('interval'),
      1,
      'only the live reinstall should own one polling interval'
    );
    assert.equal(win.listenerCount('focus'), 1);
    assert.equal(win.listenerCount('online'), 1);
    assert.equal(doc.listenerCount('visibilitychange'), 1);

    app.services.cloudSync.dispose();
    assert.equal(timers.activeCount('interval'), 0);
    assert.equal(win.listenerCount('focus'), 0);
    assert.equal(win.listenerCount('online'), 0);
    assert.equal(doc.listenerCount('visibilitychange'), 0);
  } finally {
    globalThis.fetch = originalFetch;
    timers.restore();
  }
});
test('cloud_sync lifecycle: failed reinstall clears stale public state when config disappears', async () => {
  const timers = createTimerHarness();
  const fetchStub = createFetchStub();
  timers.install();
  fetchStub.install();

  try {
    const createSupabaseClient = () => ({ channel() {}, removeChannel() {} });
    const { app } = makeApp({ realtime: false, pollMs: 25, testCreateSupabaseClient: createSupabaseClient });

    await installCloudSyncService(app);
    assert.ok(app.services.cloudSync.panelApi);
    assert.ok(app.services.cloudSync.status);
    assert.equal(typeof app.services.cloudSync.dispose, 'function');

    delete app.deps.config.supabaseCloudSync.url;
    await installCloudSyncService(app);

    assert.equal('panelApi' in app.services.cloudSync, false);
    assert.equal('status' in app.services.cloudSync, false);
    assert.equal('installedAt' in app.services.cloudSync, false);
    assert.equal('dispose' in app.services.cloudSync, false);
    assert.equal(app.services.cloudSync.__testHooks?.createSupabaseClient, createSupabaseClient);
  } finally {
    fetchStub.restore();
    timers.restore();
  }
});
