import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deactivateCloudSyncStatusSurface,
  installCloudSyncStatusSurface,
  isCloudSyncStatusSurfaceFresh,
} from '../esm/native/services/cloud_sync_status_install.ts';

function createStatus(seed?: Partial<any>) {
  return {
    room: 'room-a',
    clientId: 'client-a',
    instanceId: 'instance-a',
    realtime: {
      enabled: true,
      mode: 'broadcast',
      state: 'init',
      channel: 'prefix:room-a',
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
    ...seed,
  };
}

test('cloud sync status install keeps canonical root and nested branches stable across refreshes', () => {
  const firstSource = createStatus();
  const installed = installCloudSyncStatusSurface(null, firstSource as any);
  const heldRealtime = installed.realtime;
  const heldPolling = installed.polling;

  const secondSource = createStatus({
    instanceId: 'instance-b',
    realtime: {
      ...firstSource.realtime,
      state: 'subscribed',
      channel: 'prefix:room-b',
    },
    polling: {
      active: true,
      intervalMs: 4000,
      reason: 'fallback',
    },
    lastPullAt: 11,
    lastError: 'none',
    extraFlag: true,
  });

  const refreshed = installCloudSyncStatusSurface(installed, secondSource as any);
  assert.equal(refreshed, installed);
  assert.equal(refreshed.realtime, heldRealtime);
  assert.equal(refreshed.polling, heldPolling);
  assert.equal(refreshed.instanceId, 'instance-b');
  assert.equal(refreshed.realtime.state, 'subscribed');
  assert.equal(refreshed.realtime.channel, 'prefix:room-b');
  assert.equal(refreshed.polling.active, true);
  assert.equal(refreshed.polling.reason, 'fallback');
  assert.equal(refreshed.lastPullAt, 11);
  assert.equal('extraFlag' in refreshed, false);

  const thirdSource = createStatus({
    instanceId: 'instance-c',
    realtime: {
      ...firstSource.realtime,
      state: 'disconnected',
    },
    polling: {
      active: false,
      intervalMs: 4500,
      reason: '',
    },
    lastPushAt: 22,
  });

  const third = installCloudSyncStatusSurface(refreshed, thirdSource as any);
  assert.equal(third, installed);
  assert.equal(third.realtime, heldRealtime);
  assert.equal(third.polling, heldPolling);
  assert.equal(third.instanceId, 'instance-c');
  assert.equal(third.realtime.state, 'disconnected');
  assert.equal(third.polling.active, false);
  assert.equal(third.lastPushAt, 22);
  assert.equal('extraFlag' in third, false);
});

test('cloud sync status install tombstones held status refs during surface deactivation', () => {
  const installed = installCloudSyncStatusSurface(null, createStatus() as any);
  const heldRealtime = installed.realtime;
  const heldPolling = installed.polling;

  deactivateCloudSyncStatusSurface(installed);

  assert.equal(installed.realtime, heldRealtime);
  assert.equal(installed.polling, heldPolling);
  assert.equal(installed.room, '');
  assert.equal(installed.clientId, '');
  assert.equal(installed.instanceId, '');
  assert.equal(installed.realtime.enabled, false);
  assert.equal(installed.realtime.state, 'unavailable');
  assert.equal(installed.realtime.channel, '');
  assert.equal(installed.polling.active, false);
  assert.equal(installed.polling.intervalMs, 0);
  assert.equal(installed.polling.reason, 'unavailable');
  assert.equal(installed.lastError, 'unavailable');
  assert.equal((installed as any).__wpCloudSyncStatusActive, false);
});

test('cloud sync status freshness check detects drift and extra keys on the canonical surface', () => {
  const source = createStatus();
  const installed = installCloudSyncStatusSurface(null, source as any);
  assert.equal(isCloudSyncStatusSurfaceFresh(installed, source as any), true);

  (installed as any).room = 'drifted-room';
  assert.equal(isCloudSyncStatusSurfaceFresh(installed, source as any), false);

  installCloudSyncStatusSurface(installed, source as any);
  (installed.realtime as any).state = 'drifted-state';
  assert.equal(isCloudSyncStatusSurfaceFresh(installed, source as any), false);

  installCloudSyncStatusSurface(installed, source as any);
  (installed as any).extraFlag = true;
  assert.equal(isCloudSyncStatusSurfaceFresh(installed, source as any), false);
});

test('cloud sync status install keeps marker metadata hidden and out of public clones', () => {
  const source = createStatus();
  const installed = installCloudSyncStatusSurface(null, source as any) as any;

  const installedDescriptor = Object.getOwnPropertyDescriptor(installed, '__wpCloudSyncStatusInstalled');
  const activeDescriptor = Object.getOwnPropertyDescriptor(installed, '__wpCloudSyncStatusActive');
  assert.equal(installedDescriptor?.enumerable, false);
  assert.equal(activeDescriptor?.enumerable, false);
  assert.equal(installed.__wpCloudSyncStatusInstalled, true);
  assert.equal(installed.__wpCloudSyncStatusActive, true);
  assert.equal(Object.keys(installed).includes('__wpCloudSyncStatusInstalled'), false);
  assert.equal(Object.keys(installed).includes('__wpCloudSyncStatusActive'), false);

  const cloned = { ...installed };
  assert.equal('__wpCloudSyncStatusInstalled' in cloned, false);
  assert.equal('__wpCloudSyncStatusActive' in cloned, false);

  deactivateCloudSyncStatusSurface(installed);
  const inactiveDescriptor = Object.getOwnPropertyDescriptor(installed, '__wpCloudSyncStatusActive');
  assert.equal(inactiveDescriptor?.enumerable, false);
  assert.equal(installed.__wpCloudSyncStatusActive, false);
});

test('cloud sync status install heals enumerable marker metadata even when the runtime snapshot is unchanged', () => {
  const source = createStatus();
  const installed = installCloudSyncStatusSurface(null, source as any) as any;
  const heldRealtime = installed.realtime;
  const heldPolling = installed.polling;

  const installedValue = installed.__wpCloudSyncStatusInstalled;
  const activeValue = installed.__wpCloudSyncStatusActive;
  delete installed.__wpCloudSyncStatusInstalled;
  delete installed.__wpCloudSyncStatusActive;
  installed.__wpCloudSyncStatusInstalled = installedValue;
  installed.__wpCloudSyncStatusActive = activeValue;

  assert.equal(Object.getOwnPropertyDescriptor(installed, '__wpCloudSyncStatusInstalled')?.enumerable, true);
  assert.equal(Object.getOwnPropertyDescriptor(installed, '__wpCloudSyncStatusActive')?.enumerable, true);
  assert.equal(isCloudSyncStatusSurfaceFresh(installed, source as any), false);

  const healed = installCloudSyncStatusSurface(installed, source as any) as any;
  assert.equal(healed, installed);
  assert.equal(healed.realtime, heldRealtime);
  assert.equal(healed.polling, heldPolling);
  assert.equal(Object.getOwnPropertyDescriptor(healed, '__wpCloudSyncStatusInstalled')?.enumerable, false);
  assert.equal(Object.getOwnPropertyDescriptor(healed, '__wpCloudSyncStatusActive')?.enumerable, false);
  assert.equal(Object.keys(healed).includes('__wpCloudSyncStatusInstalled'), false);
  assert.equal(Object.keys(healed).includes('__wpCloudSyncStatusActive'), false);
  assert.equal(isCloudSyncStatusSurfaceFresh(healed, source as any), true);
});

test('cloud sync status install heals drifted branch shells back to canonical plain objects', () => {
  const source = createStatus();
  const current = {
    room: source.room,
    clientId: source.clientId,
    instanceId: source.instanceId,
    realtime: [] as unknown[],
    polling: [] as unknown[],
    lastPullAt: source.lastPullAt,
    lastPushAt: source.lastPushAt,
    lastRealtimeEventAt: source.lastRealtimeEventAt,
    lastError: source.lastError,
    diagEnabled: false,
  } as any;

  Object.defineProperty(current, '__wpCloudSyncStatusInstalled', {
    configurable: true,
    enumerable: false,
    writable: true,
    value: true,
  });
  Object.defineProperty(current, '__wpCloudSyncStatusActive', {
    configurable: true,
    enumerable: false,
    writable: true,
    value: true,
  });

  const healed = installCloudSyncStatusSurface(current, source as any) as any;
  assert.equal(healed, current);
  assert.equal(Array.isArray(healed.realtime), false);
  assert.equal(Array.isArray(healed.polling), false);
  assert.deepEqual(healed.realtime, source.realtime);
  assert.deepEqual(healed.polling, source.polling);
  assert.equal(isCloudSyncStatusSurfaceFresh(healed, source as any), true);
});

test('cloud sync status install canonicalizes source runtime extras instead of mirroring them publicly', () => {
  const source = createStatus({
    realtime: {
      enabled: true,
      mode: 'broadcast',
      state: 'subscribed',
      channel: 'prefix:room-a',
      driftedRealtimeExtra: 'drop-me',
    },
    polling: {
      active: true,
      intervalMs: 4500,
      reason: 'fallback',
      driftedPollingExtra: 'drop-me',
    },
    extraRootFlag: true,
  } as any);

  const installed = installCloudSyncStatusSurface(null, source as any) as any;
  assert.equal('extraRootFlag' in installed, false);
  assert.equal('driftedRealtimeExtra' in installed.realtime, false);
  assert.equal('driftedPollingExtra' in installed.polling, false);
  assert.equal(isCloudSyncStatusSurfaceFresh(installed, source as any), true);
});
