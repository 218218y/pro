import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const supportFacade = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_support.ts',
  import.meta.url
);
const supportBroadcastFacade = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_support_broadcast.ts',
  import.meta.url
);
const supportBroadcastPayloadRuntime = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_support_broadcast_payload.ts',
  import.meta.url
);
const supportBroadcastSendRuntime = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_support_broadcast_send_runtime.ts',
  import.meta.url
);
const supportBroadcastRouteRuntime = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_support_broadcast_route_runtime.ts',
  import.meta.url
);
const supportStatusFacade = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_support_status.ts',
  import.meta.url
);
const supportStatusShared = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_support_status_shared.ts',
  import.meta.url
);
const supportTransitionRuntime = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_support_transition_runtime.ts',
  import.meta.url
);
const supportSubscriptionRuntime = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_support_subscription_runtime.ts',
  import.meta.url
);

test('cloud sync realtime support keeps subscribe-status policy and transition/session owners on dedicated seams', () => {
  assertMatchesAll(
    assert,
    supportFacade,
    [
      /cloud_sync_lifecycle_realtime_support_status\.js/,
      /cloud_sync_lifecycle_realtime_support_broadcast\.js/,
      /cloud_sync_lifecycle_realtime_support_cleanup\.js/,
    ],
    'cloud sync realtime support facade'
  );

  assertMatchesAll(
    assert,
    supportBroadcastFacade,
    [
      /cloud_sync_lifecycle_realtime_support_broadcast_send_runtime\.js/,
      /cloud_sync_lifecycle_realtime_support_broadcast_route_runtime\.js/,
      /cloud_sync_pull_scopes\.js/,
      /export \{ sendCloudSyncRealtimeHint \}/,
      /export \{ routeCloudSyncRealtimeBroadcastEvent \}/,
    ],
    'cloud sync realtime support broadcast facade'
  );
  assertLacksAll(
    assert,
    supportBroadcastFacade,
    [
      /readCloudSyncRealtimeHintPayload\(/,
      /requestCloudSyncLifecycleRefresh\(/,
      /hasLiveRealtimeSubscriptionStatus\(/,
    ],
    'cloud sync realtime support broadcast facade'
  );

  assertMatchesAll(
    assert,
    supportBroadcastPayloadRuntime,
    [
      /export function readCloudSyncRealtimeHintPayload\(/,
      /asRecord\(/,
      /normalizeCloudSyncRealtimeHintScope\(/,
      /normalizeCloudSyncRealtimeHintRowName\(/,
    ],
    'cloud sync realtime support broadcast payload runtime'
  );

  assertMatchesAll(
    assert,
    supportBroadcastSendRuntime,
    [
      /export async function sendCloudSyncRealtimeHint\(/,
      /hasLiveRealtimeSubscriptionStatus\(/,
      /normalizeCloudSyncRealtimeHintScope\(/,
      /normalizeCloudSyncRealtimeHintRowName\(/,
    ],
    'cloud sync realtime support broadcast send runtime'
  );

  assertMatchesAll(
    assert,
    supportBroadcastRouteRuntime,
    [
      /export function routeCloudSyncRealtimeBroadcastEvent\(/,
      /readCloudSyncRealtimeHintPayload\(/,
      /requestCloudSyncLifecycleRefresh\(/,
      /invokeCloudSyncRealtimeScopedHandler\(/,
    ],
    'cloud sync realtime support broadcast route runtime'
  );

  assertMatchesAll(
    assert,
    supportStatusShared,
    [
      /export function normalizeCloudSyncRealtimeSubscribeStatus\(/,
      /export function applyCloudSyncRealtimeStatus\(/,
      /export type CloudSyncRealtimePublishArgs = \{/,
      /export type CloudSyncPollingTransitionFn = /,
    ],
    'cloud sync realtime support status shared'
  );

  assertMatchesAll(
    assert,
    supportStatusFacade,
    [
      /cloud_sync_lifecycle_realtime_support_status_shared\.js/,
      /cloud_sync_lifecycle_realtime_support_transition_runtime\.js/,
      /cloud_sync_lifecycle_realtime_support_subscription_runtime\.js/,
      /markCloudSyncRealtimeSubscribed/,
      /markCloudSyncRealtimeTimeout/,
      /normalizeCloudSyncRealtimeSubscribeStatus/,
    ],
    'cloud sync realtime support status facade'
  );
  assertLacksAll(
    assert,
    supportStatusFacade,
    [
      /applyCloudSyncRealtimeLifecycleTransition\(/,
      /requestCloudSyncLifecycleRefresh\(/,
      /syncCloudSyncRealtimeStatusInPlace\(/,
    ],
    'cloud sync realtime support status facade'
  );

  assertMatchesAll(
    assert,
    supportTransitionRuntime,
    [
      /applyCloudSyncRealtimeLifecycleTransition\(/,
      /syncCloudSyncRealtimeStatusInPlace/,
      /export function markCloudSyncRealtimeConnecting\(/,
      /export function markCloudSyncRealtimeDisposed\(/,
    ],
    'cloud sync realtime support transition runtime'
  );
  assertLacksAll(
    assert,
    supportTransitionRuntime,
    [/requestCloudSyncLifecycleRefresh\(/, /createCloudSyncRealtimeGapRefreshProfile\(/],
    'cloud sync realtime support transition runtime'
  );

  assertMatchesAll(
    assert,
    supportSubscriptionRuntime,
    [
      /createCloudSyncRealtimeGapRefreshProfile\(/,
      /requestCloudSyncLifecycleRefresh\(/,
      /export function markCloudSyncRealtimeSubscribed\(/,
    ],
    'cloud sync realtime support subscription runtime'
  );
  assertLacksAll(
    assert,
    supportSubscriptionRuntime,
    [/export function markCloudSyncRealtimeFailure\(/, /export function markCloudSyncRealtimeTimeout\(/],
    'cloud sync realtime support subscription runtime'
  );
});
