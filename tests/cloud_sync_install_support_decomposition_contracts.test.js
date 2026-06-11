import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const installSupportFacade = readSource(
  '../esm/native/services/cloud_sync_install_support.ts',
  import.meta.url
);
const installSupportSharedOwner = readSource(
  '../esm/native/services/cloud_sync_install_support_shared.ts',
  import.meta.url
);
const installSupportPublicationOwner = readSource(
  '../esm/native/services/cloud_sync_install_support_publication.ts',
  import.meta.url
);
const installSupportCoalescerOwner = readSource(
  '../esm/native/services/cloud_sync_install_support_coalescer.ts',
  import.meta.url
);

test('[cloud-sync-install-support] facade stays thin while dedicated owners hold epoch policy, publication cleanup, and pull coalescer wiring', () => {
  assertMatchesAll(
    assert,
    installSupportFacade,
    [
      /cloud_sync_install_support_shared\.js/,
      /cloud_sync_install_support_publication\.js/,
      /cloud_sync_install_support_coalescer\.js/,
      /export \{\s*reserveCloudSyncPublicationEpoch,\s*invalidateCloudSyncPublicationEpoch,\s*isCloudSyncPublicationEpochCurrent,\s*canInvokeCloudSyncPublishedDispose,?/,
      /export \{\s*clearCloudSyncPublishedState,\s*disposePreviousCloudSyncInstall,\s*publishCloudSyncDispose,?/,
      /export \{ createCloudSyncPullCoalescerFactory \}/,
    ],
    'installSupportFacade'
  );
  assertLacksAll(
    assert,
    installSupportFacade,
    [
      /function readCloudSyncPublicationEpoch\(/,
      /function deactivateCloudSyncPublishedSlots\(/,
      /function readCloudSyncPublishedPreservedState\(/,
      /function clearCloudSyncPublishedSlots\(/,
      /createCloudSyncPullCoalescer\(/,
    ],
    'installSupportFacade'
  );

  assertMatchesAll(
    assert,
    installSupportSharedOwner,
    [
      /export function readCloudSyncPublicationEpoch\(/,
      /export function reserveCloudSyncPublicationEpoch\(/,
      /export function invalidateCloudSyncPublicationEpoch\(/,
      /export function canInvokeCloudSyncPublishedDispose\(/,
      /export function readCloudSyncDisposePublicationEpoch\(/,
    ],
    'installSupportSharedOwner'
  );

  assertMatchesAll(
    assert,
    installSupportPublicationOwner,
    [
      /cloud_sync_install_support_publication_runtime\.js/,
      /export \{\s*clearCloudSyncPublishedState,\s*disposePreviousCloudSyncInstall,\s*publishCloudSyncDispose,?/,
    ],
    'installSupportPublicationOwner'
  );
  assertLacksAll(
    assert,
    installSupportPublicationOwner,
    [
      /const CLOUD_SYNC_PUBLISHED_DEACTIVATION_SPECS:/,
      /function deactivateCloudSyncPublishedSlots\(/,
      /function readCloudSyncPublishedPreservedState\(/,
      /export function clearCloudSyncPublishedState\(/,
    ],
    'installSupportPublicationOwner'
  );

  assertMatchesAll(
    assert,
    installSupportCoalescerOwner,
    [
      /createCloudSyncPullCoalescer\(/,
      /export function createCloudSyncPullCoalescerFactory\(/,
      /reportNonFatal: \(op: string, error: unknown\) =>/,
    ],
    'installSupportCoalescerOwner'
  );
});
