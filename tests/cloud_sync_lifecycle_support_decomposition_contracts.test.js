import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_lifecycle_support.ts', import.meta.url);
const sharedFacade = readSource(
  '../esm/native/services/cloud_sync_lifecycle_support_shared.ts',
  import.meta.url
);
const bindingsOwner = readSource(
  '../esm/native/services/cloud_sync_lifecycle_support_bindings.ts',
  import.meta.url
);
const refreshOwner = readSource(
  '../esm/native/services/cloud_sync_lifecycle_support_refresh.ts',
  import.meta.url
);
const realtimeOwner = readSource(
  '../esm/native/services/cloud_sync_lifecycle_support_realtime.ts',
  import.meta.url
);

test('[cloud-sync-lifecycle-support] facade and shared layer stay thin while bindings, refresh, and realtime owners hold behavior', () => {
  assertMatchesAll(
    assert,
    facade,
    [
      /cloud_sync_lifecycle_support_bindings\.js/,
      /cloud_sync_lifecycle_support_refresh\.js/,
      /cloud_sync_lifecycle_support_realtime\.js/,
      /cloud_sync_lifecycle_support_polling\.js/,
    ],
    'facade'
  );
  assertLacksAll(
    assert,
    facade,
    [
      /export function addCloudSyncLifecycleListener\(/,
      /export function requestCloudSyncLifecycleRefresh\(/,
      /export function syncCloudSyncRealtimeStatusInPlace\(/,
    ],
    'facade'
  );

  assertMatchesAll(
    assert,
    sharedFacade,
    [
      /cloud_sync_lifecycle_support_bindings\.js/,
      /cloud_sync_lifecycle_support_refresh\.js/,
      /cloud_sync_lifecycle_support_realtime\.js/,
      /export \{ requestCloudSyncLifecycleRefresh \}/,
    ],
    'sharedFacade'
  );
  assertLacksAll(
    assert,
    sharedFacade,
    [
      /export function addCloudSyncLifecycleListener\(/,
      /export function requestCloudSyncLifecycleRefresh\(/,
      /export function syncCloudSyncRealtimeStatusInPlace\(/,
    ],
    'sharedFacade'
  );

  assertMatchesAll(
    assert,
    bindingsOwner,
    [
      /export function addCloudSyncLifecycleListener\(/,
      /export function normalizeCloudSyncPullAllNowOptions\(/,
      /export function runCloudSyncPullAllNow\(/,
      /triggerCloudSyncPullAllScopes\(/,
    ],
    'bindingsOwner'
  );

  assertMatchesAll(
    assert,
    refreshOwner,
    [
      /export function requestCloudSyncLifecycleRefresh\(/,
      /readCloudSyncLifecycleRefreshBlockReason\(/,
      /normalizeCloudSyncPullAllNowOptions\(/,
    ],
    'refreshOwner'
  );

  assertMatchesAll(
    assert,
    realtimeOwner,
    [
      /export function syncCloudSyncRealtimeStatusInPlace\(/,
      /function isMutableRealtimeBranch\(/,
      /branch\.channel =/,
    ],
    'realtimeOwner'
  );
});
