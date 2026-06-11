import test from 'node:test';
import assert from 'node:assert/strict';

import { requestCloudSyncLifecycleRefresh } from '../esm/native/services/cloud_sync_lifecycle_support.ts';
import {
  createCloudSyncAttentionPullMutableState,
  requestCloudSyncAttentionPull,
} from '../esm/native/services/cloud_sync_lifecycle_attention_pulls_runtime.ts';
import { startCloudSyncPolling } from '../esm/native/services/cloud_sync_lifecycle_support.ts';

function createApp(reported: Array<{ error: unknown; ctx: any }>) {
  const doc = {
    visibilityState: 'visible',
    createElement() {
      return {};
    },
    querySelector() {
      return null;
    },
  };
  const nav = { onLine: true, userAgent: 'unit-test' };
  return {
    deps: {
      browser: {
        window: { navigator: nav, document: doc },
        document: doc,
        navigator: nav,
      },
    },
    services: {
      platform: {
        reportError(error: unknown, ctx: any) {
          reported.push({ error, ctx });
        },
      },
    },
  } as any;
}

async function flushCloudSyncRecoveryMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

test('cloud sync lifecycle refresh reports synchronous pull failures as pull-error without throwing', () => {
  const reported: Array<{ error: unknown; ctx: any }> = [];
  const result = requestCloudSyncLifecycleRefresh({
    App: createApp(reported),
    runtimeStatus: { realtime: { state: 'disconnected', channel: '' } } as any,
    suppressRef: { v: false },
    pullAllNow: () => {
      throw new Error('refresh pull failed');
    },
    opts: { reason: 'manual-refresh' },
    policy: { allowWhenRealtime: false, allowWhenHidden: false, allowWhenOffline: false },
    reportOp: 'cloudSyncLifecycle.testRefresh',
  });

  assert.deepEqual(result, { accepted: false, blockedBy: 'pull-error' });
  assert.equal(reported.length, 1);
  assert.equal((reported[0]?.error as Error).message, 'refresh pull failed');
  assert.equal(reported[0]?.ctx?.op, 'cloudSyncLifecycle.testRefresh');
});

test('cloud sync lifecycle refresh reports async pull rejections without detaching callers', async () => {
  const reported: Array<{ error: unknown; ctx: any }> = [];
  const result = requestCloudSyncLifecycleRefresh({
    App: createApp(reported),
    runtimeStatus: { realtime: { state: 'disconnected', channel: '' } } as any,
    suppressRef: { v: false },
    pullAllNow: () => Promise.reject(new Error('refresh pull rejected')) as any,
    opts: { reason: 'manual-refresh' },
    policy: { allowWhenRealtime: false, allowWhenHidden: false, allowWhenOffline: false },
    reportOp: 'cloudSyncLifecycle.testRefresh',
  });

  assert.deepEqual(result, { accepted: true, blockedBy: null });
  await flushCloudSyncRecoveryMicrotasks();
  assert.equal(reported.length, 1);
  assert.equal((reported[0]?.error as Error).message, 'refresh pull rejected');
  assert.equal(reported[0]?.ctx?.op, 'cloudSyncLifecycle.testRefresh');
});

test('cloud sync attention pull uses lifecycle refresh recovery and remains eligible after sync failure', () => {
  const reported: Array<{ error: unknown; ctx: any }> = [];
  const pullCalls: Array<{ reason?: string }> = [];
  const state = createCloudSyncAttentionPullMutableState(10_000);
  let shouldThrow = true;

  const first = requestCloudSyncAttentionPull({
    App: createApp(reported),
    runtimeStatus: { realtime: { state: 'disconnected', channel: '' } } as any,
    suppressRef: { v: false },
    state,
    reason: 'online',
    now: 16_000,
    pullAllNow: () => {
      if (shouldThrow) throw new Error('attention pull failed');
    },
  });

  assert.equal(first, false);
  assert.equal(state.lastAttentionPullAt, 0);
  assert.equal(reported.length, 1);
  assert.equal((reported[0]?.error as Error).message, 'attention pull failed');
  assert.equal(reported[0]?.ctx?.op, 'onlineListener.callback');

  shouldThrow = false;
  const second = requestCloudSyncAttentionPull({
    App: createApp(reported),
    runtimeStatus: { realtime: { state: 'disconnected', channel: '' } } as any,
    suppressRef: { v: false },
    state,
    reason: 'online',
    now: 16_100,
    pullAllNow: opts => {
      pullCalls.push({ reason: opts?.reason });
    },
  });

  assert.equal(second, true);
  assert.equal(state.lastAttentionPullAt, 16_100);
  assert.deepEqual(pullCalls, [{ reason: 'attention:online' }]);
});

test('cloud sync polling start reports async recovery hook rejections without losing fallback polling', async () => {
  const reported: Array<{ error: unknown; ctx: any }> = [];
  const ticks: Array<() => void> = [];
  const runtimeStatus = {
    realtime: { enabled: true, mode: 'broadcast', state: 'timeout', channel: '' },
    polling: { active: false, intervalMs: 0, reason: '' },
  } as any;
  const pollTimerRef = { current: null as number | null };

  startCloudSyncPolling({
    App: createApp(reported),
    pollTimerRef,
    setIntervalFn: handler => {
      ticks.push(handler);
      return 33;
    },
    clearIntervalFn: () => undefined,
    runtimeStatus,
    pollIntervalMs: 5000,
    publishStatus: () => undefined,
    diag: () => undefined,
    reason: 'realtime-timeout',
    pullAllNow: () => Promise.reject(new Error('async recovery pull failed')) as any,
    restartRealtime: () => Promise.reject(new Error('async restart failed')) as any,
  });

  assert.equal(pollTimerRef.current, 33);
  assert.equal(runtimeStatus.polling.active, true);
  assert.equal(runtimeStatus.polling.reason, 'realtime-timeout');
  assert.equal(ticks.length, 1);

  await flushCloudSyncRecoveryMicrotasks();
  assert.equal(reported.length, 2);
  assert.equal((reported[0]?.error as Error).message, 'async recovery pull failed');
  assert.equal(reported[0]?.ctx?.op, 'cloudSyncPolling.realtimeRecoveryPull');
  assert.equal((reported[1]?.error as Error).message, 'async restart failed');
  assert.equal(reported[1]?.ctx?.op, 'cloudSyncPolling.realtimeRecoveryRestart');
});
