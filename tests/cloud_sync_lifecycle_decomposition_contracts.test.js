import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_lifecycle.ts', import.meta.url);
const shared = readSource('../esm/native/services/cloud_sync_lifecycle_shared.ts', import.meta.url);
const state = readSource('../esm/native/services/cloud_sync_lifecycle_state.ts', import.meta.url);
const bindings = readSource('../esm/native/services/cloud_sync_lifecycle_bindings.ts', import.meta.url);
const polling = readSource('../esm/native/services/cloud_sync_lifecycle_polling.ts', import.meta.url);
const runtime = readSource('../esm/native/services/cloud_sync_lifecycle_runtime.ts', import.meta.url);
const runtimeSetup = readSource(
  '../esm/native/services/cloud_sync_lifecycle_runtime_setup.ts',
  import.meta.url
);
const runtimeStart = readSource(
  '../esm/native/services/cloud_sync_lifecycle_runtime_start.ts',
  import.meta.url
);
const runtimeDispose = readSource(
  '../esm/native/services/cloud_sync_lifecycle_runtime_dispose.ts',
  import.meta.url
);

test('cloud sync lifecycle keeps a thin public facade over shared/runtime seams', () => {
  assertMatchesAll(
    assert,
    facade,
    [
      /cloud_sync_lifecycle_shared\.js/,
      /cloud_sync_lifecycle_runtime\.js/,
      /export \{ createCloudSyncLifecycleOps \}/,
      /export type \{/,
    ],
    'cloud sync lifecycle facade'
  );

  assertLacksAll(
    assert,
    facade,
    [
      /createCloudSyncRealtimeLifecycle\(/,
      /bindCloudSyncAttentionPulls\(/,
      /bindCloudSyncDiagStorageListener\(/,
      /syncCloudSyncRealtimeStatusInPlace\(/,
      /markCloudSyncRealtimeEvent\(/,
    ],
    'cloud sync lifecycle facade'
  );

  assertMatchesAll(
    assert,
    shared,
    [
      /cloud_sync_lifecycle_state\.js/,
      /cloud_sync_lifecycle_bindings\.js/,
      /cloud_sync_lifecycle_polling\.js/,
      /createCloudSyncLifecycleMutableState/,
      /createCloudSyncLifecycleAddListener/,
      /createCloudSyncLifecyclePollingTransitions/,
    ],
    'cloud sync lifecycle shared facade'
  );

  assertMatchesAll(
    assert,
    state,
    [/export type CloudSyncLifecycleArgs = \{/, /createCloudSyncLifecycleMutableState\(/],
    'cloud sync lifecycle state'
  );

  assertMatchesAll(
    assert,
    bindings,
    [
      /createCloudSyncLifecycleAddListener\(/,
      /createCloudSyncLifecyclePullAllNow\(/,
      /runCloudSyncPullAllNow\(/,
    ],
    'cloud sync lifecycle bindings'
  );

  assertMatchesAll(
    assert,
    polling,
    [
      /createCloudSyncLifecyclePollingTransitions\(/,
      /startCloudSyncPolling\(/,
      /stopCloudSyncPolling\(/,
      /markCloudSyncRealtimeEvent\(/,
    ],
    'cloud sync lifecycle polling'
  );

  assertMatchesAll(
    assert,
    runtime,
    [
      /cloud_sync_lifecycle_runtime_setup\.js/,
      /cloud_sync_lifecycle_runtime_start\.js/,
      /cloud_sync_lifecycle_runtime_dispose\.js/,
      /createCloudSyncLifecycleRuntimeDeps\(/,
      /startCloudSyncLifecycleOwner\(/,
      /disposeCloudSyncLifecycleOwner\(/,
    ],
    'cloud sync lifecycle runtime'
  );

  assertMatchesAll(
    assert,
    runtimeSetup,
    [
      /createCloudSyncLifecycleMutableState\(/,
      /createCloudSyncLifecycleAddListener\(/,
      /createCloudSyncLifecyclePullAllNow\(/,
      /createCloudSyncLifecyclePollingTransitions\(/,
      /createCloudSyncRealtimeScopedHandlerMapFromTriggers\(/,
      /createCloudSyncRealtimeLifecycle\(/,
    ],
    'cloud sync lifecycle runtime setup'
  );

  assertMatchesAll(
    assert,
    runtimeStart,
    [
      /bindCloudSyncAttentionPulls\(/,
      /bindCloudSyncDiagStorageListener\(/,
      /syncCloudSyncRealtimeStatusInPlace\(/,
      /mutateCloudSyncLifecycleSnapshot\(/,
      /cloud_sync_lifecycle_runtime_realtime_start\.js/,
      /startCloudSyncRealtimeWithLifecycleFallback\(/,
    ],
    'cloud sync lifecycle runtime start'
  );

  assertMatchesAll(
    assert,
    runtimeDispose,
    [
      /mutateCloudSyncLifecycleSnapshot\(/,
      /stopPolling\('dispose'/,
      /cloudSyncRealtime\.dispose\(/,
      /_cloudSyncReportNonFatal\(/,
    ],
    'cloud sync lifecycle runtime dispose'
  );
});
