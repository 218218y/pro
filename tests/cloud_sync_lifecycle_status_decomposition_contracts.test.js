import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll } from './_source_bundle.js';

const statusRuntime = readSource(
  '../esm/native/services/cloud_sync_lifecycle_status_runtime.ts',
  import.meta.url
);
const statusShared = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_support_status_shared.ts',
  import.meta.url
);
const lifecycleRuntime = readSource(
  '../esm/native/services/cloud_sync_lifecycle_runtime.ts',
  import.meta.url
);
const lifecycleRuntimeStart = readSource(
  '../esm/native/services/cloud_sync_lifecycle_runtime_start.ts',
  import.meta.url
);
const lifecycleRuntimeDispose = readSource(
  '../esm/native/services/cloud_sync_lifecycle_runtime_dispose.ts',
  import.meta.url
);

test('cloud sync lifecycle status hardening keeps snapshot/phase mutation in one dedicated runtime seam', () => {
  assertMatchesAll(
    assert,
    statusRuntime,
    [
      /export type CloudSyncLifecyclePhase =/,
      /export function resolveCloudSyncLifecyclePhase\(/,
      /export function readCloudSyncLifecycleSnapshot\(/,
      /export function mutateCloudSyncLifecycleSnapshot\(/,
    ],
    'cloud sync lifecycle status runtime seam'
  );

  assertMatchesAll(
    assert,
    statusShared,
    [
      /cloud_sync_lifecycle_status_runtime\.js/,
      /mutateCloudSyncLifecycleSnapshot\(/,
      /export \{ readCloudSyncLifecycleSnapshot \}/,
    ],
    'cloud sync realtime status shared reuses lifecycle snapshot seam'
  );

  assertMatchesAll(
    assert,
    lifecycleRuntime,
    [
      /createCloudSyncLifecycleRuntimeDeps\(/,
      /startCloudSyncLifecycleOwner\(/,
      /disposeCloudSyncLifecycleOwner\(/,
    ],
    'cloud sync lifecycle runtime delegates owner lifecycle to dedicated start\/dispose seams'
  );

  assertMatchesAll(
    assert,
    lifecycleRuntimeStart,
    [
      /cloud_sync_lifecycle_status_runtime\.js/,
      /mutateCloudSyncLifecycleSnapshot\(/,
      /startPolling\('realtime-disabled', \{ publish: false \}\)/,
    ],
    'cloud sync lifecycle start seam uses lifecycle snapshot seam for owner start'
  );

  assertMatchesAll(
    assert,
    lifecycleRuntimeDispose,
    [
      /cloud_sync_lifecycle_status_runtime\.js/,
      /mutateCloudSyncLifecycleSnapshot\(/,
      /cloudSyncRealtime\.dispose\(\{ publish: false \}\)/,
    ],
    'cloud sync lifecycle dispose seam uses lifecycle snapshot seam for owner dispose'
  );
});
