import test from 'node:test';
import assert from 'node:assert/strict';

import {
  markCloudSyncRealtimeDisconnected,
  markCloudSyncRealtimeFailure,
  markCloudSyncRealtimeSubscribed,
  markCloudSyncRealtimeTimeout,
} from '../esm/native/services/cloud_sync_lifecycle_realtime_support.ts';

test('cloud sync realtime recovery transitions stay quiet when the canonical lifecycle snapshot is already settled', () => {
  const runtimeStatus = {
    realtime: { enabled: true, mode: 'broadcast', state: 'disconnected:CLOSED', channel: '' },
    polling: { active: true, intervalMs: 5000, reason: 'realtime-CLOSED' },
    lastError: '',
  } as any;

  let publishCount = 0;
  let diagCount = 0;
  let startPollingCount = 0;

  markCloudSyncRealtimeDisconnected({
    runtimeStatus,
    publishStatus: () => {
      publishCount += 1;
    },
    diag: () => {
      diagCount += 1;
    },
    startPolling: () => {
      startPollingCount += 1;
    },
    subscribedRef: { current: false },
    why: 'CLOSED',
  });

  assert.equal(publishCount, 0);
  assert.equal(diagCount, 0);
  assert.equal(startPollingCount, 1, 'owner still reuses the canonical polling transition seam');
});

test('cloud sync realtime subscribed transition stays quiet on duplicate subscribed settlements once polling is already stopped', () => {
  const runtimeStatus = {
    realtime: { enabled: true, mode: 'broadcast', state: 'subscribed', channel: 'wp:room-a' },
    polling: { active: false, intervalMs: 5000, reason: 'realtime-subscribed' },
    lastError: '',
  } as any;

  let publishCount = 0;
  let diagCount = 0;
  let stopPollingCount = 0;

  markCloudSyncRealtimeSubscribed({
    App: {} as any,
    runtimeStatus,
    publishStatus: () => {
      publishCount += 1;
    },
    diag: () => {
      diagCount += 1;
    },
    suppressRef: { v: false },
    stopPolling: () => {
      stopPollingCount += 1;
    },
    pullAllNow: () => undefined,
    subscribedRef: { current: true },
    everSubscribedRef: { current: true },
  });

  assert.equal(publishCount, 0);
  assert.equal(diagCount, 0);
  assert.equal(stopPollingCount, 1);
});

test('cloud sync realtime failure publishes when only the error message changes even if the failure state already matches', () => {
  const runtimeStatus = {
    realtime: { enabled: true, mode: 'broadcast', state: 'missing-sdk', channel: '' },
    polling: { active: true, intervalMs: 5000, reason: 'missing-sdk' },
    lastError: 'old-error',
  } as any;

  let publishCount = 0;
  const diagPayloads: unknown[] = [];

  markCloudSyncRealtimeFailure({
    runtimeStatus,
    publishStatus: () => {
      publishCount += 1;
    },
    diag: (_event, payload) => {
      diagPayloads.push(payload);
    },
    state: 'missing-sdk',
    lastError: 'new-error',
    diagEvent: 'realtime:error',
    pollingReason: 'missing-sdk',
    startPolling: () => undefined,
  });

  assert.equal(runtimeStatus.lastError, 'new-error');
  assert.equal(publishCount, 1);
  assert.deepEqual(diagPayloads, ['new-error']);
});

test('cloud sync realtime timeout recovery stays quiet when timeout + polling fallback are already canonical', () => {
  const runtimeStatus = {
    realtime: { enabled: true, mode: 'broadcast', state: 'timeout', channel: '' },
    polling: { active: true, intervalMs: 5000, reason: 'realtime-timeout' },
    lastError: '',
  } as any;

  let publishCount = 0;
  let diagCount = 0;
  let startPollingCount = 0;

  markCloudSyncRealtimeTimeout({
    runtimeStatus,
    publishStatus: () => {
      publishCount += 1;
    },
    diag: () => {
      diagCount += 1;
    },
    startPolling: () => {
      startPollingCount += 1;
    },
  });

  assert.equal(publishCount, 0);
  assert.equal(diagCount, 0);
  assert.equal(startPollingCount, 1);
});
