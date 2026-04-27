import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canInvokeCloudSyncPublishedDispose,
  clearCloudSyncPublishedState,
  disposePreviousCloudSyncInstall,
  publishCloudSyncDispose,
} from '../esm/native/services/cloud_sync_install_support.ts';

test('cloud sync install support preserves backward compatibility for untagged published dispose refs', () => {
  const App = {
    services: {
      cloudSync: {
        __publicationEpoch: 3,
        dispose: () => undefined,
      },
    },
  } as any;

  assert.equal(canInvokeCloudSyncPublishedDispose(App, App.services.cloudSync), true);
});

test('cloud sync install support stamps dispose epoch and reattaches it when cleanup preserves dispose', () => {
  const App = {
    services: {
      cloudSync: {
        __publicationEpoch: 1,
        panelApi: {},
        status: { room: 'room-a', realtime: { state: 'live' }, polling: { reason: 'live' } },
      },
    },
  } as any;

  let disposeCalls = 0;
  publishCloudSyncDispose(
    App,
    () => {
      disposeCalls += 1;
    },
    1
  );

  assert.equal(App.services.cloudSync.__disposePublicationEpoch, 1);
  assert.equal(typeof App.services.cloudSync.dispose, 'function');

  clearCloudSyncPublishedState(App, {
    preserveDispose: true,
    invalidatePublicationEpoch: true,
    publicationEpoch: 1,
  });

  assert.equal(typeof App.services.cloudSync.dispose, 'function');
  assert.equal(App.services.cloudSync.__disposePublicationEpoch, 1);
  assert.equal(App.services.cloudSync.__publicationEpoch, 2);

  App.services.cloudSync.dispose();
  assert.equal(disposeCalls, 0, 'preserved stale dispose should be inert after epoch invalidation');
});

test('cloud sync install support does fallback cleanup when the published dispose ref belongs to a stale epoch', () => {
  let staleDisposeCalls = 0;
  const App = {
    services: {
      cloudSync: {
        __publicationEpoch: 2,
        __disposePublicationEpoch: 1,
        dispose: () => {
          staleDisposeCalls += 1;
        },
        panelApi: { stale: true },
        status: {
          room: 'room-a',
          clientId: 'client-a',
          instanceId: 'instance-a',
          realtime: { enabled: true, mode: 'broadcast', state: 'live', channel: 'room-a' },
          polling: { active: true, intervalMs: 5000, reason: 'live' },
          lastPullAt: 1,
          lastPushAt: 2,
          lastRealtimeEventAt: 3,
          lastError: '',
          diagEnabled: true,
        },
        installedAt: 123,
      },
    },
  } as any;

  disposePreviousCloudSyncInstall(App);

  assert.equal(staleDisposeCalls, 0, 'stale dispose should not be invoked');
  assert.equal('panelApi' in App.services.cloudSync, false);
  assert.equal('status' in App.services.cloudSync, false);
  assert.equal('installedAt' in App.services.cloudSync, false);
  assert.equal('dispose' in App.services.cloudSync, false);
  assert.equal('__disposePublicationEpoch' in App.services.cloudSync, false);
  assert.equal(
    App.services.cloudSync.__publicationEpoch,
    3,
    'fallback cleanup should invalidate the active epoch'
  );
});

test('cloud sync install support clears only canonical published slots and preserves unrelated state', () => {
  const App = {
    services: {
      cloudSync: {
        __publicationEpoch: 4,
        panelApi: { installed: true },
        status: { room: 'room-z', realtime: { state: 'subscribed' }, polling: { reason: 'live' } },
        installedAt: 456,
        customCache: { keep: true },
      },
    },
  } as any;

  clearCloudSyncPublishedState(App, { invalidatePublicationEpoch: true, publicationEpoch: 4 });

  assert.equal('panelApi' in App.services.cloudSync, false);
  assert.equal('status' in App.services.cloudSync, false);
  assert.equal('installedAt' in App.services.cloudSync, false);
  assert.deepEqual(App.services.cloudSync.customCache, { keep: true });
  assert.equal(App.services.cloudSync.__publicationEpoch, 5);
});

test('cloud sync install support preserves canonical test hooks by default while clearing published slots', () => {
  const hooks = { createSupabaseClient: () => ({}) };
  const App = {
    services: {
      cloudSync: {
        __publicationEpoch: 7,
        panelApi: { installed: true },
        status: { room: 'room-z', realtime: { state: 'subscribed' }, polling: { reason: 'live' } },
        __testHooks: hooks,
      },
    },
  } as any;

  clearCloudSyncPublishedState(App);

  assert.equal('panelApi' in App.services.cloudSync, false);
  assert.equal('status' in App.services.cloudSync, false);
  assert.equal(App.services.cloudSync.__testHooks, hooks);
});

test('cloud sync install support drops test hooks when cleanup opts out of hook preservation', () => {
  const hooks = { createSupabaseClient: () => ({}) };
  const App = {
    services: {
      cloudSync: {
        __publicationEpoch: 2,
        panelApi: { installed: true },
        status: { room: 'room-z', realtime: { state: 'subscribed' }, polling: { reason: 'live' } },
        __testHooks: hooks,
      },
    },
  } as any;

  clearCloudSyncPublishedState(App, { preserveTestHooks: false });

  assert.equal('__testHooks' in App.services.cloudSync, false);
});
