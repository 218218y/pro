import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_lifecycle_realtime.ts', import.meta.url);
const shared = readSource('../esm/native/services/cloud_sync_lifecycle_realtime_shared.ts', import.meta.url);
const runtime = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_runtime.ts',
  import.meta.url
);
const runtimeState = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_runtime_state.ts',
  import.meta.url
);
const runtimeStart = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_runtime_start.ts',
  import.meta.url
);
const runtimeDispose = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_runtime_dispose.ts',
  import.meta.url
);

test('cloud sync realtime lifecycle keeps a thin facade over shared/runtime seams', () => {
  assertMatchesAll(
    assert,
    facade,
    [
      /cloud_sync_lifecycle_realtime_shared\.js/,
      /cloud_sync_lifecycle_realtime_runtime\.js/,
      /export type \{[\s\S]*CloudSyncRealtimeLifecycleArgs[\s\S]*CloudSyncRealtimeLifecycleOps[\s\S]*\}/,
      /export \{ hasLiveRealtimeTransport \}/,
      /export \{ createCloudSyncRealtimeLifecycle \}/,
    ],
    'cloud sync realtime lifecycle facade'
  );

  assertLacksAll(
    assert,
    facade,
    [
      /createCloudSyncRealtimeTransport\(/,
      /startCloudSyncRealtimeChannel\(/,
      /markCloudSyncRealtimeDisposed\(/,
    ],
    'cloud sync realtime lifecycle facade'
  );

  assertMatchesAll(
    assert,
    shared,
    [
      /export type CloudSyncRealtimeLifecycleArgs = \{/,
      /export type CloudSyncRealtimeLifecycleOps = \{/,
      /export function hasLiveRealtimeTransport\(/,
      /CloudSyncPollingTransitionFn/,
    ],
    'cloud sync realtime lifecycle shared'
  );

  assertMatchesAll(
    assert,
    runtime,
    [
      /cloud_sync_lifecycle_realtime_runtime_state\.js/,
      /cloud_sync_lifecycle_realtime_runtime_start\.js/,
      /cloud_sync_lifecycle_realtime_runtime_dispose\.js/,
      /createCloudSyncRealtimeTransport\(/,
      /createCloudSyncRealtimeRuntimeMutableState\(/,
      /startCloudSyncRealtimeLifecycle\(/,
      /disposeCloudSyncRealtimeLifecycle\(/,
    ],
    'cloud sync realtime lifecycle runtime'
  );

  assertMatchesAll(
    assert,
    runtimeState,
    [
      /startFlight: Promise<void> \| null/,
      /disposed: boolean/,
      /createCloudSyncRealtimeRuntimeMutableState\(/,
    ],
    'cloud sync realtime lifecycle runtime state'
  );

  assertMatchesAll(
    assert,
    runtimeStart,
    [
      /startCloudSyncRealtimeChannel\(/,
      /hasLiveRealtimeTransport\(/,
      /transport\.cleanupRealtimeTransport\('realtime\.restart'\)/,
      /mutableState\.startFlight/,
    ],
    'cloud sync realtime lifecycle runtime start'
  );

  assertMatchesAll(
    assert,
    runtimeDispose,
    [
      /markCloudSyncRealtimeDisposed\(/,
      /transport\.cleanupRealtimeTransport\('cloudSyncLifecycle\.dispose'\)/,
      /mutableState\.disposed = true/,
    ],
    'cloud sync realtime lifecycle runtime dispose'
  );
});
