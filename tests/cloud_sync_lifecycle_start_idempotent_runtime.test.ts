import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncLifecycleOps } from '../esm/native/services/cloud_sync_lifecycle.ts';
import { createTimerHarness, makeApp } from './cloud_sync_lifecycle_runtime_helpers.js';

test('cloud sync lifecycle owner start is idempotent and dispose stays quiet after the first teardown', () => {
  const timers = createTimerHarness();
  timers.install();

  try {
    const { app, win, doc } = makeApp({ realtime: false, pollMs: 25 });
    const runtimeStatus = {
      room: 'public',
      clientId: 'client-a',
      instanceId: 'instance-a',
      realtime: {
        enabled: false,
        mode: 'broadcast',
        state: 'init',
        channel: 'wp:public',
      },
      polling: { active: false, intervalMs: 25, reason: '' },
      lastPullAt: 0,
      lastPushAt: 0,
      lastRealtimeEventAt: 0,
      lastError: '',
      diagEnabled: false,
    } as any;

    const lifecycle = createCloudSyncLifecycleOps({
      App: app as any,
      cfg: {
        url: 'https://supabase.example.test',
        anonKey: 'anon-key',
        realtime: false,
        realtimeMode: 'broadcast',
        realtimeChannelPrefix: 'wp',
        pollMs: 25,
      } as any,
      room: 'public',
      clientId: 'client-a',
      runtimeStatus,
      diagStorageKey: 'WP_CLOUDSYNC_DIAG',
      publishStatus: () => undefined,
      updateDiagEnabled: () => undefined,
      diag: () => undefined,
      suppressRef: { v: false },
      isDisposed: () => false,
      mainPullTrigger: { trigger: () => undefined },
      pullCoalescers: {
        sketch: { trigger: () => undefined },
        tabsGate: { trigger: () => undefined },
        floatingSync: { trigger: () => undefined },
      },
      setTimeoutFn: setTimeout,
      clearTimeoutFn: clearTimeout,
      setIntervalFn: setInterval,
      clearIntervalFn: clearInterval,
      setSendRealtimeHint: () => undefined,
    });

    lifecycle.start();
    lifecycle.start();

    assert.equal(timers.activeCount('interval'), 1);
    assert.equal(win.listenerCount('storage'), 1);
    assert.equal(win.listenerCount('focus'), 1);
    assert.equal(win.listenerCount('online'), 1);
    assert.equal(doc.listenerCount('visibilitychange'), 1);

    lifecycle.dispose();
    lifecycle.dispose();

    assert.equal(timers.activeCount('interval'), 0);
    assert.equal(runtimeStatus.polling.active, false);
    assert.equal(runtimeStatus.polling.reason, 'dispose');
    assert.equal(win.listenerCount('storage'), 0);
    assert.equal(win.listenerCount('focus'), 0);
    assert.equal(win.listenerCount('online'), 0);
    assert.equal(doc.listenerCount('visibilitychange'), 0);
  } finally {
    timers.restore();
  }
});

test('cloud sync lifecycle dispose clears stale realtime errors from the final disabled snapshot', () => {
  const timers = createTimerHarness();
  timers.install();

  try {
    const { app } = makeApp({ realtime: false, pollMs: 25 });
    const runtimeStatus = {
      room: 'public',
      clientId: 'client-a',
      instanceId: 'instance-a',
      realtime: {
        enabled: false,
        mode: 'broadcast',
        state: 'disabled',
        channel: '',
      },
      polling: { active: false, intervalMs: 25, reason: '' },
      lastPullAt: 0,
      lastPushAt: 0,
      lastRealtimeEventAt: 0,
      lastError: 'stale-error',
      diagEnabled: false,
    } as any;

    const lifecycle = createCloudSyncLifecycleOps({
      App: app as any,
      cfg: {
        url: 'https://supabase.example.test',
        anonKey: 'anon-key',
        realtime: false,
        realtimeMode: 'broadcast',
        realtimeChannelPrefix: 'wp',
        pollMs: 25,
      } as any,
      room: 'public',
      clientId: 'client-a',
      runtimeStatus,
      diagStorageKey: 'WP_CLOUDSYNC_DIAG',
      publishStatus: () => undefined,
      updateDiagEnabled: () => undefined,
      diag: () => undefined,
      suppressRef: { v: false },
      isDisposed: () => false,
      mainPullTrigger: { trigger: () => undefined },
      pullCoalescers: {
        sketch: { trigger: () => undefined },
        tabsGate: { trigger: () => undefined },
        floatingSync: { trigger: () => undefined },
      },
      setTimeoutFn: setTimeout,
      clearTimeoutFn: clearTimeout,
      setIntervalFn: setInterval,
      clearIntervalFn: clearInterval,
      setSendRealtimeHint: () => undefined,
    });

    lifecycle.start();
    assert.equal(runtimeStatus.lastError, 'stale-error');

    lifecycle.dispose();

    assert.equal(runtimeStatus.realtime.state, 'disabled');
    assert.equal(runtimeStatus.lastError, '');
  } finally {
    timers.restore();
  }
});

test('cloud sync lifecycle dispose publishes one final atomic snapshot for polling-only teardown', () => {
  const timers = createTimerHarness();
  timers.install();

  try {
    const { app } = makeApp({ realtime: false, pollMs: 25 });
    const runtimeStatus = {
      room: 'public',
      clientId: 'client-a',
      instanceId: 'instance-a',
      realtime: {
        enabled: false,
        mode: 'broadcast',
        state: 'init',
        channel: 'wp:public',
      },
      polling: { active: false, intervalMs: 25, reason: '' },
      lastPullAt: 0,
      lastPushAt: 0,
      lastRealtimeEventAt: 0,
      lastError: '',
      diagEnabled: false,
    } as any;

    const publishCalls: string[] = [];

    const lifecycle = createCloudSyncLifecycleOps({
      App: app as any,
      cfg: {
        url: 'https://supabase.example.test',
        anonKey: 'anon-key',
        realtime: false,
        realtimeMode: 'broadcast',
        realtimeChannelPrefix: 'wp',
        pollMs: 25,
      } as any,
      room: 'public',
      clientId: 'client-a',
      runtimeStatus,
      diagStorageKey: 'WP_CLOUDSYNC_DIAG',
      publishStatus: () => {
        publishCalls.push(
          `${runtimeStatus.realtime.state}|${runtimeStatus.polling.active ? 'active' : 'idle'}|${runtimeStatus.polling.reason}`
        );
      },
      updateDiagEnabled: () => undefined,
      diag: () => undefined,
      suppressRef: { v: false },
      isDisposed: () => false,
      mainPullTrigger: { trigger: () => undefined },
      pullCoalescers: {
        sketch: { trigger: () => undefined },
        tabsGate: { trigger: () => undefined },
        floatingSync: { trigger: () => undefined },
      },
      setTimeoutFn: setTimeout,
      clearTimeoutFn: clearTimeout,
      setIntervalFn: setInterval,
      clearIntervalFn: clearInterval,
      setSendRealtimeHint: () => undefined,
    });

    lifecycle.start();
    lifecycle.dispose();
    lifecycle.dispose();

    assert.deepEqual(publishCalls, ['disabled|active|realtime-disabled', 'disabled|idle|dispose']);
  } finally {
    timers.restore();
  }
});
