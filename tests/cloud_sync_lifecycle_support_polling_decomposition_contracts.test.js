import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_lifecycle_support_polling.ts', import.meta.url);
const shared = readSource(
  '../esm/native/services/cloud_sync_lifecycle_support_polling_shared.ts',
  import.meta.url
);
const runtime = readSource(
  '../esm/native/services/cloud_sync_lifecycle_support_polling_runtime.ts',
  import.meta.url
);
const startRuntime = readSource(
  '../esm/native/services/cloud_sync_lifecycle_support_polling_start_runtime.ts',
  import.meta.url
);
const statusRuntime = readSource(
  '../esm/native/services/cloud_sync_lifecycle_support_polling_status_runtime.ts',
  import.meta.url
);
const tickRuntime = readSource(
  '../esm/native/services/cloud_sync_lifecycle_support_polling_tick_runtime.ts',
  import.meta.url
);

test('cloud sync lifecycle polling keeps a thin facade over shared/start/status/tick seams', () => {
  assertMatchesAll(
    assert,
    facade,
    [
      /cloud_sync_lifecycle_support_polling_shared\.js/,
      /cloud_sync_lifecycle_support_polling_runtime\.js/,
      /export \{\s*stopCloudSyncPolling,\s*startCloudSyncPolling,\s*markCloudSyncRealtimeEvent,?/,
    ],
    'cloud sync lifecycle polling facade'
  );

  assertLacksAll(
    assert,
    facade,
    [
      /function syncCloudSyncPollingStatusInPlace\(/,
      /function hasCanonicalPollingStatus\(/,
      /function clearCloudSyncPollingTimer\(/,
      /requestCloudSyncLifecycleRefresh\(/,
    ],
    'cloud sync lifecycle polling facade'
  );

  assertMatchesAll(
    assert,
    runtime,
    [
      /cloud_sync_lifecycle_support_polling_start_runtime\.js/,
      /cloud_sync_lifecycle_support_polling_status_runtime\.js/,
      /export \{ startCloudSyncPolling \}/,
      /export \{[\s\S]*stopCloudSyncPolling,[\s\S]*markCloudSyncRealtimeEvent,[\s\S]*\}/,
    ],
    'cloud sync lifecycle polling runtime facade'
  );
  assertLacksAll(
    assert,
    runtime,
    [
      /requestCloudSyncLifecycleRefresh\(/,
      /createCloudSyncPollingRefreshProfile\(/,
      /export function startCloudSyncPolling\(/,
    ],
    'cloud sync lifecycle polling runtime facade'
  );

  assertMatchesAll(
    assert,
    shared,
    [
      /export function isMutablePollingBranch\(/,
      /export function syncCloudSyncPollingStatusInPlace\(/,
      /export function hasCanonicalPollingStatus\(/,
      /export function clearCloudSyncPollingTimer\(/,
    ],
    'cloud sync lifecycle polling shared'
  );

  assertMatchesAll(
    assert,
    startRuntime,
    [
      /export function startCloudSyncPolling\(/,
      /createCloudSyncPollingTick\(/,
      /syncCloudSyncPollingStatusInPlace\(/,
      /stopCloudSyncPolling\(/,
    ],
    'cloud sync lifecycle polling start runtime'
  );

  assertMatchesAll(
    assert,
    statusRuntime,
    [
      /export function stopCloudSyncPolling\(/,
      /export function markCloudSyncRealtimeEvent\(/,
      /clearCloudSyncPollingTimer\(/,
      /hasCanonicalPollingStatus\(/,
    ],
    'cloud sync lifecycle polling status runtime'
  );

  assertMatchesAll(
    assert,
    tickRuntime,
    [
      /export function createCloudSyncPollingTick\(/,
      /requestCloudSyncLifecycleRefresh\(/,
      /createCloudSyncPollingRefreshProfile\(/,
      /clearCloudSyncPollingTimer\(/,
    ],
    'cloud sync lifecycle polling tick runtime'
  );
});
