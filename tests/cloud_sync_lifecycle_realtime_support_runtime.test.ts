import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeCloudSyncRealtimeSubscribeStatus,
  routeCloudSyncRealtimeBroadcastEvent,
} from '../esm/native/services/cloud_sync_lifecycle_realtime_support.ts';

test('cloud sync realtime broadcast routing normalizes empty scope and rejects malformed payloads', () => {
  const calls: string[] = [];
  const args = {
    App: {
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
    } as any,
    clientId: 'client-self',
    room: 'room-a',
    runtimeStatus: {
      realtime: { enabled: true, state: 'subscribed', channel: 'wp:room-a' },
      polling: { active: false, intervalMs: 5000, reason: '' },
      lastPullAt: 0,
    } as any,
    suppressRef: { v: false },
    markRealtimeEvent: () => {
      calls.push('mark');
      return true;
    },
    pullAllNow: (opts?: { reason?: string; minRecentPullGapMs?: number }) => {
      calls.push(`pull:${String(opts?.reason || '')}:${String(opts?.minRecentPullGapMs || 0)}`);
    },
    realtimeScopedHandlers: {
      main: () => {
        calls.push('main');
      },
      sketch: () => {
        calls.push('sketch');
      },
      tabsGate: () => {
        calls.push('tabsGate');
      },
      floatingSync: () => {
        calls.push('floatingSync');
      },
    },
  };

  routeCloudSyncRealtimeBroadcastEvent({ ...args, evt: { payload: { scope: 'weird', room: 'room-a' } } });
  routeCloudSyncRealtimeBroadcastEvent({ ...args, evt: { payload: null } });
  assert.deepEqual(calls, []);

  routeCloudSyncRealtimeBroadcastEvent({
    ...args,
    evt: { payload: { scope: '', room: 'room-a', by: 'client-2', row: 'main', ts: 12 } },
  });

  assert.deepEqual(calls, ['mark', 'pull:realtime.broadcast:1500']);
});

test('cloud sync realtime broadcast fallback refresh respects the canonical recent-pull gate', () => {
  const calls: string[] = [];
  const originalNow = Date.now;
  let now = 20_000;
  Date.now = () => now;

  try {
    const args = {
      App: {
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
      } as any,
      clientId: 'client-self',
      room: 'room-a',
      runtimeStatus: {
        realtime: { enabled: true, state: 'subscribed', channel: 'wp:room-a' },
        polling: { active: false, intervalMs: 5000, reason: '' },
        lastPullAt: 18_900,
      } as any,
      suppressRef: { v: false },
      markRealtimeEvent: () => {
        calls.push('mark');
        return true;
      },
      pullAllNow: (opts?: { reason?: string; minRecentPullGapMs?: number }) => {
        calls.push(`pull:${String(opts?.reason || '')}:${String(opts?.minRecentPullGapMs || 0)}`);
      },
      realtimeScopedHandlers: {
        main: () => {
          calls.push('main');
        },
        sketch: () => {
          calls.push('sketch');
        },
        tabsGate: () => {
          calls.push('tabsGate');
        },
        floatingSync: () => {
          calls.push('floatingSync');
        },
      },
    };

    routeCloudSyncRealtimeBroadcastEvent({
      ...args,
      evt: { payload: { scope: '', room: 'room-a', by: 'client-2', row: 'main', ts: 12 } },
    });
    assert.deepEqual(calls, ['mark']);

    now = 20_800;
    routeCloudSyncRealtimeBroadcastEvent({
      ...args,
      evt: { payload: { scope: '', room: 'room-a', by: 'client-2', row: 'main', ts: 13 } },
    });
    assert.deepEqual(calls, ['mark', 'mark', 'pull:realtime.broadcast:1500']);
  } finally {
    Date.now = originalNow;
  }
});

test('cloud sync realtime subscribe status normalization accepts only known lifecycle statuses', () => {
  assert.equal(normalizeCloudSyncRealtimeSubscribeStatus(' subscribed '), 'SUBSCRIBED');
  assert.equal(normalizeCloudSyncRealtimeSubscribeStatus('channel_error'), 'CHANNEL_ERROR');
  assert.equal(normalizeCloudSyncRealtimeSubscribeStatus('TIMED_OUT'), 'TIMED_OUT');
  assert.equal(normalizeCloudSyncRealtimeSubscribeStatus('closed'), 'CLOSED');
  assert.equal(normalizeCloudSyncRealtimeSubscribeStatus('joined'), '');
  assert.equal(normalizeCloudSyncRealtimeSubscribeStatus({ status: 'SUBSCRIBED' }), '');
});

test('cloud sync realtime broadcast routing ignores malformed/self/foreign hints and dispatches canonical scopes', () => {
  const calls: string[] = [];
  const args = {
    App: {
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
    } as any,
    clientId: 'client-self',
    room: 'room-a',
    runtimeStatus: {
      realtime: { enabled: true, state: 'subscribed', channel: 'wp:room-a' },
      polling: { active: false, intervalMs: 5000, reason: '' },
      lastPullAt: 0,
    } as any,
    suppressRef: { v: false },
    markRealtimeEvent: () => {
      calls.push('mark');
      return true;
    },
    pullAllNow: (opts?: { reason?: string; minRecentPullGapMs?: number }) => {
      calls.push(`pull:${String(opts?.reason || '')}:${String(opts?.minRecentPullGapMs || 0)}`);
    },
    realtimeScopedHandlers: {
      main: () => {
        calls.push('main');
      },
      sketch: () => {
        calls.push('sketch');
      },
      tabsGate: () => {
        calls.push('tabsGate');
      },
      floatingSync: () => {
        calls.push('floatingSync');
      },
    },
  };

  routeCloudSyncRealtimeBroadcastEvent({ ...args, evt: { payload: { scope: '???', room: 'room-a' } } });
  routeCloudSyncRealtimeBroadcastEvent({
    ...args,
    evt: { payload: { scope: 'main', room: 'room-a', by: 'client-self' } },
  });
  routeCloudSyncRealtimeBroadcastEvent({
    ...args,
    evt: { payload: { scope: 'sketch', room: 'room-b', by: 'client-2' } },
  });
  assert.deepEqual(calls, []);

  routeCloudSyncRealtimeBroadcastEvent({
    ...args,
    evt: { payload: { scope: 'main', room: 'room-a', by: 'client-2' } },
  });
  routeCloudSyncRealtimeBroadcastEvent({
    ...args,
    evt: { payload: { scope: 'sketch', room: 'room-a', by: 'client-2' } },
  });
  routeCloudSyncRealtimeBroadcastEvent({
    ...args,
    evt: { payload: { scope: 'tabsGate', room: 'room-a', by: 'client-2' } },
  });
  routeCloudSyncRealtimeBroadcastEvent({
    ...args,
    evt: { payload: { scope: 'floatingSync', room: 'room-a', by: 'client-2' } },
  });
  routeCloudSyncRealtimeBroadcastEvent({
    ...args,
    evt: { payload: { scope: '', room: 'room-a', by: 'client-2' } },
  });

  assert.deepEqual(calls, [
    'main',
    'sketch',
    'tabsGate',
    'floatingSync',
    'mark',
    'pull:realtime.broadcast:1500',
  ]);
});
