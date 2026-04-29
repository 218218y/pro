import test from 'node:test';
import assert from 'node:assert/strict';

import { startCloudSyncPolling } from '../esm/native/services/cloud_sync_lifecycle_support.ts';

function createPollingApp(reported: Array<{ error: unknown; ctx: any }>) {
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
    services: {
      platform: {
        reportError(error: unknown, ctx: any) {
          reported.push({ error, ctx });
        },
      },
    },
    deps: {
      browser: {
        window: { navigator: nav, document: doc },
        document: doc,
        navigator: nav,
      },
    },
  } as any;
}

async function flushCloudSyncPollingTickMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

test('cloud sync polling tick reports restart and refresh failures without detaching later ticks', () => {
  const reported: Array<{ error: unknown; ctx: any }> = [];
  const ticks: Array<() => void> = [];
  const runtimeStatus = {
    realtime: { enabled: true, mode: 'broadcast', state: 'timeout', channel: '' },
    polling: { active: false, intervalMs: 0, reason: '' },
    lastPullAt: 0,
  } as any;
  const pollTimerRef = { current: null as number | null };
  let restartCalls = 0;
  let pullCalls = 0;
  let throwRestart = true;
  let throwPull = true;

  startCloudSyncPolling({
    App: createPollingApp(reported),
    pollTimerRef,
    setIntervalFn: handler => {
      ticks.push(handler);
      return 41;
    },
    clearIntervalFn: () => undefined,
    runtimeStatus,
    pollIntervalMs: 5000,
    publishStatus: () => undefined,
    diag: () => undefined,
    reason: 'realtime-disabled',
    pullAllNow: () => {
      pullCalls += 1;
      if (throwPull) throw new Error('tick pull failed');
    },
    restartRealtime: () => {
      restartCalls += 1;
      if (throwRestart) throw new Error('tick restart failed');
    },
  });

  assert.equal(pollTimerRef.current, 41);
  assert.equal(ticks.length, 1);

  assert.doesNotThrow(() => ticks[0]());
  assert.equal(runtimeStatus.polling.active, true);
  assert.equal(pollTimerRef.current, 41);
  assert.equal(restartCalls, 1);
  assert.equal(pullCalls, 1);
  assert.equal(reported.length, 2);
  assert.equal((reported[0]?.error as Error).message, 'tick restart failed');
  assert.equal(reported[0]?.ctx?.op, 'cloudSyncPolling.tickRealtimeRestart');
  assert.equal((reported[1]?.error as Error).message, 'tick pull failed');
  assert.equal(reported[1]?.ctx?.op, 'cloudSyncPolling.tickRefresh');

  throwRestart = false;
  throwPull = false;
  assert.doesNotThrow(() => ticks[0]());
  assert.equal(restartCalls, 2);
  assert.equal(pullCalls, 2);
});

test('cloud sync polling tick reports async restart and refresh rejections without detaching later ticks', async () => {
  const reported: Array<{ error: unknown; ctx: any }> = [];
  const ticks: Array<() => void> = [];
  const runtimeStatus = {
    realtime: { enabled: true, mode: 'broadcast', state: 'timeout', channel: '' },
    polling: { active: false, intervalMs: 0, reason: '' },
    lastPullAt: 0,
  } as any;
  const pollTimerRef = { current: null as number | null };
  let restartCalls = 0;
  let pullCalls = 0;
  let rejectRestart = true;
  let rejectPull = true;

  startCloudSyncPolling({
    App: createPollingApp(reported),
    pollTimerRef,
    setIntervalFn: handler => {
      ticks.push(handler);
      return 42;
    },
    clearIntervalFn: () => undefined,
    runtimeStatus,
    pollIntervalMs: 5000,
    publishStatus: () => undefined,
    diag: () => undefined,
    reason: 'realtime-disabled',
    pullAllNow: () => {
      pullCalls += 1;
      if (rejectPull) return Promise.reject(new Error('tick pull rejected')) as any;
    },
    restartRealtime: () => {
      restartCalls += 1;
      if (rejectRestart) return Promise.reject(new Error('tick restart rejected')) as any;
    },
  });

  assert.doesNotThrow(() => ticks[0]());
  assert.equal(runtimeStatus.polling.active, true);
  assert.equal(pollTimerRef.current, 42);
  assert.equal(restartCalls, 1);
  assert.equal(pullCalls, 1);

  await flushCloudSyncPollingTickMicrotasks();
  assert.equal(reported.length, 2);
  assert.equal((reported[0]?.error as Error).message, 'tick restart rejected');
  assert.equal(reported[0]?.ctx?.op, 'cloudSyncPolling.tickRealtimeRestart');
  assert.equal((reported[1]?.error as Error).message, 'tick pull rejected');
  assert.equal(reported[1]?.ctx?.op, 'cloudSyncPolling.tickRefresh');

  rejectRestart = false;
  rejectPull = false;
  assert.doesNotThrow(() => ticks[0]());
  await flushCloudSyncPollingTickMicrotasks();
  assert.equal(restartCalls, 2);
  assert.equal(pullCalls, 2);
  assert.equal(reported.length, 2);
});

test('cloud sync polling tick reports auto-stop failures without throwing from the timer callback', () => {
  const reported: Array<{ error: unknown; ctx: any }> = [];
  const ticks: Array<() => void> = [];
  const runtimeStatus = {
    realtime: { enabled: true, mode: 'broadcast', state: 'timeout', channel: '' },
    polling: { active: false, intervalMs: 0, reason: '' },
    lastPullAt: 0,
  } as any;
  const pollTimerRef = { current: null as number | null };

  startCloudSyncPolling({
    App: createPollingApp(reported),
    pollTimerRef,
    setIntervalFn: handler => {
      ticks.push(handler);
      return 77;
    },
    clearIntervalFn: () => {
      throw new Error('auto-stop clear failed');
    },
    runtimeStatus,
    pollIntervalMs: 5000,
    publishStatus: () => undefined,
    diag: () => undefined,
    reason: 'realtime-disabled',
    pullAllNow: () => undefined,
    restartRealtime: () => undefined,
  });

  runtimeStatus.realtime.state = 'subscribed';
  runtimeStatus.realtime.channel = 'wp:room-a';

  assert.doesNotThrow(() => ticks[0]());
  assert.equal(pollTimerRef.current, 77);
  assert.equal(reported.length, 1);
  assert.equal((reported[0]?.error as Error).message, 'auto-stop clear failed');
  assert.equal(reported[0]?.ctx?.op, 'cloudSyncPolling.tickAutoStop');
});
