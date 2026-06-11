import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCloudSyncOwnerStatusPublisher,
  publishCloudSyncOwnerStatusSurface,
} from '../esm/native/services/cloud_sync_owner_context_status_publication_runtime.ts';
import {
  installCloudSyncStatusSurface,
  isCloudSyncStatusSurfaceFresh,
} from '../esm/native/services/cloud_sync_status_install.ts';

function createRuntimeStatus() {
  return {
    room: 'room-a',
    clientId: 'client-a',
    instanceId: 'instance-a',
    realtime: {
      enabled: true,
      mode: 'broadcast' as const,
      state: 'connecting' as const,
      channel: 'wp:room-a',
    },
    polling: {
      active: false,
      intervalMs: 5000,
      reason: '',
    },
    lastPullAt: 0,
    lastPushAt: 0,
    lastRealtimeEventAt: 0,
    lastError: '',
    diagEnabled: false,
  };
}

function createApp() {
  return {
    services: {
      cloudSync: {
        __publicationEpoch: 1,
      },
    },
  } as any;
}

test('cloud sync owner status publication skips reinstall when the canonical status surface is already fresh', () => {
  const App = createApp();
  const runtimeStatus = createRuntimeStatus();
  const state = App.services.cloudSync as Record<string, unknown>;
  state.status = installCloudSyncStatusSurface(undefined, runtimeStatus as any);
  const heldStatus = state.status;

  const result = publishCloudSyncOwnerStatusSurface({
    App,
    runtimeStatus: runtimeStatus as any,
    publicationEpoch: 1,
    lastPublishedStatusSnapshot: '',
  });

  assert.equal(result.published, false);
  assert.equal(result.reason, 'fresh-surface');
  assert.equal(state.status, heldStatus);
  assert.equal(isCloudSyncStatusSurfaceFresh(state.status, runtimeStatus as any), true);
});

test('cloud sync owner status publication heals a stale surface even when the snapshot memo already matches', () => {
  const App = createApp();
  const runtimeStatus = createRuntimeStatus();
  const state = App.services.cloudSync as Record<string, unknown>;
  state.status = { stale: true };

  const publisher = createCloudSyncOwnerStatusPublisher({
    App,
    runtimeStatus: runtimeStatus as any,
    publicationEpoch: 1,
    reportNonFatal: () => undefined,
  });
  publisher.publishStatus();
  const firstSnapshot = publisher.readLastPublishedStatusSnapshot();
  const healedStatus = state.status;
  assert.equal(isCloudSyncStatusSurfaceFresh(healedStatus, runtimeStatus as any), true);

  state.status = { staleAgain: true };
  const result = publishCloudSyncOwnerStatusSurface({
    App,
    runtimeStatus: runtimeStatus as any,
    publicationEpoch: 1,
    lastPublishedStatusSnapshot: firstSnapshot,
  });

  assert.equal(result.published, false);
  assert.equal(result.reason, 'healed-surface');
  assert.equal(isCloudSyncStatusSurfaceFresh(state.status, runtimeStatus as any), true);
});

test('cloud sync owner status publisher keeps its memo in sync after a publish-free fresh-surface pass', () => {
  const App = createApp();
  const runtimeStatus = createRuntimeStatus();
  const state = App.services.cloudSync as Record<string, unknown>;
  state.status = installCloudSyncStatusSurface(undefined, runtimeStatus as any);
  const heldStatus = state.status;

  const publisher = createCloudSyncOwnerStatusPublisher({
    App,
    runtimeStatus: runtimeStatus as any,
    publicationEpoch: 1,
    reportNonFatal: () => undefined,
  });

  publisher.publishStatus();
  assert.notEqual(publisher.readLastPublishedStatusSnapshot(), '');

  publisher.publishStatus();
  assert.equal(state.status, heldStatus);
  assert.equal(isCloudSyncStatusSurfaceFresh(state.status, runtimeStatus as any), true);
});
