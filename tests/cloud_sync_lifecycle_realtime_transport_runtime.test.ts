import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncRealtimeTransport } from '../esm/native/services/cloud_sync_lifecycle_realtime_transport.ts';

test('cloud sync realtime transport cleanup clears refs and honors keepHints', () => {
  let removeCalls = 0;
  let disconnectCalls = 0;
  let clearedTimer: unknown[] = [];
  let hintSetterCalls: Array<unknown> = [];

  const client = {
    removeChannel() {
      removeCalls += 1;
    },
    realtime: {
      disconnect() {
        disconnectCalls += 1;
      },
    },
  } as any;
  const channel = {} as any;

  const refs = {
    connectTimer: 123 as any,
    client,
    channel,
  };

  const runtimeStatus = {
    realtime: { enabled: true, mode: 'broadcast', state: 'idle', channel: 'chan' },
    polling: { active: false, intervalMs: 5000, reason: '' },
    room: 'room-a',
    clientId: 'client-a',
    instanceId: 'instance-a',
    lastPullAt: 0,
    lastPushAt: 0,
    lastRealtimeEventAt: 0,
    lastError: '',
    diagEnabled: false,
  } as any;

  const transport = createCloudSyncRealtimeTransport({
    App: { services: { platform: { reportError() {} } } } as any,
    refs,
    runtimeStatus,
    publishStatus: () => undefined,
    diag: () => undefined,
    startPolling: () => undefined,
    clearTimeoutFn: id => {
      clearedTimer.push(id);
    },
    setSendRealtimeHint: next => {
      hintSetterCalls.push(next);
    },
  });

  transport.sentAtByKey.set('main', Date.now());
  transport.cleanupRealtimeTransport('test.cleanup', { keepHints: true });

  assert.equal(refs.client, null);
  assert.equal(refs.channel, null);
  assert.equal(refs.connectTimer, null);
  assert.equal(removeCalls, 1);
  assert.equal(disconnectCalls, 1);
  assert.deepEqual(clearedTimer, [123]);
  assert.equal(transport.sentAtByKey.size, 1, 'keepHints preserves dedupe map');
  assert.deepEqual(hintSetterCalls, [], 'keepHints skips nulling sender');

  refs.client = client;
  refs.channel = channel;
  refs.connectTimer = 456 as any;
  transport.cleanupRealtimeTransport('test.cleanup');

  assert.equal(transport.sentAtByKey.size, 0);
  assert.deepEqual(hintSetterCalls, [null]);
});

test('cloud sync realtime transport disconnect ignores stale token and handles current token once', () => {
  const startPollingCalls: string[] = [];
  let publishCount = 0;

  const refs = {
    connectTimer: null,
    client: {
      removeChannel() {},
      realtime: { disconnect() {} },
    } as any,
    channel: {} as any,
  };

  const runtimeStatus = {
    realtime: { enabled: true, mode: 'broadcast', state: 'subscribed', channel: 'room-a' },
    polling: { active: false, intervalMs: 5000, reason: '' },
    room: 'room-a',
    clientId: 'client-a',
    instanceId: 'instance-a',
    lastPullAt: 0,
    lastPushAt: 0,
    lastRealtimeEventAt: 0,
    lastError: '',
    diagEnabled: false,
  } as any;

  const transport = createCloudSyncRealtimeTransport({
    App: { services: { platform: { reportError() {} } } } as any,
    refs,
    runtimeStatus,
    publishStatus: () => {
      publishCount += 1;
    },
    diag: () => undefined,
    startPolling: reason => {
      startPollingCalls.push(reason);
    },
    clearTimeoutFn: () => undefined,
    setSendRealtimeHint: () => undefined,
  });

  const subscribedRef = { current: true };
  const disconnectStateRef = { current: false };
  const staleToken = transport.getTransportToken() + 1;

  transport.handleRealtimeDisconnect('CLOSED', subscribedRef, staleToken, disconnectStateRef);
  assert.equal(runtimeStatus.realtime.state, 'subscribed');
  assert.equal(publishCount, 0);
  assert.deepEqual(startPollingCalls, []);

  const currentToken = transport.getTransportToken();
  transport.handleRealtimeDisconnect('CLOSED', subscribedRef, currentToken, disconnectStateRef, {
    lastError: 'socket closed',
  });

  assert.equal(runtimeStatus.realtime.state, 'disconnected:CLOSED');
  assert.equal(runtimeStatus.realtime.channel, '');
  assert.equal(runtimeStatus.lastError, 'socket closed');
  assert.equal(subscribedRef.current, false);
  assert.equal(disconnectStateRef.current, true);
  assert.deepEqual(startPollingCalls, ['realtime-CLOSED']);
  assert.equal(publishCount, 1);

  transport.handleRealtimeDisconnect('CLOSED', subscribedRef, currentToken, disconnectStateRef);
  assert.equal(publishCount, 1, 'disconnect should only apply once for active token');
});

test('cloud sync realtime transport cleanup reports hint clearing failures and still clears transport refs', () => {
  const reported: Array<{ error: unknown; ctx: any }> = [];
  let removeCalls = 0;
  let disconnectCalls = 0;
  const clearedTimers: unknown[] = [];

  const client = {
    removeChannel() {
      removeCalls += 1;
    },
    realtime: {
      disconnect() {
        disconnectCalls += 1;
      },
    },
  } as any;
  const channel = {} as any;
  const refs = {
    connectTimer: 99 as any,
    client,
    channel,
  };

  const runtimeStatus = {
    realtime: { enabled: true, mode: 'broadcast', state: 'subscribed', channel: 'wp:room-a' },
    polling: { active: false, intervalMs: 5000, reason: '' },
  } as any;

  const transport = createCloudSyncRealtimeTransport({
    App: {
      services: {
        platform: {
          reportError(error: unknown, ctx: any) {
            reported.push({ error, ctx });
          },
        },
      },
    } as any,
    refs,
    runtimeStatus,
    publishStatus: () => undefined,
    diag: () => undefined,
    startPolling: () => undefined,
    clearTimeoutFn: id => {
      clearedTimers.push(id);
    },
    setSendRealtimeHint: () => {
      throw new Error('hint setter failed');
    },
  });

  transport.sentAtByKey.set('main', 123);

  assert.doesNotThrow(() => transport.cleanupRealtimeTransport('test.cleanup'));
  assert.equal(refs.client, null);
  assert.equal(refs.channel, null);
  assert.equal(refs.connectTimer, null);
  assert.equal(transport.sentAtByKey.size, 0, 'hint dedupe map must clear even when the hint setter fails');
  assert.deepEqual(clearedTimers, [99]);
  assert.equal(removeCalls, 1);
  assert.equal(disconnectCalls, 1);
  assert.equal(reported.length, 1);
  assert.equal((reported[0]?.error as Error).message, 'hint setter failed');
  assert.equal(reported[0]?.ctx?.op, 'test.cleanup.clearHints');
});
