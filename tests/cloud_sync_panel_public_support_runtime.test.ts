import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cloneCloudSyncPublicPanelSnapshot,
  cloneCloudSyncPublicRuntimeStatus,
  cloneCloudSyncPublicSite2TabsGateSnapshot,
  getUnavailableCloudSyncPanelSnapshot,
  getUnavailableCloudSyncRuntimeStatus,
  getUnavailableCloudSyncSite2TabsGateSnapshot,
} from '../esm/native/services/cloud_sync_panel_api_public_support.ts';
import {
  areCloudSyncPanelSnapshotsEqual,
  areCloudSyncSite2TabsGateSnapshotsEqual,
} from '../esm/native/services/cloud_sync_panel_api_support.ts';

test('cloud sync public support clones panel and tabs-gate snapshots canonically', () => {
  assert.deepEqual(getUnavailableCloudSyncPanelSnapshot(), {
    room: '',
    isPublic: null,
    status: 'offline',
    credentialState: 'offline',
    credentialExpiresAt: '',
    retryAt: 0,
    failureKind: 'network',
    floatingSync: false,
  });

  assert.deepEqual(
    cloneCloudSyncPublicPanelSnapshot({
      room: 'room-a',
      isPublic: true,
      status: 'online',
      floatingSync: 1,
    }),
    {
      room: 'room-a',
      isPublic: true,
      status: 'online',
      credentialState: 'missing',
      credentialExpiresAt: '',
      retryAt: 0,
      failureKind: '',
      floatingSync: true,
    }
  );

  assert.deepEqual(cloneCloudSyncPublicPanelSnapshot(null), getUnavailableCloudSyncPanelSnapshot());

  const conflictSnapshot = cloneCloudSyncPublicPanelSnapshot({
    room: 'room-a',
    isPublic: false,
    status: 'conflict',
    floatingSync: false,
    conflict: {
      conflictId: 'conflict-1',
      generation: 3,
      room: 'room-a',
      keys: ['savedColors'],
      remoteRevision: 7,
      detectedAt: 12,
      state: 'awaiting-resolution',
      base: { secret: 'must-not-leak' },
      local: { secret: 'must-not-leak' },
      remote: { secret: 'must-not-leak' },
    },
  });
  assert.deepEqual(conflictSnapshot.conflict, {
    conflictId: 'conflict-1',
    generation: 3,
    room: 'room-a',
    keys: ['savedColors'],
    remoteRevision: 7,
    detectedAt: 12,
    state: 'awaiting-resolution',
  });

  assert.deepEqual(getUnavailableCloudSyncSite2TabsGateSnapshot(), {
    open: false,
    until: 0,
    minutesLeft: 0,
  });

  assert.deepEqual(
    cloneCloudSyncPublicSite2TabsGateSnapshot({
      open: 1,
      until: '15',
      minutesLeft: '4',
    }),
    {
      open: true,
      until: 15,
      minutesLeft: 4,
    }
  );

  assert.deepEqual(
    cloneCloudSyncPublicSite2TabsGateSnapshot(undefined),
    getUnavailableCloudSyncSite2TabsGateSnapshot()
  );
});

test('cloud sync public runtime status clone falls back to unavailable canonical snapshot', () => {
  const fallback = getUnavailableCloudSyncRuntimeStatus();
  const clonedFallback = cloneCloudSyncPublicRuntimeStatus(null);
  assert.deepEqual(clonedFallback, fallback);
  assert.notEqual(clonedFallback, fallback);
  assert.notEqual(clonedFallback.realtime, fallback.realtime);
  assert.notEqual(clonedFallback.polling, fallback.polling);

  const runtime = cloneCloudSyncPublicRuntimeStatus({
    room: 'room-a',
    clientId: 'client-a',
    instanceId: 'instance-a',
    realtime: {
      enabled: true,
      mode: 'broadcast',
      state: 'subscribed',
      channel: 'prefix:room-a',
    },
    polling: {
      active: true,
      intervalMs: 4000,
      reason: 'fallback',
    },
    lastPullAttemptAt: 8,
    lastPullFailureAt: 9,
    lastPullSuccessAt: 10,
    lastPushAt: 11,
    lastRealtimeEventAt: 12,
    lastError: 'none',
    diagEnabled: true,
  });

  assert.deepEqual(runtime, {
    room: 'room-a',
    clientId: 'client-a',
    instanceId: 'instance-a',
    realtime: {
      enabled: true,
      mode: 'broadcast',
      state: 'subscribed',
      channel: 'prefix:room-a',
    },
    polling: {
      active: true,
      intervalMs: 4000,
      reason: 'fallback',
    },
    lastPullAttemptAt: 8,
    lastPullFailureAt: 9,
    lastPullSuccessAt: 10,
    lastPushAt: 11,
    lastRealtimeEventAt: 12,
    lastError: 'none',
    diagEnabled: true,
  });
});

test('cloud sync panel support snapshot equality stays canonical across exact clones only', () => {
  const panelSnapshot = {
    room: 'room-a',
    isPublic: false,
    status: 'private',
    credentialState: 'active' as const,
    credentialExpiresAt: '2030-01-01T00:00:00.000Z',
    retryAt: 0,
    failureKind: '',
    floatingSync: true,
  };
  assert.equal(areCloudSyncPanelSnapshotsEqual(panelSnapshot, { ...panelSnapshot }), true);
  assert.equal(
    areCloudSyncPanelSnapshotsEqual(panelSnapshot, { ...panelSnapshot, floatingSync: false }),
    false
  );
  assert.equal(
    areCloudSyncPanelSnapshotsEqual(panelSnapshot, { ...panelSnapshot, credentialState: 'expired' }),
    false
  );
  assert.equal(
    areCloudSyncPanelSnapshotsEqual(
      {
        ...panelSnapshot,
        conflict: {
          room: 'room-a',
          keys: ['savedColors'],
          remoteRevision: 1,
          detectedAt: 1,
          state: 'awaiting-resolution',
        },
      },
      {
        ...panelSnapshot,
        conflict: {
          room: 'room-a',
          keys: ['savedModels'],
          remoteRevision: 1,
          detectedAt: 1,
          state: 'awaiting-resolution',
        },
      }
    ),
    false
  );

  assert.equal(
    areCloudSyncSite2TabsGateSnapshotsEqual(
      { open: true, until: 10, minutesLeft: 1 },
      { open: true, until: 10, minutesLeft: 1 }
    ),
    true
  );
  assert.equal(
    areCloudSyncSite2TabsGateSnapshotsEqual(
      { open: true, until: 10, minutesLeft: 1 },
      { open: true, until: 11, minutesLeft: 1 }
    ),
    false
  );
});
