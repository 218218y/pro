import test from 'node:test';
import assert from 'node:assert/strict';

import { startCloudSyncRealtimeLifecycle } from '../esm/native/services/cloud_sync_lifecycle_realtime_runtime_start.ts';
import { createCloudSyncRealtimeRuntimeMutableState } from '../esm/native/services/cloud_sync_lifecycle_realtime_runtime_state.ts';

test('cloud sync realtime start flight reports unexpected setup failures and falls back to polling', async () => {
  const reported: Array<{ error: unknown; ctx: any }> = [];
  const fallbackCalls: Array<{
    state: string;
    lastError: string;
    diagEvent: string;
    pollingReason: string;
  }> = [];

  await assert.doesNotReject(
    startCloudSyncRealtimeLifecycle({
      App: {
        services: {
          platform: {
            reportError(error: unknown, ctx: any) {
              reported.push({ error, ctx });
            },
          },
        },
      } as any,
      cfg: {
        url: 'https://example.test',
        anonKey: 'anon',
        realtime: true,
        realtimeMode: 'broadcast',
        realtimeChannelPrefix: 'wp',
      } as any,
      room: 'room-a',
      clientId: 'client-a',
      runtimeStatus: {
        realtime: { enabled: true, mode: 'broadcast', state: 'idle', channel: '' },
        polling: { active: false, intervalMs: 5000, reason: '' },
      } as any,
      publishStatus: () => undefined,
      diag: () => undefined,
      suppressRef: { v: false },
      isDisposed: () => false,
      pullAllNow: () => undefined,
      startPolling: () => undefined,
      stopPolling: () => undefined,
      markRealtimeEvent: () => true,
      realtimeScopedHandlers: {} as any,
      addListener: () => undefined,
      setTimeoutFn: () => 1 as any,
      clearTimeoutFn: () => undefined,
      refs: { connectTimer: null, client: null, channel: null },
      setSendRealtimeHint: () => undefined,
      mutableState: createCloudSyncRealtimeRuntimeMutableState(),
      transport: {
        sentAtByKey: new Map(),
        getTransportToken: () => 1,
        invalidateTransport: () => 2,
        clearConnectTimer: () => undefined,
        cleanupRealtimeTransport: () => {
          throw new Error('pre-start cleanup failed');
        },
        setRealtimeFailure: (state, lastError, diagEvent, pollingReason) => {
          fallbackCalls.push({
            state: String(state),
            lastError,
            diagEvent,
            pollingReason,
          });
        },
        handleRealtimeDisconnect: () => undefined,
      } as any,
    })
  );

  assert.equal(reported.length, 1);
  assert.equal((reported[0]?.error as Error).message, 'pre-start cleanup failed');
  assert.equal(reported[0]?.ctx?.op, 'realtime.startFlight');
  assert.deepEqual(fallbackCalls, [
    {
      state: 'error',
      lastError: 'pre-start cleanup failed',
      diagEvent: 'realtime:start-flight-error',
      pollingReason: 'realtime-start-error',
    },
  ]);
});

test('cloud sync realtime start flight reports fallback transition failures without rejecting', async () => {
  const reported: Array<{ error: unknown; ctx: any }> = [];

  await assert.doesNotReject(
    startCloudSyncRealtimeLifecycle({
      App: {
        services: {
          platform: {
            reportError(error: unknown, ctx: any) {
              reported.push({ error, ctx });
            },
          },
        },
      } as any,
      cfg: {
        url: 'https://example.test',
        anonKey: 'anon',
        realtime: true,
        realtimeMode: 'broadcast',
        realtimeChannelPrefix: 'wp',
      } as any,
      room: 'room-a',
      clientId: 'client-a',
      runtimeStatus: {
        realtime: { enabled: true, mode: 'broadcast', state: 'idle', channel: '' },
        polling: { active: false, intervalMs: 5000, reason: '' },
      } as any,
      publishStatus: () => undefined,
      diag: () => undefined,
      suppressRef: { v: false },
      isDisposed: () => false,
      pullAllNow: () => undefined,
      startPolling: () => undefined,
      stopPolling: () => undefined,
      markRealtimeEvent: () => true,
      realtimeScopedHandlers: {} as any,
      addListener: () => undefined,
      setTimeoutFn: () => 1 as any,
      clearTimeoutFn: () => undefined,
      refs: { connectTimer: null, client: null, channel: null },
      setSendRealtimeHint: () => undefined,
      mutableState: createCloudSyncRealtimeRuntimeMutableState(),
      transport: {
        sentAtByKey: new Map(),
        getTransportToken: () => 1,
        invalidateTransport: () => 2,
        clearConnectTimer: () => undefined,
        cleanupRealtimeTransport: () => {
          throw new Error('pre-start cleanup failed');
        },
        setRealtimeFailure: () => {
          throw new Error('fallback transition failed');
        },
        handleRealtimeDisconnect: () => undefined,
      } as any,
    })
  );

  assert.equal(reported.length, 2);
  assert.equal((reported[0]?.error as Error).message, 'pre-start cleanup failed');
  assert.equal(reported[0]?.ctx?.op, 'realtime.startFlight');
  assert.equal((reported[1]?.error as Error).message, 'fallback transition failed');
  assert.equal(reported[1]?.ctx?.op, 'realtime.startFlightFallback');
});
