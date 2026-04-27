import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bindCloudSyncRealtimeBeforeUnloadCleanup,
  markCloudSyncRealtimeConnecting,
  markCloudSyncRealtimeDisconnected,
  markCloudSyncRealtimeDisposed,
  markCloudSyncRealtimeFailure,
  markCloudSyncRealtimeSubscribed,
  markCloudSyncRealtimeTimeout,
  sendCloudSyncRealtimeHint,
} from '../esm/native/services/cloud_sync_lifecycle_realtime_support.ts';

test('cloud sync realtime hint dedupes per scope/row/room and resumes after the dedupe window', async () => {
  const sends: Array<Record<string, unknown>> = [];
  const sentAtByKey = new Map<string, number>();
  const originalNow = Date.now;
  let now = 10_000;
  Date.now = () => now;

  try {
    const runtimeStatus = { realtime: { state: 'subscribed', channel: 'wp:room-a' } } as any;
    const channel = {
      async send(payload: Record<string, unknown>) {
        sends.push(payload);
      },
    } as any;

    const baseArgs = {
      App: {} as any,
      isDisposed: () => false,
      channel,
      realtimeMode: 'broadcast',
      runtimeStatus,
      scope: 'sketch',
      rowName: 'public::sketch',
      room: 'room-a',
      clientId: 'client-a',
      eventName: 'cloud_sync_hint',
      dedupeMs: 180,
      sentAtByKey,
    };

    await sendCloudSyncRealtimeHint(baseArgs);
    await sendCloudSyncRealtimeHint(baseArgs);
    now += 250;
    await sendCloudSyncRealtimeHint(baseArgs);

    assert.equal(sends.length, 2);
    assert.equal(sends[0]?.type, 'broadcast');
    assert.equal(sends[0]?.event, 'cloud_sync_hint');
    assert.deepEqual(
      sends.map(call => (call.payload as any)?.ts),
      [10_000, 10_250]
    );
  } finally {
    Date.now = originalNow;
  }
});

test('cloud sync realtime connecting/failure/dispose markers share one canonical branch owner', () => {
  const runtimeStatus = {
    realtime: {
      enabled: true,
      mode: 'drifted-mode',
      state: 'subscribed',
      channel: 'stale-channel',
      driftedExtra: 'remove-me',
    },
    polling: { active: false, intervalMs: 5000, reason: '' },
    lastError: 'stale-error',
  } as any;
  const heldRealtime = runtimeStatus.realtime;
  const publishCalls: string[] = [];
  const diagCalls: Array<{ event: string; payload: unknown }> = [];
  const startPollingCalls: string[] = [];

  markCloudSyncRealtimeConnecting({
    runtimeStatus,
    publishStatus: () => {
      publishCalls.push(String(runtimeStatus.realtime.state));
    },
    diag: (event, payload) => {
      diagCalls.push({ event, payload });
    },
    enabled: true,
    mode: 'broadcast',
    channel: 'wp:room-a',
  });

  assert.equal(runtimeStatus.realtime, heldRealtime);
  assert.equal(runtimeStatus.realtime.enabled, true);
  assert.equal(runtimeStatus.realtime.mode, 'broadcast');
  assert.equal(runtimeStatus.realtime.state, 'connecting');
  assert.equal(runtimeStatus.realtime.channel, 'wp:room-a');
  assert.equal(runtimeStatus.lastError, '');
  assert.equal('driftedExtra' in runtimeStatus.realtime, false);

  markCloudSyncRealtimeFailure({
    runtimeStatus,
    publishStatus: () => {
      publishCalls.push(String(runtimeStatus.realtime.state));
    },
    diag: (event, payload) => {
      diagCalls.push({ event, payload });
    },
    state: 'missing-sdk',
    lastError: 'createClient not found',
    diagEvent: 'realtime:error',
    pollingReason: 'missing-sdk',
    startPolling: reason => {
      startPollingCalls.push(reason);
    },
  });

  assert.equal(runtimeStatus.realtime, heldRealtime);
  assert.equal(runtimeStatus.realtime.state, 'missing-sdk');
  assert.equal(runtimeStatus.realtime.channel, '');
  assert.equal(runtimeStatus.lastError, 'createClient not found');

  markCloudSyncRealtimeDisposed({
    runtimeStatus,
    publishStatus: () => {
      publishCalls.push(String(runtimeStatus.realtime.state));
    },
  });

  assert.equal(runtimeStatus.realtime, heldRealtime);
  assert.equal(runtimeStatus.realtime.enabled, false);
  assert.equal(runtimeStatus.realtime.state, 'disabled');
  assert.equal(runtimeStatus.realtime.channel, '');
  assert.equal(runtimeStatus.lastError, '');
  assert.deepEqual(publishCalls, ['connecting', 'missing-sdk', 'disabled']);
  assert.deepEqual(diagCalls, [
    { event: 'realtime:connecting', payload: 'broadcast' },
    { event: 'realtime:error', payload: 'createClient not found' },
  ]);
  assert.deepEqual(startPollingCalls, ['missing-sdk']);
});

test('cloud sync realtime timeout marker clears stale channel and restarts polling on the canonical owner', () => {
  const runtimeStatus = {
    realtime: {
      enabled: true,
      mode: 'broadcast',
      state: 'connecting',
      channel: 'wp:room-a',
      driftedExtra: 'remove-me',
    },
    polling: { active: false, intervalMs: 5000, reason: '' },
  } as any;
  const heldRealtime = runtimeStatus.realtime;
  const publishCalls: string[] = [];
  const diagCalls: Array<{ event: string; payload: unknown }> = [];
  const startPollingCalls: string[] = [];

  markCloudSyncRealtimeTimeout({
    runtimeStatus,
    publishStatus: () => {
      publishCalls.push(String(runtimeStatus.realtime.state));
    },
    diag: (event, payload) => {
      diagCalls.push({ event, payload });
    },
    startPolling: reason => {
      startPollingCalls.push(reason);
    },
  });

  assert.equal(runtimeStatus.realtime, heldRealtime);
  assert.equal(runtimeStatus.realtime.enabled, true);
  assert.equal(runtimeStatus.realtime.state, 'timeout');
  assert.equal(runtimeStatus.realtime.channel, '');
  assert.equal('driftedExtra' in runtimeStatus.realtime, false);
  assert.deepEqual(publishCalls, ['timeout']);
  assert.deepEqual(diagCalls, [{ event: 'realtime:timeout', payload: undefined }]);
  assert.deepEqual(startPollingCalls, ['realtime-timeout']);
});

test('cloud sync realtime transition markers collapse polling + realtime status publication to one canonical publish', () => {
  const runtimeStatus = {
    realtime: { enabled: true, mode: 'broadcast', state: 'connecting', channel: 'wp:room-a' },
    polling: { active: true, intervalMs: 5000, reason: 'stale' },
    lastError: '',
  } as any;
  let publishCount = 0;
  const startPollingCalls: Array<{ reason: string; publish?: boolean }> = [];
  const stopPollingCalls: Array<{ reason: string; publish?: boolean }> = [];

  markCloudSyncRealtimeSubscribed({
    App: {} as any,
    runtimeStatus,
    publishStatus: () => {
      publishCount += 1;
    },
    diag: () => undefined,
    suppressRef: { v: false },
    stopPolling: (reason, opts) => {
      stopPollingCalls.push({ reason, publish: opts?.publish });
      runtimeStatus.polling = { active: false, intervalMs: 5000, reason };
    },
    pullAllNow: () => undefined,
    subscribedRef: { current: false },
    everSubscribedRef: { current: false },
  });

  assert.equal(publishCount, 1);
  assert.deepEqual(stopPollingCalls, [{ reason: 'realtime-subscribed', publish: false }]);
  assert.deepEqual(runtimeStatus.polling, { active: false, intervalMs: 5000, reason: 'realtime-subscribed' });

  markCloudSyncRealtimeDisconnected({
    runtimeStatus,
    publishStatus: () => {
      publishCount += 1;
    },
    diag: () => undefined,
    startPolling: (reason, opts) => {
      startPollingCalls.push({ reason, publish: opts?.publish });
      runtimeStatus.polling = { active: true, intervalMs: 5000, reason };
    },
    subscribedRef: { current: true },
    why: 'CHANNEL_ERROR',
  });

  assert.equal(publishCount, 2);
  assert.deepEqual(startPollingCalls, [{ reason: 'realtime-CHANNEL_ERROR', publish: false }]);
  assert.deepEqual(runtimeStatus.polling, {
    active: true,
    intervalMs: 5000,
    reason: 'realtime-CHANNEL_ERROR',
  });
});

test('cloud sync realtime subscribed marker only issues a gap pull after a resubscribe', () => {
  const runtimeStatus = { realtime: { state: 'connecting' } } as any;
  const stopPollingCalls: string[] = [];
  const pullCalls: Array<Record<string, unknown> | undefined> = [];
  const subscribedRef = { current: false };
  const everSubscribedRef = { current: false };

  markCloudSyncRealtimeSubscribed({
    App: {} as any,
    runtimeStatus,
    publishStatus: () => undefined,
    diag: () => undefined,
    suppressRef: { v: false },
    stopPolling: reason => stopPollingCalls.push(reason),
    pullAllNow: opts => pullCalls.push(opts as any),
    subscribedRef,
    everSubscribedRef,
  });

  assert.equal(runtimeStatus.realtime.state, 'subscribed');
  assert.deepEqual(stopPollingCalls, ['realtime-subscribed']);
  assert.deepEqual(pullCalls, []);

  subscribedRef.current = false;
  markCloudSyncRealtimeSubscribed({
    App: {} as any,
    runtimeStatus,
    publishStatus: () => undefined,
    diag: () => undefined,
    suppressRef: { v: false },
    stopPolling: reason => stopPollingCalls.push(reason),
    pullAllNow: opts => pullCalls.push(opts as any),
    subscribedRef,
    everSubscribedRef,
  });

  assert.deepEqual(stopPollingCalls, ['realtime-subscribed', 'realtime-subscribed']);
  assert.deepEqual(pullCalls, [{ includeControls: false, reason: 'realtime-gap', minRecentPullGapMs: 4000 }]);
});

test('cloud sync realtime subscribed gap refresh respects the canonical recent-pull gate on resubscribe', () => {
  const App = {
    deps: {
      browser: {
        window: { navigator: { onLine: true, userAgent: 'unit-test' } },
        document: {
          visibilityState: 'visible',
          createElement() {
            return {};
          },
          querySelector() {
            return null;
          },
        },
        navigator: { onLine: true, userAgent: 'unit-test' },
      },
    },
  } as any;
  const originalNow = Date.now;
  let now = 20_000;
  Date.now = () => now;

  try {
    const runtimeStatus = {
      realtime: { state: 'connecting', channel: '' },
      polling: { active: false, intervalMs: 5000, reason: '' },
      lastPullAt: 18_500,
    } as any;
    const pullCalls: Array<Record<string, unknown> | undefined> = [];

    markCloudSyncRealtimeSubscribed({
      App,
      runtimeStatus,
      publishStatus: () => undefined,
      diag: () => undefined,
      suppressRef: { v: false },
      stopPolling: () => undefined,
      pullAllNow: opts => pullCalls.push(opts as any),
      subscribedRef: { current: false },
      everSubscribedRef: { current: true },
    });

    assert.deepEqual(pullCalls, []);

    now = 24_200;
    markCloudSyncRealtimeSubscribed({
      App,
      runtimeStatus,
      publishStatus: () => undefined,
      diag: () => undefined,
      suppressRef: { v: false },
      stopPolling: () => undefined,
      pullAllNow: opts => pullCalls.push(opts as any),
      subscribedRef: { current: false },
      everSubscribedRef: { current: true },
    });

    assert.deepEqual(pullCalls, [
      { includeControls: false, reason: 'realtime-gap', minRecentPullGapMs: 4000 },
    ]);
  } finally {
    Date.now = originalNow;
  }
});

test('cloud sync realtime beforeunload cleanup removes the current channel through the installed listener', () => {
  const listeners = new Map<string, ((ev: unknown) => void)[]>();
  const removed: Array<{ client: unknown; channel: unknown }> = [];

  const documentLike = {
    createElement() {
      return {} as any;
    },
    querySelector() {
      return null;
    },
  } as any;

  const windowLike = {
    document: documentLike,
    navigator: { userAgent: 'unit-test' },
    location: { href: 'https://example.test/' },
  } as any;

  const refs = {
    client: {
      removeChannel(channel: unknown) {
        removed.push({ client: this, channel });
      },
    },
    channel: { id: 'chan-1' },
  } as any;

  bindCloudSyncRealtimeBeforeUnloadCleanup({
    App: {
      deps: {
        browser: {
          window: windowLike,
          document: documentLike,
          navigator: windowLike.navigator,
          location: windowLike.location,
        },
      },
    } as any,
    refs,
    addListener: (target, type, handler) => {
      assert.equal(target, windowLike);
      const list = listeners.get(type) || [];
      list.push(handler);
      listeners.set(type, list);
    },
  });

  assert.equal(listeners.get('beforeunload')?.length, 1);
  listeners.get('beforeunload')?.[0]?.({});
  assert.deepEqual(removed, [{ client: refs.client, channel: refs.channel }]);
});

test('cloud sync realtime disconnected marker resets subscribed state and restarts polling with the why label', () => {
  const runtimeStatus = { realtime: { state: 'subscribed', channel: 'wp:room-a' } } as any;
  const subscribedRef = { current: true };
  const publishCalls: string[] = [];
  const diagCalls: Array<{ event: string; payload: unknown }> = [];
  const startPollingCalls: string[] = [];

  markCloudSyncRealtimeDisconnected({
    runtimeStatus,
    publishStatus: () => {
      publishCalls.push('publish');
    },
    diag: (event, payload) => {
      diagCalls.push({ event, payload });
    },
    startPolling: reason => {
      startPollingCalls.push(reason);
    },
    subscribedRef,
    why: 'CHANNEL_ERROR',
  });

  assert.equal(subscribedRef.current, false);
  assert.equal(runtimeStatus.realtime.state, 'disconnected:CHANNEL_ERROR');
  assert.deepEqual(publishCalls, ['publish']);
  assert.deepEqual(diagCalls, [{ event: 'realtime:disconnected', payload: 'CHANNEL_ERROR' }]);
  assert.deepEqual(startPollingCalls, ['realtime-CHANNEL_ERROR']);
});

test('cloud sync realtime disconnected marker can publish a preserved error in one canonical transition', () => {
  const runtimeStatus = { realtime: { state: 'connecting', channel: 'wp:room-a' }, lastError: '' } as any;
  const subscribedRef = { current: false };
  let publishCount = 0;

  markCloudSyncRealtimeDisconnected({
    runtimeStatus,
    publishStatus: () => {
      publishCount += 1;
    },
    diag: () => undefined,
    startPolling: () => undefined,
    subscribedRef,
    why: 'subscribe_error',
    lastError: 'subscribe exploded',
  });

  assert.equal(runtimeStatus.lastError, 'subscribe exploded');
  assert.equal(runtimeStatus.realtime.state, 'disconnected:subscribe_error');
  assert.equal(publishCount, 1);
});

test('cloud sync realtime disposed marker clears stale errors from the final disabled snapshot', () => {
  const runtimeStatus = {
    realtime: { enabled: true, mode: 'broadcast', state: 'disconnected:CHANNEL_ERROR', channel: '' },
    lastError: 'stale-error',
  } as any;
  let publishCount = 0;

  markCloudSyncRealtimeDisposed({
    runtimeStatus,
    publishStatus: () => {
      publishCount += 1;
    },
  });

  assert.equal(runtimeStatus.realtime.enabled, false);
  assert.equal(runtimeStatus.realtime.state, 'disabled');
  assert.equal(runtimeStatus.lastError, '');
  assert.equal(publishCount, 1);
});

test('cloud sync realtime hint does not send when realtime is explicitly disabled even if a subscribed channel string remains', async () => {
  const sends: Array<Record<string, unknown>> = [];
  const sentAtByKey = new Map<string, number>();
  const runtimeStatus = { realtime: { enabled: false, state: 'subscribed', channel: 'wp:room-a' } } as any;
  const channel = {
    async send(payload: Record<string, unknown>) {
      sends.push(payload);
    },
  } as any;

  await sendCloudSyncRealtimeHint({
    App: {} as any,
    isDisposed: () => false,
    channel,
    realtimeMode: 'broadcast',
    runtimeStatus,
    scope: 'sketch',
    rowName: 'row-a',
    room: 'room-a',
    clientId: 'client-a',
    eventName: 'cloud_sync_hint',
    dedupeMs: 180,
    sentAtByKey,
  });

  assert.equal(sends.length, 0);
});

test('cloud sync realtime hint does not send when the subscribed status no longer has a live channel', async () => {
  const sends: Array<Record<string, unknown>> = [];
  const sentAtByKey = new Map<string, number>();
  const runtimeStatus = { realtime: { state: 'subscribed', channel: '' } } as any;
  const channel = {
    async send(payload: Record<string, unknown>) {
      sends.push(payload);
    },
  } as any;

  await sendCloudSyncRealtimeHint({
    App: {} as any,
    isDisposed: () => false,
    channel,
    realtimeMode: 'broadcast',
    runtimeStatus,
    scope: 'sketch',
    rowName: 'row-a',
    room: 'room-a',
    clientId: 'client-a',
    eventName: 'cloud_sync_hint',
    dedupeMs: 180,
    sentAtByKey,
  });

  assert.equal(sends.length, 0);
});

test('cloud sync realtime hint suppresses invalid/blank scopes and dedupes normalized scope/row values', async () => {
  const sends: Array<Record<string, unknown>> = [];
  const sentAtByKey = new Map<string, number>();
  const runtimeStatus = { realtime: { state: 'subscribed', channel: 'wp:room-a' } } as any;
  const channel = {
    async send(payload: Record<string, unknown>) {
      sends.push(payload);
    },
  } as any;

  await sendCloudSyncRealtimeHint({
    App: {} as any,
    isDisposed: () => false,
    channel,
    realtimeMode: 'broadcast',
    runtimeStatus,
    scope: 'weird',
    rowName: ' row-a ',
    room: 'room-a',
    clientId: 'client-a',
    eventName: 'cloud_sync_hint',
    dedupeMs: 180,
    sentAtByKey,
  });

  await sendCloudSyncRealtimeHint({
    App: {} as any,
    isDisposed: () => false,
    channel,
    realtimeMode: 'broadcast',
    runtimeStatus,
    scope: ' sketch ',
    rowName: ' row-a ',
    room: 'room-a',
    clientId: 'client-a',
    eventName: 'cloud_sync_hint',
    dedupeMs: 180,
    sentAtByKey,
  });

  await sendCloudSyncRealtimeHint({
    App: {} as any,
    isDisposed: () => false,
    channel,
    realtimeMode: 'broadcast',
    runtimeStatus,
    scope: 'sketch',
    rowName: 'row-a',
    room: 'room-a',
    clientId: 'client-a',
    eventName: 'cloud_sync_hint',
    dedupeMs: 180,
    sentAtByKey,
  });

  assert.equal(sends.length, 1);
  assert.equal((sends[0]?.payload as any)?.scope, 'sketch');
  assert.equal((sends[0]?.payload as any)?.row, 'row-a');
});
