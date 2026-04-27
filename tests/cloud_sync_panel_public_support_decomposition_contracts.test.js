import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const statusFacade = readSource('../esm/native/services/cloud_sync_status_install.ts', import.meta.url);
const statusShared = readSource(
  '../esm/native/services/cloud_sync_status_install_shared.ts',
  import.meta.url
);
const statusRuntime = readSource(
  '../esm/native/services/cloud_sync_status_install_runtime.ts',
  import.meta.url
);
const statusSyncRuntime = readSource(
  '../esm/native/services/cloud_sync_status_install_sync_runtime.ts',
  import.meta.url
);
const statusFreshnessRuntime = readSource(
  '../esm/native/services/cloud_sync_status_install_freshness_runtime.ts',
  import.meta.url
);
const publicFacade = readSource(
  '../esm/native/services/cloud_sync_panel_api_public_support.ts',
  import.meta.url
);
const publicShared = readSource(
  '../esm/native/services/cloud_sync_panel_api_public_support_shared.ts',
  import.meta.url
);
const publicRuntime = readSource(
  '../esm/native/services/cloud_sync_panel_api_public_support_runtime.ts',
  import.meta.url
);
const supportFacade = readSource('../esm/native/services/cloud_sync_panel_api_support.ts', import.meta.url);
const supportShared = readSource(
  '../esm/native/services/cloud_sync_panel_api_support_shared.ts',
  import.meta.url
);
const supportSnapshots = readSource(
  '../esm/native/services/cloud_sync_panel_api_support_snapshots.ts',
  import.meta.url
);

test('cloud sync panel/public/status support keeps thin facades over focused seams', () => {
  assertMatchesAll(assert, statusFacade, [
    /cloud_sync_status_install_runtime\.js/,
    /deactivateCloudSyncStatusSurface/,
    /installCloudSyncStatusSurface/,
    /isCloudSyncStatusSurfaceFresh/,
  ]);
  assertLacksAll(assert, statusFacade, [
    /defineStatusMeta\(/,
    /syncRuntimeStatusInPlace\(/,
    /branchesEqual\(/,
  ]);

  assertMatchesAll(assert, statusShared, [
    /export type InstallableCloudSyncRuntimeStatus = CloudSyncRuntimeStatus & \{/,
    /export const CLOUD_SYNC_STATUS_INSTALLED_KEY = '__wpCloudSyncStatusInstalled';/,
    /defineStatusMeta\(/,
    /cloneCanonicalCloudSyncRuntimeStatus\(/,
    /branchesEqual\(/,
  ]);
  assertMatchesAll(assert, statusRuntime, [
    /cloud_sync_status_install_sync_runtime\.js/,
    /cloud_sync_status_install_freshness_runtime\.js/,
    /deactivateCloudSyncStatusSurface\(/,
    /installCloudSyncStatusSurface\(/,
    /export \{ isCloudSyncStatusSurfaceFresh \}/,
  ]);
  assertLacksAll(assert, statusRuntime, [
    /function syncRuntimeStatusInPlace\(/,
    /function isCloudSyncStatusSurfaceFresh\(/,
    /branchesEqual\(/,
  ]);

  assertMatchesAll(assert, statusSyncRuntime, [
    /export function syncRuntimeStatusInPlace\(/,
    /defineStatusMeta\(/,
    /syncBranchInPlace\(/,
  ]);
  assertLacksAll(assert, statusSyncRuntime, [
    /export function isCloudSyncStatusSurfaceFresh\(/,
    /branchesEqual\(/,
  ]);

  assertMatchesAll(assert, statusFreshnessRuntime, [
    /export function isCloudSyncStatusSurfaceFresh\(/,
    /branchesEqual\(/,
    /hasHiddenStatusMeta\(/,
  ]);
  assertLacksAll(assert, statusFreshnessRuntime, [
    /export function syncRuntimeStatusInPlace\(/,
    /defineStatusMeta\(/,
  ]);

  assertMatchesAll(assert, publicFacade, [
    /cloud_sync_panel_api_public_support_shared\.js/,
    /cloud_sync_panel_api_public_support_runtime\.js/,
    /cloneCloudSyncPublicRuntimeStatus/,
    /getUnavailableCloudSyncRuntimeStatus/,
  ]);
  assertLacksAll(assert, publicFacade, [/function asRecord\(/, /cloneRuntimeStatus\(/]);

  assertMatchesAll(assert, publicShared, [
    /asCloudSyncPublicRecord\(/,
    /cloneCloudSyncPanelSnapshot\(/,
    /cloneCloudSyncPublicPanelSnapshot\(/,
    /getUnavailableCloudSyncRuntimeStatus\(/,
  ]);
  assertMatchesAll(assert, publicRuntime, [/cloneRuntimeStatus\(/, /cloneCloudSyncPublicRuntimeStatus\(/]);

  assertMatchesAll(assert, supportFacade, [
    /cloud_sync_panel_api_support_shared\.js/,
    /cloud_sync_panel_api_support_snapshots\.js/,
    /buildCloudSyncPanelApiOp/,
    /areCloudSyncPanelSnapshotsEqual/,
  ]);
  assertLacksAll(assert, supportFacade, [
    /function areCloudSyncRoomStatusSnapshotsEqual\(/,
    /function getCloudSyncDiagStorageMaybe\(/,
  ]);

  assertMatchesAll(assert, supportShared, [
    /export const CLOUD_SYNC_DIAG_LS_KEY = 'WP_CLOUDSYNC_DIAG';/,
    /getCloudSyncDiagStorageMaybe\(/,
    /getCloudSyncClipboardMaybe\(/,
    /createCloudSyncAsyncFamilySingleFlightRunner/,
  ]);
  assertMatchesAll(assert, supportSnapshots, [
    /function areCloudSyncRoomStatusSnapshotsEqual\(/,
    /areCloudSyncPanelSnapshotsEqual\(/,
    /areCloudSyncSite2TabsGateSnapshotsEqual\(/,
  ]);
});
