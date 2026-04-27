import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_tabs_gate_snapshot.ts', import.meta.url);
const shared = readSource('../esm/native/services/cloud_sync_tabs_gate_snapshot_shared.ts', import.meta.url);
const runtime = readSource(
  '../esm/native/services/cloud_sync_tabs_gate_snapshot_runtime.ts',
  import.meta.url
);
const runtimeShared = readSource(
  '../esm/native/services/cloud_sync_tabs_gate_snapshot_runtime_shared.ts',
  import.meta.url
);
const runtimePublish = readSource(
  '../esm/native/services/cloud_sync_tabs_gate_snapshot_runtime_publish.ts',
  import.meta.url
);
const runtimeSubscription = readSource(
  '../esm/native/services/cloud_sync_tabs_gate_snapshot_runtime_subscription.ts',
  import.meta.url
);

test('cloud sync tabs gate snapshot keeps helpers and controller runtime in focused seams', () => {
  assertMatchesAll(assert, facade, [
    /cloud_sync_tabs_gate_snapshot_shared\.js/,
    /cloud_sync_tabs_gate_snapshot_runtime\.js/,
    /createCloudSyncTabsGateSnapshotController/,
    /equalCloudSyncSite2TabsGateSnapshots/,
  ]);
  assertLacksAll(assert, facade, [
    /function createCloudSyncTabsGateSnapshotController\(/,
    /function cloneCloudSyncSite2TabsGateSnapshot\(/,
    /function readCloudSyncTabsGateErrorMessage\(/,
  ]);

  assertMatchesAll(assert, shared, [
    /export function readCloudSyncTabsGateErrorMessage\(/,
    /export function cloneCloudSyncSite2TabsGateSnapshot\(/,
    /export function readCloudSyncSite2TabsGateSnapshot\(/,
    /export function equalCloudSyncSite2TabsGateSnapshots\(/,
  ]);
  assertLacksAll(assert, shared, [
    /function createCloudSyncTabsGateSnapshotController\(/,
    /snapshotTimerDueAt/,
  ]);

  assertMatchesAll(assert, runtime, [
    /cloud_sync_tabs_gate_snapshot_runtime_shared\.js/,
    /cloud_sync_tabs_gate_snapshot_runtime_publish\.js/,
    /cloud_sync_tabs_gate_snapshot_runtime_subscription\.js/,
    /export function createCloudSyncTabsGateSnapshotController\(/,
  ]);
  assertLacksAll(assert, runtime, [
    /function clearSnapshotTimer\(/,
    /function scheduleSnapshotTick\(/,
    /listeners\.forEach\(/,
  ]);

  assertMatchesAll(assert, runtimeShared, [
    /export type CloudSyncTabsGateSnapshotMutableState = \{/,
    /export function createCloudSyncTabsGateSnapshotMutableState\(/,
    /export function clearCloudSyncTabsGateSnapshotTimer\(/,
  ]);

  assertMatchesAll(assert, runtimePublish, [
    /export function scheduleCloudSyncTabsGateSnapshotTick\(/,
    /export function publishCloudSyncTabsGateSnapshot\(/,
    /equalCloudSyncSite2TabsGateSnapshots/,
    /listeners\.forEach\(/,
  ]);

  assertMatchesAll(assert, runtimeSubscription, [
    /export function subscribeCloudSyncTabsGateSnapshot\(/,
    /export function disposeCloudSyncTabsGateSnapshotController\(/,
    /snapshotSubscribe\.immediate/,
  ]);
});
