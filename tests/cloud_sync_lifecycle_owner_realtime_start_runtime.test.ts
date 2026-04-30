import test from 'node:test';
import assert from 'node:assert/strict';

import { startCloudSyncLifecycleOwner } from '../esm/native/services/cloud_sync_lifecycle_runtime_start.ts';
import { createCloudSyncLifecycleMutableState } from '../esm/native/services/cloud_sync_lifecycle_state.ts';
import { startCloudSyncRealtimeWithLifecycleFallback } from '../esm/native/services/cloud_sync_lifecycle_runtime_realtime_start.ts';
import { makeApp } from './cloud_sync_lifecycle_runtime_helpers.js';

async function flushRealtimeStartGuard(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function createRuntimeStatus() {
  return {
    room: 'public',
    clientId: 'client-a',
    instanceId: 'instance-a',
    realtime: {
      enabled: true,
      mode: 'broadcast',
      state: 'init',
      channel: '',
    },
    polling: { active: false, intervalMs: 25, reason: '' },
    lastPullAt: 0,
    lastPushAt: 0,
    lastRealtimeEventAt: 0,
    lastError: '',
    diagEnabled: false,
  } as any;
}

function createRealtimeCfg() {
  return {
    url: 'https://supabase.example.test',
    anonKey: 'anon-key',
    realtime: true,
    realtimeMode: 'broadcast',
    realtimeChannelPrefix: 'wp',
    pollMs: 25,
  } as any;
}

test('cloud sync lifecycle owner reports realtime start failures and still binds browser recovery listeners', async () => {
  const { app, win, doc } = makeApp({ realtime: true, pollMs: 25 });
  const runtimeStatus = createRuntimeStatus();
  const reported: Array<{ error: unknown; ctx: any }> = [];
  const pollingReasons: string[] = [];

  app.platform.reportError = (error: unknown, ctx: any) => {
    reported.push({ error, ctx });
  };

  const state = createCloudSyncLifecycleMutableState(createRealtimeCfg());
  const addListener = (target: any, type: string, handler: (ev: unknown) => void): void => {
    if (!target || typeof target.addEventListener !== 'function') return;
    target.addEventListener(type, handler);
    state.listenerCleanup.push(() => target.removeEventListener(type, handler));
  };

  startCloudSyncLifecycleOwner({
    App: app as any,
    cfg: createRealtimeCfg(),
    runtimeStatus,
    diagStorageKey: 'WP_CLOUDSYNC_DIAG',
    publishStatus: () => undefined,
    updateDiagEnabled: () => undefined,
    diag: () => undefined,
    suppressRef: { v: false },
    isDisposed: () => false,
    deps: {
      state,
      addListener,
      pullAllNow: () => undefined,
      startPolling: reason => {
        pollingReasons.push(reason);
        runtimeStatus.polling.active = true;
        runtimeStatus.polling.reason = reason;
      },
      stopPolling: () => undefined,
      markRealtimeEvent: () => true,
      cloudSyncRealtime: {
        startRealtime() {
          throw new Error('owner start failed');
        },
        dispose() {},
      },
    },
  });

  assert.equal(win.listenerCount('storage'), 1);
  assert.equal(win.listenerCount('focus'), 1);
  assert.equal(win.listenerCount('online'), 1);
  assert.equal(doc.listenerCount('visibilitychange'), 1);

  await flushRealtimeStartGuard();

  assert.equal(runtimeStatus.realtime.state, 'error');
  assert.equal(runtimeStatus.realtime.channel, '');
  assert.equal(runtimeStatus.lastError, 'owner start failed');
  assert.deepEqual(pollingReasons, ['realtime-owner-start-error']);
  assert.equal(reported.length, 1);
  assert.equal((reported[0]?.error as Error).message, 'owner start failed');
  assert.equal(reported[0]?.ctx?.op, 'cloudSyncLifecycle.realtimeInitialStart');
});

test('cloud sync lifecycle realtime start guard reports fallback failures without rejecting', async () => {
  const { app } = makeApp({ realtime: true, pollMs: 25 });
  const runtimeStatus = createRuntimeStatus();
  const reported: Array<{ error: unknown; ctx: any }> = [];
  const diagEvents: Array<{ event: string; payload: unknown }> = [];
  let publishCount = 0;

  app.platform.reportError = (error: unknown, ctx: any) => {
    reported.push({ error, ctx });
  };

  assert.doesNotThrow(() => {
    startCloudSyncRealtimeWithLifecycleFallback({
      App: app as any,
      runtimeStatus,
      publishStatus: () => {
        publishCount += 1;
      },
      diag: (event, payload) => {
        diagEvents.push({ event, payload });
      },
      startPolling: () => {
        throw new Error('owner fallback failed');
      },
      cloudSyncRealtime: {
        async startRealtime() {
          throw new Error('owner rejected');
        },
      },
      op: 'cloudSyncLifecycle.realtimeRestart',
      diagEvent: 'realtime:owner-restart-error',
      pollingReason: 'realtime-owner-restart-error',
    });
  });

  await flushRealtimeStartGuard();

  assert.equal(runtimeStatus.realtime.state, 'error');
  assert.equal(runtimeStatus.lastError, 'owner rejected');
  assert.equal(publishCount, 1);
  assert.deepEqual(diagEvents, [{ event: 'realtime:owner-restart-error', payload: 'owner rejected' }]);
  assert.equal(reported.length, 2);
  assert.equal((reported[0]?.error as Error).message, 'owner rejected');
  assert.equal(reported[0]?.ctx?.op, 'cloudSyncLifecycle.realtimeRestart');
  assert.equal((reported[1]?.error as Error).message, 'owner fallback failed');
  assert.equal(reported[1]?.ctx?.op, 'cloudSyncLifecycle.realtimeRestart.fallback');
});
