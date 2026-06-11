import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyCloudSyncRealtimeSubscribeStatus,
  handleCloudSyncRealtimeSubscribeFailure,
} from '../esm/native/services/cloud_sync_lifecycle_realtime_channel_subscribe_status_runtime.js';

test('cloud sync realtime subscribe status runtime marks subscribed and installs hint sender', () => {
  const stopPollingCalls: Array<{ reason: string; publish?: boolean }> = [];
  const pullCalls: Array<Record<string, unknown> | undefined> = [];
  const publishCalls: string[] = [];
  const runtimeStatus = {
    realtime: { enabled: true, mode: 'broadcast', state: 'connecting', channel: 'wp:room-a' },
    polling: { active: true, intervalMs: 5000, reason: 'stale' },
    lastError: '',
  } as any;
  let hintSender: ((scope: string, rowName?: string) => void) | null = null;
  const transport = {
    sentAtByKey: new Map<string, number>(),
    getTransportToken: () => 4,
    clearConnectTimer: () => {
      publishCalls.push('clearConnectTimer');
    },
    handleRealtimeDisconnect: () => {
      publishCalls.push('disconnect');
    },
  } as any;

  applyCloudSyncRealtimeSubscribeStatus({
    App: {} as any,
    cfg: { realtimeMode: 'broadcast' } as any,
    room: 'room-a',
    clientId: 'client-a',
    runtimeStatus,
    publishStatus: () => {
      publishCalls.push(String(runtimeStatus.realtime.state));
    },
    diag: () => undefined,
    suppressRef: { v: false },
    isDisposed: () => false,
    pullAllNow: opts => {
      pullCalls.push(opts as any);
    },
    stopPolling: (reason, opts) => {
      stopPollingCalls.push({ reason, publish: opts?.publish });
      runtimeStatus.polling = { active: false, intervalMs: 5000, reason };
    },
    setSendRealtimeHint: next => {
      hintSender = next;
    },
    transport,
    transportToken: 4,
    disconnectStateRef: { current: false },
    refs: { channel: { send() {} } as any },
    isSubscribedRef: { current: false },
    everSubscribedRef: { current: false },
    status: 'SUBSCRIBED',
  });

  assert.equal(runtimeStatus.realtime.state, 'subscribed');
  assert.deepEqual(stopPollingCalls, [{ reason: 'realtime-subscribed', publish: false }]);
  assert.deepEqual(pullCalls, []);
  assert.equal(typeof hintSender, 'function');
  assert.deepEqual(publishCalls, ['clearConnectTimer', 'subscribed']);
});

test('cloud sync realtime subscribe status runtime funnels disconnects and subscribe failures through transport guards', () => {
  const disconnectCalls: Array<Record<string, unknown>> = [];
  const transport = {
    getTransportToken: () => 7,
    clearConnectTimer: () => undefined,
    sentAtByKey: new Map<string, number>(),
    handleRealtimeDisconnect: (
      why: string,
      subscribedRef: { current: boolean },
      transportToken: number,
      disconnectStateRef: { current: boolean },
      opts?: { lastError?: string }
    ) => {
      disconnectCalls.push({
        why,
        subscribed: subscribedRef.current,
        transportToken,
        disconnected: disconnectStateRef.current,
        lastError: opts?.lastError || '',
      });
    },
  } as any;

  applyCloudSyncRealtimeSubscribeStatus({
    App: {} as any,
    cfg: { realtimeMode: 'broadcast' } as any,
    room: 'room-a',
    clientId: 'client-a',
    runtimeStatus: { realtime: { state: 'connecting' } } as any,
    publishStatus: () => undefined,
    diag: () => undefined,
    suppressRef: { v: false },
    isDisposed: () => false,
    pullAllNow: () => undefined,
    stopPolling: () => undefined,
    setSendRealtimeHint: () => undefined,
    transport,
    transportToken: 7,
    disconnectStateRef: { current: false },
    refs: { channel: null },
    isSubscribedRef: { current: true },
    everSubscribedRef: { current: false },
    status: 'CLOSED',
  });

  const failureResult = handleCloudSyncRealtimeSubscribeFailure({
    App: { services: { platform: { reportError() {} } } } as any,
    transport,
    transportToken: 7,
    disconnectStateRef: { current: false },
    isDisposed: () => false,
    err: new Error('subscribe boom'),
    isSubscribedRef: { current: false },
  });

  assert.equal(failureResult, 'failed');
  assert.deepEqual(disconnectCalls, [
    { why: 'CLOSED', subscribed: true, transportToken: 7, disconnected: false, lastError: '' },
    {
      why: 'subscribe_error',
      subscribed: false,
      transportToken: 7,
      disconnected: false,
      lastError: 'subscribe boom',
    },
  ]);
});
