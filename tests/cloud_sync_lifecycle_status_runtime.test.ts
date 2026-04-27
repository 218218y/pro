import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mutateCloudSyncLifecycleSnapshot,
  readCloudSyncLifecycleSnapshot,
  resolveCloudSyncLifecyclePhase,
} from '../esm/native/services/cloud_sync_lifecycle_status_runtime.ts';

function makeRuntimeStatus(overrides?: Partial<any>): any {
  return {
    room: 'public',
    clientId: 'client-a',
    instanceId: 'instance-a',
    realtime: {
      enabled: true,
      mode: 'broadcast',
      state: 'init',
      channel: '',
      ...(overrides?.realtime || {}),
    },
    polling: {
      active: false,
      intervalMs: 5000,
      reason: '',
      ...(overrides?.polling || {}),
    },
    lastPullAt: 0,
    lastPushAt: 0,
    lastRealtimeEventAt: 0,
    lastError: '',
    ...(overrides || {}),
  };
}

test('cloud sync lifecycle snapshot resolves canonical phases across disabled/live/recovering paths', () => {
  assert.equal(
    resolveCloudSyncLifecyclePhase({ enabled: false, state: 'disabled', channel: '', pollingActive: false }),
    'disabled'
  );
  assert.equal(
    resolveCloudSyncLifecyclePhase({ enabled: false, state: 'disabled', channel: '', pollingActive: true }),
    'polling-only'
  );
  assert.equal(
    resolveCloudSyncLifecyclePhase({
      enabled: true,
      state: 'connecting',
      channel: 'wp:room-a',
      pollingActive: false,
    }),
    'realtime-connecting'
  );
  assert.equal(
    resolveCloudSyncLifecyclePhase({
      enabled: true,
      state: 'subscribed',
      channel: 'wp:room-a',
      pollingActive: false,
    }),
    'realtime-live'
  );
  assert.equal(
    resolveCloudSyncLifecyclePhase({ enabled: true, state: 'timeout', channel: '', pollingActive: true }),
    'polling-only'
  );
  assert.equal(
    resolveCloudSyncLifecyclePhase({
      enabled: true,
      state: 'missing-sdk',
      channel: '',
      pollingActive: false,
    }),
    'realtime-recovering'
  );
});

test('cloud sync lifecycle snapshot mutation publishes once for an atomic disabled+polling settlement', () => {
  const runtimeStatus = makeRuntimeStatus({
    realtime: { enabled: true, state: 'init', channel: 'stale-channel' },
    polling: { active: false, intervalMs: 5000, reason: '' },
    lastError: 'stale-error',
  });

  const publishCalls: string[] = [];
  const diagCalls: Array<{ event: string; payload: unknown }> = [];

  const result = mutateCloudSyncLifecycleSnapshot({
    runtimeStatus,
    publishStatus: () => {
      const snapshot = readCloudSyncLifecycleSnapshot(runtimeStatus);
      publishCalls.push(
        `${snapshot.phase}|${snapshot.state}|${snapshot.pollingActive ? 'active' : 'idle'}|${snapshot.pollingReason}|${snapshot.lastError}`
      );
    },
    diag: (event, payload) => {
      diagCalls.push({ event, payload });
    },
    diagEvent: 'lifecycle:settle',
    diagPayload: 'polling-disabled',
    mutate: () => {
      runtimeStatus.lastError = '';
      runtimeStatus.realtime.enabled = false;
      runtimeStatus.realtime.state = 'disabled';
      runtimeStatus.realtime.channel = '';
      runtimeStatus.polling.active = true;
      runtimeStatus.polling.reason = 'realtime-disabled';
    },
  });

  assert.equal(result.changed, true);
  assert.equal(result.before.phase, 'idle');
  assert.equal(result.after.phase, 'polling-only');
  assert.deepEqual(publishCalls, ['polling-only|disabled|active|realtime-disabled|']);
  assert.deepEqual(diagCalls, [{ event: 'lifecycle:settle', payload: 'polling-disabled' }]);
});

test('cloud sync lifecycle snapshot mutation stays quiet when the canonical snapshot already matches', () => {
  const runtimeStatus = makeRuntimeStatus({
    realtime: { enabled: false, state: 'disabled', channel: '' },
    polling: { active: true, intervalMs: 5000, reason: 'realtime-disabled' },
  });
  let publishCount = 0;
  let diagCount = 0;

  const result = mutateCloudSyncLifecycleSnapshot({
    runtimeStatus,
    publishStatus: () => {
      publishCount += 1;
    },
    diag: () => {
      diagCount += 1;
    },
    diagEvent: 'lifecycle:settle',
    mutate: () => {
      runtimeStatus.realtime.enabled = false;
      runtimeStatus.realtime.state = 'disabled';
      runtimeStatus.realtime.channel = '';
      runtimeStatus.polling.active = true;
      runtimeStatus.polling.reason = 'realtime-disabled';
    },
  });

  assert.equal(result.changed, false);
  assert.equal(result.before.phase, 'polling-only');
  assert.equal(result.after.phase, 'polling-only');
  assert.equal(publishCount, 0);
  assert.equal(diagCount, 0);
});
