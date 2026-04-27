import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_lifecycle_realtime_channel.ts', import.meta.url);
const shared = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_channel_shared.ts',
  import.meta.url
);
const runtime = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_channel_runtime.ts',
  import.meta.url
);
const subscribe = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_channel_subscribe.ts',
  import.meta.url
);
const subscribeShared = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_channel_subscribe_shared.ts',
  import.meta.url
);
const subscribeBindings = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_channel_subscribe_bindings.ts',
  import.meta.url
);
const subscribeStatus = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_channel_subscribe_status.ts',
  import.meta.url
);
const subscribeStatusRuntime = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_channel_subscribe_status_runtime.ts',
  import.meta.url
);
const supportStatusShared = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_support_status_shared.ts',
  import.meta.url
);

test('cloud sync realtime channel keeps a thin facade over shared/runtime/subscribe seams', () => {
  assertMatchesAll(
    assert,
    facade,
    [
      /cloud_sync_lifecycle_realtime_channel_shared\.js/,
      /cloud_sync_lifecycle_realtime_channel_runtime\.js/,
      /export type \{ CloudSyncRealtimeChannelStartArgs \}/,
      /export \{ startCloudSyncRealtimeChannel \}/,
    ],
    'cloud sync realtime channel facade'
  );

  assertLacksAll(
    assert,
    facade,
    [
      /cleanupStaleRealtimeStart\(/,
      /resolveRealtimeCreateClient\(/,
      /bindCloudSyncRealtimeBeforeUnloadCleanup\(/,
    ],
    'cloud sync realtime channel facade'
  );

  assertMatchesAll(
    assert,
    shared,
    [
      /export const REALTIME_CONNECT_TIMEOUT_MS = 12000;/,
      /export const REALTIME_BROADCAST_EVENT = 'cloud_sync_hint';/,
      /export type CloudSyncRealtimeChannelStartArgs = \{/,
      /export function cleanupStaleRealtimeStart\(/,
    ],
    'cloud sync realtime channel shared'
  );

  assertMatchesAll(
    assert,
    subscribe,
    [
      /export function subscribeCloudSyncRealtimeChannel\(/,
      /cloud_sync_lifecycle_realtime_channel_subscribe_bindings\.js/,
      /cloud_sync_lifecycle_realtime_channel_subscribe_status\.js/,
      /cloud_sync_lifecycle_realtime_channel_subscribe_shared\.js/,
    ],
    'cloud sync realtime channel subscribe facade'
  );

  assertLacksAll(
    assert,
    subscribe,
    [
      /bindCloudSyncRealtimeBeforeUnloadCleanup\(/,
      /normalizeCloudSyncRealtimeSubscribeStatus\(/,
      /sendCloudSyncRealtimeHint\(/,
    ],
    'cloud sync realtime channel subscribe facade'
  );

  assertMatchesAll(
    assert,
    subscribeShared,
    [
      /export type CloudSyncRealtimeChannelSubscriptionArgs =/,
      /export function hasCloudSyncRealtimeChannelSubscriptionApi\(/,
    ],
    'cloud sync realtime channel subscribe shared'
  );

  assertMatchesAll(
    assert,
    subscribeBindings,
    [
      /export function bindCloudSyncRealtimeBroadcastListener\(/,
      /export function armCloudSyncRealtimeConnectTimeout\(/,
      /bindCloudSyncRealtimeBeforeUnloadCleanup\(/,
    ],
    'cloud sync realtime channel subscribe bindings'
  );

  assertMatchesAll(
    assert,
    supportStatusShared,
    [
      /export function normalizeCloudSyncRealtimeSubscribeStatus\(/,
      /export function applyCloudSyncRealtimeStatus\(/,
      /export type CloudSyncRealtimePublishArgs = \{/,
    ],
    'cloud sync realtime support status shared'
  );

  assertMatchesAll(
    assert,
    subscribeStatus,
    [
      /export function createCloudSyncRealtimeSubscribeStatusHandler\(/,
      /cloud_sync_lifecycle_realtime_channel_subscribe_status_runtime\.js/,
      /export \{ handleCloudSyncRealtimeSubscribeFailure \}/,
    ],
    'cloud sync realtime channel subscribe status'
  );

  assertMatchesAll(
    assert,
    subscribeStatusRuntime,
    [
      /applyCloudSyncRealtimeSubscribeStatus\(/,
      /handleCloudSyncRealtimeSubscribeFailure\(/,
      /normalizeCloudSyncRealtimeSubscribeStatus\(/,
      /sendCloudSyncRealtimeHint\(/,
    ],
    'cloud sync realtime channel subscribe status runtime'
  );

  assertMatchesAll(
    assert,
    runtime,
    [
      /resolveRealtimeCreateClient\(/,
      /getRealtimeChannel\(/,
      /cleanupStaleRealtimeStart\(/,
      /subscribeCloudSyncRealtimeChannel\(/,
    ],
    'cloud sync realtime channel runtime'
  );
});
