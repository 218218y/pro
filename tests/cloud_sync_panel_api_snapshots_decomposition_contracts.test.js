import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_panel_api_snapshots.ts', import.meta.url);
const shared = readSource('../esm/native/services/cloud_sync_panel_api_snapshots_shared.ts', import.meta.url);
const runtime = readSource(
  '../esm/native/services/cloud_sync_panel_api_snapshots_runtime.ts',
  import.meta.url
);
const runtimeShared = readSource(
  '../esm/native/services/cloud_sync_panel_api_snapshots_runtime_shared.ts',
  import.meta.url
);
const publishRuntime = readSource(
  '../esm/native/services/cloud_sync_panel_api_snapshots_publish_runtime.ts',
  import.meta.url
);
const subscriptionRuntime = readSource(
  '../esm/native/services/cloud_sync_panel_api_snapshots_subscription_runtime.ts',
  import.meta.url
);
const sources = readSource(
  '../esm/native/services/cloud_sync_panel_api_snapshots_sources.ts',
  import.meta.url
);

test('cloud sync panel snapshot controller keeps a thin facade over publish/subscription/source seams', () => {
  assertMatchesAll(assert, facade, [
    /cloud_sync_panel_api_snapshots_shared\.js/,
    /cloud_sync_panel_api_snapshots_runtime\.js/,
    /export type \{ CloudSyncPanelSnapshotController \}/,
    /export \{ createCloudSyncPanelSnapshotController \}/,
  ]);

  assertLacksAll(assert, facade, [
    /createCloudSyncPanelSnapshotReaders\(/,
    /scheduleSite2TabsGateFallbackTick\(/,
    /disposeFloatingPanelSourceSubscription\(/,
  ]);

  assertMatchesAll(assert, shared, [
    /export interface CloudSyncPanelSnapshotController \{/,
    /export interface CloudSyncPanelSnapshotMutableState \{/,
    /createCloudSyncPanelSnapshotMutableState\(/,
    /buildSite2TabsGateFallbackScheduleKey\(/,
  ]);

  assertMatchesAll(assert, runtimeShared, [
    /export interface CloudSyncPanelSnapshotRuntimeContext \{/,
    /createCloudSyncPanelSnapshotRuntimeContext\(/,
    /hasSite2TabsGateSource: boolean/,
  ]);

  assertMatchesAll(assert, publishRuntime, [
    /createCloudSyncPanelSnapshotPublishers\(/,
    /scheduleSite2TabsGateFallbackTick\(/,
    /cloneCloudSyncPanelSnapshot\(/,
    /cloneCloudSyncSite2TabsGateSnapshot\(/,
  ]);

  assertMatchesAll(assert, subscriptionRuntime, [
    /createCloudSyncPanelSnapshotSubscriptions\(/,
    /readCloudSyncPanelSnapshotPublicReaders\(/,
    /ensureFloatingPanelSourceSubscription\(/,
    /clearSite2TabsGateFallbackTimer\(/,
  ]);

  assertMatchesAll(assert, sources, [
    /disposeFloatingPanelSourceSubscription\(/,
    /ensureFloatingPanelSourceSubscription\(/,
    /disposeSite2TabsGateSourceSubscription\(/,
    /ensureSite2TabsGateSourceSubscription\(/,
    /scheduleSite2TabsGateFallbackTick\(/,
    /clearSite2TabsGateFallbackTimer\(/,
    /CloudSyncPanelSnapshotRuntimeContext/,
  ]);

  assertMatchesAll(assert, runtime, [
    /createCloudSyncPanelSnapshotReaders\(/,
    /createCloudSyncPanelSnapshotMutableState\(/,
    /createCloudSyncPanelSnapshotRuntimeContext\(/,
    /createCloudSyncPanelSnapshotPublishers\(/,
    /createCloudSyncPanelSnapshotSubscriptions\(/,
    /export function createCloudSyncPanelSnapshotController\(/,
  ]);

  assertLacksAll(assert, runtime, [
    /scheduleSite2TabsGateFallbackTick\(/,
    /ensureFloatingPanelSourceSubscription\(/,
    /listener\(cloneCloudSyncPanelSnapshot/,
  ]);
});
