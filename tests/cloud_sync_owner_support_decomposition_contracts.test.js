import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const ownerSupportFacade = readSource('../esm/native/services/cloud_sync_owner_support.ts', import.meta.url);
const ownerSupportSharedOwner = readSource(
  '../esm/native/services/cloud_sync_owner_support_shared.ts',
  import.meta.url
);
const ownerSupportCleanupOwner = readSource(
  '../esm/native/services/cloud_sync_owner_support_cleanup.ts',
  import.meta.url
);
const ownerSupportPullsOwner = readSource(
  '../esm/native/services/cloud_sync_owner_support_pulls.ts',
  import.meta.url
);
const ownerSupportPanelApiOwner = readSource(
  '../esm/native/services/cloud_sync_owner_support_panel_api.ts',
  import.meta.url
);

test('[cloud-sync-owner-support] facade stays thin while dedicated owners hold panel deps, cleanup disposal, and initial pull fanout', () => {
  assertMatchesAll(
    assert,
    ownerSupportFacade,
    [
      /cloud_sync_owner_support_cleanup\.js/,
      /cloud_sync_owner_support_pulls\.js/,
      /cloud_sync_owner_support_panel_api\.js/,
      /export type \{ CloudSyncOwnerCleanupStack \} from '\.\/cloud_sync_owner_support_cleanup\.js';/,
      /export \{ addCloudSyncCleanup, disposeCloudSyncOwnerCleanup \} from '\.\/cloud_sync_owner_support_cleanup\.js';/,
      /export \{ runCloudSyncInitialPulls \} from '\.\/cloud_sync_owner_support_pulls\.js';/,
      /export \{ installCloudSyncPanelApi \} from '\.\/cloud_sync_owner_support_panel_api\.js';/,
    ],
    'ownerSupportFacade'
  );
  assertLacksAll(
    assert,
    ownerSupportFacade,
    [
      /function buildCloudSyncPanelApiDeps\(/,
      /function addCloudSyncCleanup\(/,
      /async function runCloudSyncInitialPulls\(/,
      /function disposeCloudSyncOwnerCleanup\(/,
      /function installCloudSyncPanelApi\(/,
    ],
    'ownerSupportFacade'
  );

  assertMatchesAll(
    assert,
    ownerSupportSharedOwner,
    [
      /export type CloudSyncPanelApiInstallDeps = Pick</,
      /export type CloudSyncOwnerCleanupStack = Array<\(\) => void>/,
      /export function buildCloudSyncPanelApiDeps\(/,
      /reportNonFatal: _cloudSyncReportNonFatal/,
      /export function reportCloudSyncOwnerSupportError\(/,
    ],
    'ownerSupportSharedOwner'
  );

  assertMatchesAll(
    assert,
    ownerSupportCleanupOwner,
    [
      /export function addCloudSyncCleanup\(/,
      /export function disposeCloudSyncOwnerCleanup\(/,
      /disposedRef\.v = true;/,
      /cleanup\.length = 0;/,
      /reportCloudSyncOwnerSupportError\(App, 'services\/cloud_sync\.cleanupItem'/,
    ],
    'ownerSupportCleanupOwner'
  );

  assertMatchesAll(
    assert,
    ownerSupportPullsOwner,
    [
      /export async function runCloudSyncInitialPulls\(/,
      /const canContinue = \(\): boolean => \(typeof shouldContinue === 'function' \? shouldContinue\(\) : true\);/,
      /await pullMainOnce\(true\);/,
      /await pullFloatingSketchSyncPinnedOnce\(true\);/,
    ],
    'ownerSupportPullsOwner'
  );

  assertMatchesAll(
    assert,
    ownerSupportPanelApiOwner,
    [
      /ensureCloudSyncServiceState/,
      /createCloudSyncPanelApi/,
      /installCloudSyncPanelApiSurface/,
      /buildCloudSyncPanelApiDeps/,
      /export function installCloudSyncPanelApi\(/,
    ],
    'ownerSupportPanelApiOwner'
  );
});
