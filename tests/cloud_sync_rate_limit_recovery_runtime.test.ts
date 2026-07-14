import test from 'node:test';
import assert from 'node:assert/strict';

import type { CloudSyncRuntimeStatus } from '../types';
import { createCloudSyncRateLimitRecovery } from '../esm/native/services/cloud_sync_rate_limit_recovery.ts';

function createStatus(retryAt: number): CloudSyncRuntimeStatus {
  return {
    room: 'room-a',
    clientId: 'client-a',
    instanceId: 'instance-a',
    realtime: { enabled: false, mode: 'broadcast', state: '', channel: '' },
    polling: { active: true, intervalMs: 2500, reason: 'fallback' },
    lastPullSuccessAt: 0,
    lastPushAt: 0,
    lastRealtimeEventAt: 0,
    lastError: 'credential:rate-limit',
    credential: {
      state: 'rate-limited',
      expiresAt: '',
      retryAt,
      failureKind: 'rate-limit',
    },
    diagEnabled: false,
  };
}

test('rate-limit recovery schedules one deadline retry, pushes first, then pulls all scopes', async () => {
  let now = 1_000;
  const status = createStatus(1_250);
  const scheduled: Array<{ handler: () => void; ms: number; cleared: boolean }> = [];
  let listener: ((next: CloudSyncRuntimeStatus) => void) | null = null;
  const calls: string[] = [];

  const recovery = createCloudSyncRateLimitRecovery({
    runtimeStatus: status,
    subscribeRuntimeStatus: next => {
      listener = next;
      return () => {
        listener = null;
      };
    },
    setTimeoutFn: (handler, ms) => {
      const entry = { handler, ms, cleared: false };
      scheduled.push(entry);
      return entry;
    },
    clearTimeoutFn: handle => {
      if (handle && typeof handle === 'object' && 'cleared' in handle) {
        (handle as { cleared: boolean }).cleared = true;
      }
    },
    isLive: () => true,
    pushMainNow: async () => {
      calls.push('push');
    },
    pullAllNow: opts => {
      calls.push(`pull:${opts.reason}:${opts.includeControls}`);
    },
    reportFailure: error => {
      throw error;
    },
    now: () => now,
  });

  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0]?.ms, 250);
  listener?.(status);
  assert.equal(scheduled.length, 1);

  now = 1_250;
  scheduled[0]?.handler();
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(calls, ['push', 'pull:rate-limit-recovery:true']);

  recovery.dispose();
  assert.equal(listener, null);
});

test('rate-limit recovery cancels the pending retry when credential state recovers early', () => {
  let listener: ((next: CloudSyncRuntimeStatus) => void) | null = null;
  const status = createStatus(2_000);
  const handles: Array<{ cleared: boolean }> = [];
  const recovery = createCloudSyncRateLimitRecovery({
    runtimeStatus: status,
    subscribeRuntimeStatus: next => {
      listener = next;
      return () => undefined;
    },
    setTimeoutFn: () => {
      const handle = { cleared: false };
      handles.push(handle);
      return handle;
    },
    clearTimeoutFn: handle => {
      if (handle && typeof handle === 'object' && 'cleared' in handle) {
        (handle as { cleared: boolean }).cleared = true;
      }
    },
    isLive: () => true,
    pushMainNow: async () => undefined,
    pullAllNow: () => undefined,
    reportFailure: () => undefined,
    now: () => 1_000,
  });

  status.credential = {
    state: 'active',
    expiresAt: '2099-01-01T00:00:00.000Z',
    retryAt: 0,
    failureKind: '',
  };
  listener?.(status);
  assert.equal(handles[0]?.cleared, true);
  recovery.dispose();
});
