import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncRealtimeLifecycle } from '../esm/native/services/cloud_sync_lifecycle_realtime.ts';

type StatusHandler = (status: unknown) => void;

type RealtimeHarness = {
  refs: {
    connectTimer: number | null;
    client: Record<string, unknown> | null;
    channel: Record<string, unknown> | null;
  };
  runtimeStatus: {
    realtime: { enabled: boolean; mode: 'broadcast'; state: string; channel: string };
    polling: { active: boolean; intervalMs: number; reason: string };
    room: string;
    clientId: string;
    instanceId: string;
    lastPullAt: number;
    lastPushAt: number;
    lastRealtimeEventAt: number;
    lastError: string;
    diagEnabled: boolean;
  };
  sendRealtimeHint: ((scope: string, rowName?: string) => void) | null;
  startPollingCalls: string[];
  stopPollingCalls: string[];
  diagCalls: Array<{ event: string; payload: unknown }>;
  publishCount: number;
  removeCalls: number;
  disconnectCalls: number;
  channelCalls: number;
  beforeUnloadListenerCount: number;
  subscribeStatus: StatusHandler | null;
  timeoutHandler: (() => void) | null;
  timeoutMs: number | null;
  disposedRef: { current: boolean };
};

function createHarness(opts?: {
  subscribeThrows?: boolean;
  removeChannelTriggersClose?: boolean;
  disconnectTriggersClose?: boolean;
  disposeDuringCreateClient?: boolean;
  disposeDuringChannelCreate?: boolean;
  disposeDuringSubscribe?: boolean;
}): { state: RealtimeHarness; lifecycle: ReturnType<typeof createCloudSyncRealtimeLifecycle> } {
  const state: RealtimeHarness = {
    refs: { connectTimer: null, client: null, channel: null },
    runtimeStatus: {
      room: 'room-a',
      clientId: 'client-a',
      instanceId: 'instance-a',
      realtime: { enabled: true, mode: 'broadcast', state: 'idle', channel: '' },
      polling: { active: false, intervalMs: 5000, reason: '' },
      lastPullAt: 0,
      lastPushAt: 0,
      lastRealtimeEventAt: 0,
      lastError: '',
      diagEnabled: false,
    },
    sendRealtimeHint: null,
    startPollingCalls: [],
    stopPollingCalls: [],
    diagCalls: [],
    publishCount: 0,
    removeCalls: 0,
    disconnectCalls: 0,
    channelCalls: 0,
    beforeUnloadListenerCount: 0,
    subscribeStatus: null,
    timeoutHandler: null,
    timeoutMs: null,
    disposedRef: { current: false },
  };

  let disposeDuringStart: (() => void) | null = null;

  const channel = {
    on(_type: string, _filter: unknown, _handler: (ev: unknown) => void) {
      return this;
    },
    subscribe(handler: StatusHandler) {
      if (opts?.subscribeThrows) throw new Error('subscribe exploded');
      if (opts?.disposeDuringSubscribe) disposeDuringStart?.();
      state.subscribeStatus = handler;
      return this;
    },
    send() {
      return Promise.resolve();
    },
  };

  const client = {
    channel() {
      state.channelCalls += 1;
      if (opts?.disposeDuringChannelCreate) disposeDuringStart?.();
      return channel;
    },
    removeChannel() {
      state.removeCalls += 1;
      if (opts?.removeChannelTriggersClose && state.subscribeStatus) state.subscribeStatus('CLOSED');
    },
    realtime: {
      disconnect() {
        state.disconnectCalls += 1;
        if (opts?.disconnectTriggersClose && state.subscribeStatus) state.subscribeStatus('CLOSED');
      },
    },
  };

  const lifecycle = createCloudSyncRealtimeLifecycle({
    App: {
      services: {
        cloudSync: {
          __testHooks: {
            createSupabaseClient: () => {
              if (opts?.disposeDuringCreateClient) disposeDuringStart?.();
              return client;
            },
          },
        },
        platform: {
          reportError() {
            return undefined;
          },
        },
      },
    } as any,
    cfg: {
      url: 'https://example.test',
      anonKey: 'anon',
      realtimeMode: 'broadcast',
      realtimeChannelPrefix: 'wp',
    } as any,
    room: 'room-a',
    clientId: 'client-a',
    runtimeStatus: state.runtimeStatus,
    publishStatus: () => {
      state.publishCount += 1;
    },
    diag: (event: string, payload?: unknown) => {
      state.diagCalls.push({ event, payload });
    },
    suppressRef: { v: false },
    isDisposed: () => state.disposedRef.current,
    isPushInFlight: () => false,
    pullAllNow: () => undefined,
    startPolling: reason => {
      state.startPollingCalls.push(reason);
    },
    stopPolling: reason => {
      state.stopPollingCalls.push(reason);
    },
    markRealtimeEvent: () => true,
    handleRealtimeMain: () => undefined,
    handleRealtimeSketch: () => undefined,
    handleRealtimeTabsGate: () => undefined,
    handleRealtimeFloatingSync: () => undefined,
    addListener: (_target, type) => {
      if (type === 'beforeunload') state.beforeUnloadListenerCount += 1;
    },
    setTimeoutFn: (handler, ms) => {
      state.timeoutHandler = handler;
      state.timeoutMs = ms;
      return 1 as any;
    },
    clearTimeoutFn: () => undefined,
    refs: state.refs as any,
    setSendRealtimeHint: next => {
      state.sendRealtimeHint = next;
    },
  });

  disposeDuringStart = () => {
    lifecycle.dispose();
  };

  return { state, lifecycle };
}

test('cloud sync realtime lifecycle cleans refs and preserves real error message on subscribe failure', async () => {
  const harness = createHarness({ subscribeThrows: true });

  await harness.lifecycle.startRealtime();

  assert.equal(harness.state.runtimeStatus.realtime.state, 'disconnected:subscribe_error');
  assert.equal(harness.state.runtimeStatus.realtime.channel, '');
  assert.equal(harness.state.runtimeStatus.lastError, 'subscribe exploded');
  assert.deepEqual(harness.state.startPollingCalls, ['realtime-subscribe_error']);
  assert.equal(
    harness.state.publishCount,
    2,
    'connecting plus disconnected error transition should publish once each'
  );
  assert.equal(harness.state.refs.client, null);
  assert.equal(harness.state.refs.channel, null);
  assert.equal(harness.state.sendRealtimeHint, null);
  assert.equal(harness.state.removeCalls, 1);
  assert.equal(harness.state.disconnectCalls, 1);
});

test('cloud sync realtime lifecycle clears hint sender and transport after disconnect status following subscribe', async () => {
  const harness = createHarness();

  await harness.lifecycle.startRealtime();
  assert.equal(typeof harness.state.subscribeStatus, 'function');

  harness.state.subscribeStatus?.('SUBSCRIBED');
  assert.equal(harness.state.runtimeStatus.realtime.state, 'subscribed');
  assert.deepEqual(harness.state.stopPollingCalls, ['realtime-subscribed']);
  assert.equal(typeof harness.state.sendRealtimeHint, 'function');

  harness.state.subscribeStatus?.('CHANNEL_ERROR');
  assert.equal(harness.state.runtimeStatus.realtime.state, 'disconnected:CHANNEL_ERROR');
  assert.equal(harness.state.runtimeStatus.realtime.channel, '');
  assert.deepEqual(harness.state.startPollingCalls, ['realtime-CHANNEL_ERROR']);
  assert.equal(harness.state.refs.client, null);
  assert.equal(harness.state.refs.channel, null);
  assert.equal(harness.state.sendRealtimeHint, null);
  assert.equal(harness.state.removeCalls, 1);
  assert.equal(harness.state.disconnectCalls, 1);
});

test('cloud sync realtime lifecycle dispose heals runtime status and clears channel after subscribe', async () => {
  const harness = createHarness();

  await harness.lifecycle.startRealtime();
  harness.state.subscribeStatus?.('SUBSCRIBED');

  harness.state.runtimeStatus.realtime = {
    ...harness.state.runtimeStatus.realtime,
    channel: 'stale-channel',
    driftedExtra: 'noise',
  } as any;

  harness.lifecycle.dispose();

  assert.equal(harness.state.refs.client, null);
  assert.equal(harness.state.refs.channel, null);
  assert.equal(harness.state.sendRealtimeHint, null);
  assert.equal(harness.state.runtimeStatus.realtime.enabled, false);
  assert.equal(harness.state.runtimeStatus.realtime.state, 'disabled');
  assert.equal(harness.state.runtimeStatus.realtime.channel, '');
  assert.equal('driftedExtra' in (harness.state.runtimeStatus.realtime as any), false);
});

test('cloud sync realtime lifecycle ignores recursive CLOSED callbacks fired by transport cleanup', async () => {
  const harness = createHarness({
    removeChannelTriggersClose: true,
    disconnectTriggersClose: true,
  });

  await harness.lifecycle.startRealtime();
  assert.equal(typeof harness.state.subscribeStatus, 'function');

  harness.state.subscribeStatus?.('SUBSCRIBED');
  harness.state.subscribeStatus?.('CLOSED');

  assert.equal(harness.state.runtimeStatus.realtime.state, 'disconnected:CLOSED');
  assert.equal(harness.state.runtimeStatus.realtime.channel, '');
  assert.deepEqual(harness.state.startPollingCalls, ['realtime-CLOSED']);
  assert.equal(harness.state.removeCalls, 1);
  assert.equal(harness.state.disconnectCalls, 1);
  assert.equal(harness.state.refs.client, null);
  assert.equal(harness.state.refs.channel, null);
});

test('cloud sync realtime lifecycle ignores duplicate start requests while the transport is already live', async () => {
  const harness = createHarness();

  await harness.lifecycle.startRealtime();
  await harness.lifecycle.startRealtime();

  assert.equal(harness.state.channelCalls, 1);
  assert.equal(harness.state.beforeUnloadListenerCount, 1);
  assert.equal(typeof harness.state.subscribeStatus, 'function');

  harness.state.subscribeStatus?.('SUBSCRIBED');
  await harness.lifecycle.startRealtime();

  assert.equal(harness.state.channelCalls, 1);
  assert.equal(harness.state.beforeUnloadListenerCount, 1);
});

test('cloud sync realtime lifecycle restarts when only the runtime status drift says subscribed but no live transport refs remain', async () => {
  const harness = createHarness();

  harness.state.runtimeStatus.realtime = {
    ...harness.state.runtimeStatus.realtime,
    state: 'subscribed',
    channel: 'stale-channel',
  };

  await harness.lifecycle.startRealtime();

  assert.equal(harness.state.channelCalls, 1);
  assert.equal(harness.state.beforeUnloadListenerCount, 1);
  assert.equal(harness.state.runtimeStatus.realtime.state, 'connecting');
  assert.equal(harness.state.runtimeStatus.realtime.channel, 'wp:room-a');
  assert.equal(typeof harness.state.subscribeStatus, 'function');
});

test('cloud sync realtime lifecycle abandons a stale start if dispose lands during client creation', async () => {
  const harness = createHarness({ disposeDuringCreateClient: true });

  await harness.lifecycle.startRealtime();

  assert.equal(harness.state.runtimeStatus.realtime.state, 'disabled');
  assert.equal(harness.state.refs.client, null);
  assert.equal(harness.state.refs.channel, null);
  assert.equal(harness.state.beforeUnloadListenerCount, 0);
  assert.equal(
    harness.state.removeCalls,
    0,
    'no channel exists yet, so stale cleanup should stay quiet there'
  );
  assert.equal(harness.state.disconnectCalls, 1, 'stale client should be disconnected instead of lingering');
  assert.deepEqual(harness.state.startPollingCalls, []);
  assert.equal(harness.state.sendRealtimeHint, null);
});

test('cloud sync realtime lifecycle abandons a stale start if dispose lands during channel creation', async () => {
  const harness = createHarness({ disposeDuringChannelCreate: true });

  await harness.lifecycle.startRealtime();

  assert.equal(harness.state.refs.client, null);
  assert.equal(harness.state.refs.channel, null);
  assert.equal(harness.state.beforeUnloadListenerCount, 0);
  assert.equal(harness.state.removeCalls, 1, 'stale channel should be removed during cleanup');
  assert.equal(harness.state.disconnectCalls, 1, 'stale client should be disconnected during cleanup');
  assert.deepEqual(harness.state.startPollingCalls, []);
  assert.equal(harness.state.sendRealtimeHint, null);
});

test('cloud sync realtime lifecycle does not bind beforeunload or leave refs alive if dispose lands during subscribe wiring', async () => {
  const harness = createHarness({ disposeDuringSubscribe: true });

  await harness.lifecycle.startRealtime();

  assert.equal(harness.state.refs.client, null);
  assert.equal(harness.state.refs.channel, null);
  assert.equal(harness.state.beforeUnloadListenerCount, 0);
  assert.equal(harness.state.removeCalls, 1);
  assert.equal(harness.state.disconnectCalls, 1);
  assert.deepEqual(harness.state.startPollingCalls, []);
  assert.equal(harness.state.sendRealtimeHint, null);
});

test('cloud sync realtime lifecycle preserves the canonical realtime branch ref and trims drifted extras', async () => {
  const harness = createHarness();
  (harness.state.runtimeStatus.realtime as any).driftedExtra = 'remove-me';
  const heldRealtime = harness.state.runtimeStatus.realtime;

  await harness.lifecycle.startRealtime();

  assert.equal(harness.state.runtimeStatus.realtime, heldRealtime);
  assert.equal(harness.state.runtimeStatus.realtime.state, 'connecting');
  assert.equal(harness.state.runtimeStatus.realtime.mode, 'broadcast');
  assert.equal(harness.state.runtimeStatus.realtime.channel, 'wp:room-a');
  assert.equal('driftedExtra' in harness.state.runtimeStatus.realtime, false);

  harness.state.subscribeStatus?.('SUBSCRIBED');
  assert.equal(harness.state.runtimeStatus.realtime, heldRealtime);
  assert.equal(harness.state.runtimeStatus.realtime.state, 'subscribed');

  harness.state.subscribeStatus?.('CLOSED');
  assert.equal(harness.state.runtimeStatus.realtime, heldRealtime);
  assert.equal(harness.state.runtimeStatus.realtime.state, 'disconnected:CLOSED');
  assert.equal(harness.state.runtimeStatus.realtime.channel, '');
});

test('cloud sync realtime lifecycle keeps the public connect timeout contract while arming an internal soft timeout for recovery', async () => {
  const harness = createHarness();

  await harness.lifecycle.startRealtime();

  assert.equal(harness.state.timeoutMs, 1800);
});

test('cloud sync realtime timeout stays soft so a late subscribe can recover without transport churn', async () => {
  const harness = createHarness();

  await harness.lifecycle.startRealtime();
  assert.equal(typeof harness.state.timeoutHandler, 'function');
  assert.equal(typeof harness.state.subscribeStatus, 'function');

  harness.state.timeoutHandler?.();

  assert.equal(harness.state.runtimeStatus.realtime.state, 'timeout');
  assert.deepEqual(harness.state.startPollingCalls, ['realtime-timeout']);
  assert.notEqual(harness.state.refs.client, null);
  assert.notEqual(harness.state.refs.channel, null);
  assert.equal(harness.state.removeCalls, 0);
  assert.equal(harness.state.disconnectCalls, 0);

  harness.state.subscribeStatus?.('SUBSCRIBED');

  assert.equal(harness.state.runtimeStatus.realtime.state, 'subscribed');
  assert.deepEqual(harness.state.stopPollingCalls, ['realtime-subscribed']);
  assert.equal(harness.state.removeCalls, 0);
  assert.equal(harness.state.disconnectCalls, 0);
});

test('cloud sync realtime timeout stays in degraded polling mode without forcing a second client rebuild', async () => {
  const harness = createHarness();

  await harness.lifecycle.startRealtime();
  assert.equal(typeof harness.state.timeoutHandler, 'function');

  harness.state.timeoutHandler?.();
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(harness.state.runtimeStatus.realtime.state, 'timeout');
  assert.equal(harness.state.channelCalls, 1);
  assert.equal(harness.state.removeCalls, 0);
  assert.equal(harness.state.disconnectCalls, 0);
  assert.notEqual(harness.state.refs.client, null);
  assert.notEqual(harness.state.refs.channel, null);
  assert.equal(harness.state.refs.connectTimer, null);
});

test('cloud sync realtime TIMED_OUT status stays soft so the live transport can keep rejoining without teardown churn', async () => {
  const harness = createHarness();

  await harness.lifecycle.startRealtime();
  assert.equal(typeof harness.state.subscribeStatus, 'function');

  harness.state.subscribeStatus?.('TIMED_OUT');

  assert.equal(harness.state.runtimeStatus.realtime.state, 'timeout');
  assert.deepEqual(harness.state.startPollingCalls, ['realtime-timeout']);
  assert.equal(harness.state.removeCalls, 0);
  assert.equal(harness.state.disconnectCalls, 0);
  assert.notEqual(harness.state.refs.client, null);
  assert.notEqual(harness.state.refs.channel, null);

  harness.state.subscribeStatus?.('SUBSCRIBED');

  assert.equal(harness.state.runtimeStatus.realtime.state, 'subscribed');
  assert.deepEqual(harness.state.stopPollingCalls, ['realtime-subscribed']);
  assert.equal(harness.state.removeCalls, 0);
  assert.equal(harness.state.disconnectCalls, 0);
});

test('cloud sync realtime lifecycle ignores stale connect timeout callbacks after the lifecycle is disposed', async () => {
  const harness = createHarness();

  await harness.lifecycle.startRealtime();
  assert.equal(typeof harness.state.timeoutHandler, 'function');
  assert.equal(harness.state.runtimeStatus.realtime.state, 'connecting');

  harness.state.disposedRef.current = true;
  harness.state.timeoutHandler?.();

  assert.deepEqual(harness.state.startPollingCalls, []);
  assert.equal(harness.state.runtimeStatus.realtime.state, 'connecting');
  assert.equal(harness.state.publishCount, 1, 'no extra timeout publish should happen after dispose');
});
