import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const publicationFacade = readSource(
  '../esm/native/services/cloud_sync_install_support_publication.ts',
  import.meta.url
);
const publicationSharedFacade = readSource(
  '../esm/native/services/cloud_sync_install_support_publication_shared.ts',
  import.meta.url
);
const publicationCleanupOwner = readSource(
  '../esm/native/services/cloud_sync_install_support_publication_cleanup_shared.ts',
  import.meta.url
);
const publicationPreservationOwner = readSource(
  '../esm/native/services/cloud_sync_install_support_publication_preservation_shared.ts',
  import.meta.url
);
const publicationRuntimeOwner = readSource(
  '../esm/native/services/cloud_sync_install_support_publication_runtime.ts',
  import.meta.url
);

test('[cloud-sync-install-support-publication] facade stays thin while cleanup and preservation policy live on dedicated owners', () => {
  assertMatchesAll(
    assert,
    publicationFacade,
    [
      /cloud_sync_install_support_publication_runtime\.js/,
      /export \{\s*clearCloudSyncPublishedState,\s*disposePreviousCloudSyncInstall,\s*publishCloudSyncDispose,?/,
    ],
    'publicationFacade'
  );
  assertLacksAll(
    assert,
    publicationFacade,
    [
      /function deactivateCloudSyncPublishedSlots\(/,
      /function clearCloudSyncPublishedSlots\(/,
      /function restoreCloudSyncPublishedPreservedState\(/,
      /export function clearCloudSyncPublishedState\(/,
    ],
    'publicationFacade'
  );

  assertMatchesAll(
    assert,
    publicationSharedFacade,
    [
      /cloud_sync_install_support_publication_cleanup_shared\.js/,
      /cloud_sync_install_support_publication_preservation_shared\.js/,
      /clearCloudSyncPublishedSlots/,
      /restoreCloudSyncPublishedPreservedState/,
    ],
    'publicationSharedFacade'
  );
  assertLacksAll(
    assert,
    publicationSharedFacade,
    [
      /const CLOUD_SYNC_PUBLISHED_DEACTIVATION_SPECS:/,
      /function deactivateCloudSyncPublishedSlots\(/,
      /const CLOUD_SYNC_PUBLISHED_PRESERVATION_SPECS:/,
      /function readCloudSyncPublishedPreservedState\(/,
    ],
    'publicationSharedFacade'
  );

  assertMatchesAll(
    assert,
    publicationCleanupOwner,
    [
      /const CLOUD_SYNC_PUBLISHED_DEACTIVATION_SPECS:/,
      /function deactivateCloudSyncPublishedSlots\(/,
      /export function clearCloudSyncPublishedSlots\(/,
      /cloud_sync_install_support_publication_preservation_shared\.js/,
    ],
    'publicationCleanupOwner'
  );
  assertLacksAll(
    assert,
    publicationCleanupOwner,
    [
      /const CLOUD_SYNC_PUBLISHED_PRESERVATION_SPECS:/,
      /export function restoreCloudSyncPublishedPreservedState\(/,
    ],
    'publicationCleanupOwner'
  );

  assertMatchesAll(
    assert,
    publicationPreservationOwner,
    [
      /const CLOUD_SYNC_PUBLISHED_PRESERVABLE_ORDER = /,
      /const CLOUD_SYNC_PUBLISHED_PRESERVATION_SPECS:/,
      /export function readCloudSyncPublishedPreservedState\(/,
      /export function restoreCloudSyncPublishedPreservedState\(/,
    ],
    'publicationPreservationOwner'
  );
  assertLacksAll(
    assert,
    publicationPreservationOwner,
    [/const CLOUD_SYNC_PUBLISHED_DEACTIVATION_SPECS:/, /export function clearCloudSyncPublishedSlots\(/],
    'publicationPreservationOwner'
  );

  assertMatchesAll(
    assert,
    publicationRuntimeOwner,
    [
      /from '\.\/cloud_sync_install_support_publication_shared\.js';/,
      /export function clearCloudSyncPublishedState\(/,
      /export function disposePreviousCloudSyncInstall\(/,
      /export function publishCloudSyncDispose\(/,
    ],
    'publicationRuntimeOwner'
  );
  assertLacksAll(
    assert,
    publicationRuntimeOwner,
    [
      /const CLOUD_SYNC_PUBLISHED_DEACTIVATION_SPECS:/,
      /const CLOUD_SYNC_PUBLISHED_PRESERVATION_SPECS:/,
      /function deactivateCloudSyncPublishedSlots\(/,
      /function readCloudSyncPublishedPreservedState\(/,
    ],
    'publicationRuntimeOwner'
  );
});
