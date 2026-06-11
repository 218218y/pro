import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_tabs_gate.ts', import.meta.url);
const shared = readSource('../esm/native/services/cloud_sync_tabs_gate_shared.ts', import.meta.url);
const localFacade = readSource('../esm/native/services/cloud_sync_tabs_gate_local.ts', import.meta.url);
const localShared = readSource(
  '../esm/native/services/cloud_sync_tabs_gate_local_shared.ts',
  import.meta.url
);
const localTimers = readSource(
  '../esm/native/services/cloud_sync_tabs_gate_local_timers.ts',
  import.meta.url
);
const localRuntime = readSource(
  '../esm/native/services/cloud_sync_tabs_gate_local_runtime.ts',
  import.meta.url
);
const localBindings = readSource(
  '../esm/native/services/cloud_sync_tabs_gate_local_runtime_bindings.ts',
  import.meta.url
);
const localPatch = readSource(
  '../esm/native/services/cloud_sync_tabs_gate_local_runtime_patch.ts',
  import.meta.url
);
const supportFacade = readSource('../esm/native/services/cloud_sync_tabs_gate_support.ts', import.meta.url);
const snapshot = readSource('../esm/native/services/cloud_sync_tabs_gate_snapshot.ts', import.meta.url);
const snapshotShared = readSource(
  '../esm/native/services/cloud_sync_tabs_gate_snapshot_shared.ts',
  import.meta.url
);
const snapshotRuntime = readSource(
  '../esm/native/services/cloud_sync_tabs_gate_snapshot_runtime.ts',
  import.meta.url
);
const snapshotRuntimeShared = readSource(
  '../esm/native/services/cloud_sync_tabs_gate_snapshot_runtime_shared.ts',
  import.meta.url
);
const snapshotRuntimePublish = readSource(
  '../esm/native/services/cloud_sync_tabs_gate_snapshot_runtime_publish.ts',
  import.meta.url
);
const snapshotRuntimeSubscription = readSource(
  '../esm/native/services/cloud_sync_tabs_gate_snapshot_runtime_subscription.ts',
  import.meta.url
);
const remoteFacade = readSource('../esm/native/services/cloud_sync_tabs_gate_remote.ts', import.meta.url);
const remotePush = readSource('../esm/native/services/cloud_sync_tabs_gate_remote_push.ts', import.meta.url);
const remotePull = readSource('../esm/native/services/cloud_sync_tabs_gate_remote_pull.ts', import.meta.url);
const commandFacade = readSource('../esm/native/services/cloud_sync_tabs_gate_command.ts', import.meta.url);
const commandShared = readSource(
  '../esm/native/services/cloud_sync_tabs_gate_command_shared.ts',
  import.meta.url
);
const commandRuntime = readSource(
  '../esm/native/services/cloud_sync_tabs_gate_command_runtime.ts',
  import.meta.url
);

test('cloud sync tabs gate family keeps thin facades over focused shared/runtime seams', () => {
  assertMatchesAll(assert, facade, [/createCloudSyncTabsGateLocalState/, /createCloudSyncTabsGateRemoteOps/]);
  assertLacksAll(assert, facade, [
    /function resolveCloudSyncTabsGateBaseRoom\(/,
    /function createCloudSyncTabsGateSnapshotController\(/,
    /function createCloudSyncTabsGateRemoteOps\(/,
  ]);

  assertMatchesAll(assert, shared, [
    /export const SITE2_TABS_TTL_MS = 90 \* 60 \* 1000;/,
    /export function resolveCloudSyncTabsGateBaseRoom\(/,
    /export function isCloudSyncTabsGateController\(/,
  ]);

  assertMatchesAll(assert, localFacade, [
    /cloud_sync_tabs_gate_shared\.js/,
    /cloud_sync_tabs_gate_local_shared\.js/,
    /cloud_sync_tabs_gate_local_runtime\.js/,
    /export \{ createCloudSyncTabsGateLocalState/,
  ]);
  assertLacksAll(assert, localFacade, [
    /function createCloudSyncTabsGateLocalState\(/,
    /function resolveCloudSyncTabsGateBaseRoom\(/,
  ]);

  assertMatchesAll(assert, localShared, [
    /export type CloudSyncTabsGateLocalState = \{/,
    /export function createCloudSyncTabsGateLocalMutableState\(/,
    /export function writeSite2TabsGateLocal\(/,
  ]);

  assertMatchesAll(assert, localTimers, [
    /export function clearTabsGateExpiryTimer\(/,
    /export function scheduleTabsGateExpiry\(/,
    /site2TabsGate\.scheduleExpiry\.clearTimer/,
  ]);

  assertMatchesAll(assert, localRuntime, [
    /createCloudSyncTabsGateSnapshotController/,
    /cloud_sync_tabs_gate_local_runtime_bindings\.js/,
    /cloud_sync_tabs_gate_local_runtime_patch\.js/,
  ]);
  assertLacksAll(assert, localRuntime, [
    /applyCloudSyncUiPatch/,
    /scheduleTabsGateExpiry\(/,
    /writeSite2TabsGateLocalShared/,
  ]);

  assertMatchesAll(assert, localBindings, [
    /export function createCloudSyncTabsGateLocalBindings\(/,
    /isCloudSyncTabsGateController/,
    /resolveCloudSyncTabsGateBaseRoom/,
    /writeSite2TabsGateLocalShared/,
  ]);

  assertMatchesAll(assert, localPatch, [
    /export function createCloudSyncTabsGateLocalPatchController\(/,
    /applyCloudSyncUiPatch/,
    /scheduleTabsGateExpiry\(/,
    /clearTabsGateExpiryTimer\(/,
  ]);

  assertMatchesAll(assert, supportFacade, [
    /cloud_sync_tabs_gate_snapshot\.js/,
    /resolveCloudSyncTabsGateState/,
  ]);
  assertLacksAll(assert, supportFacade, [
    /function createCloudSyncTabsGateSnapshotController\(/,
    /function readCloudSyncTabsGateErrorMessage\(/,
  ]);

  assertMatchesAll(assert, snapshot, [
    /cloud_sync_tabs_gate_snapshot_shared\.js/,
    /cloud_sync_tabs_gate_snapshot_runtime\.js/,
    /createCloudSyncTabsGateSnapshotController/,
  ]);
  assertLacksAll(assert, snapshot, [
    /function createCloudSyncTabsGateSnapshotController\(/,
    /function readCloudSyncTabsGateErrorMessage\(/,
  ]);

  assertMatchesAll(assert, snapshotShared, [
    /export function readCloudSyncTabsGateErrorMessage\(/,
    /export function cloneCloudSyncSite2TabsGateSnapshot\(/,
    /export function readCloudSyncSite2TabsGateSnapshot\(/,
    /export function equalCloudSyncSite2TabsGateSnapshots\(/,
  ]);

  assertMatchesAll(assert, snapshotRuntime, [
    /cloud_sync_tabs_gate_snapshot_runtime_shared\.js/,
    /cloud_sync_tabs_gate_snapshot_runtime_publish\.js/,
    /cloud_sync_tabs_gate_snapshot_runtime_subscription\.js/,
    /export function createCloudSyncTabsGateSnapshotController\(/,
  ]);

  assertMatchesAll(assert, snapshotRuntimeShared, [
    /export function createCloudSyncTabsGateSnapshotMutableState\(/,
    /export function clearCloudSyncTabsGateSnapshotTimer\(/,
  ]);

  assertMatchesAll(assert, snapshotRuntimePublish, [
    /export function scheduleCloudSyncTabsGateSnapshotTick\(/,
    /export function publishCloudSyncTabsGateSnapshot\(/,
    /equalCloudSyncSite2TabsGateSnapshots/,
  ]);

  assertMatchesAll(assert, snapshotRuntimeSubscription, [
    /export function subscribeCloudSyncTabsGateSnapshot\(/,
    /export function disposeCloudSyncTabsGateSnapshotController\(/,
  ]);

  assertMatchesAll(assert, remoteFacade, [
    /cloud_sync_tabs_gate_remote_runtime\.js/,
    /cloud_sync_tabs_gate_remote_shared\.js/,
  ]);
  assertLacksAll(assert, remoteFacade, [
    /function createCloudSyncTabsGateRemoteOps\(/,
    /function createCloudSyncTabsGatePushNow\(/,
  ]);

  assertMatchesAll(assert, remotePush, [
    /beginCloudSyncOwnedAsyncFamilyFlight/,
    /publishCloudSyncWriteActivity/,
    /resolveCloudSyncSettledRowAfterWrite/,
    /export function createCloudSyncTabsGatePushNow\(/,
  ]);

  assertMatchesAll(assert, remotePull, [
    /readCloudSyncRowWithPullActivity/,
    /resolveCloudSyncTabsGateState/,
    /export function createCloudSyncTabsGatePullOnce\(/,
  ]);

  assertMatchesAll(assert, commandFacade, [
    /cloud_sync_tabs_gate_command_shared\.js/,
    /cloud_sync_tabs_gate_command_runtime\.js/,
    /runSite2TabsGateCommand/,
  ]);
  assertLacksAll(assert, commandFacade, [
    /function runSite2TabsGateCommand\(/,
    /const site2TabsGateCommandFlights = new WeakMap/,
  ]);

  assertMatchesAll(assert, commandShared, [
    /export const SITE2_TABS_REFRESH_FLOOR_MS = 5 \* 60 \* 1000;/,
    /const site2TabsGateCommandFlights = new WeakMap/,
    /export function resolveSite2TabsGateTarget\(/,
  ]);

  assertMatchesAll(assert, commandRuntime, [
    /runCloudSyncOwnedAsyncFamilySingleFlight/,
    /resolveSite2TabsGateTarget/,
    /export function runSite2TabsGateCommand\(/,
    /export function toggleSite2TabsGateCommand\(/,
  ]);
});
