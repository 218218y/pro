import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const storageFacade = readSource('../esm/native/services/cloud_sync_support_storage.ts', import.meta.url);
const storageSharedOwner = readSource(
  '../esm/native/services/cloud_sync_support_storage_shared.ts',
  import.meta.url
);
const storageReadOwner = readSource(
  '../esm/native/services/cloud_sync_support_storage_read.ts',
  import.meta.url
);
const storageWriteOwner = readSource(
  '../esm/native/services/cloud_sync_support_storage_write.ts',
  import.meta.url
);

test('[cloud-sync-support-storage] facade stays thin while marker/getStorage, local reads, and remote apply live in dedicated owners', () => {
  assertMatchesAll(
    assert,
    storageFacade,
    [
      /from '\.\/cloud_sync_support_storage_shared\.js';/,
      /from '\.\/cloud_sync_support_storage_read\.js';/,
      /from '\.\/cloud_sync_support_storage_write\.js';/,
      /export \{[\s\S]*storageWithMarker,[\s\S]*restoreWrappedStorageFns,[\s\S]*rememberWrappedStorageFns,[\s\S]*getStorage,[\s\S]*\} from '\.\/cloud_sync_support_storage_shared\.js';/,
      /export \{ readLocal \} from '\.\/cloud_sync_support_storage_read\.js';/,
      /export \{ applyRemote \} from '\.\/cloud_sync_support_storage_write\.js';/,
    ],
    'storageFacade'
  );
  assertLacksAll(
    assert,
    storageFacade,
    [
      /function isStorageLike\(/,
      /export function readLocal\(/,
      /export function applyRemote\(/,
      /__wp_cloudSync_origStorageFns/,
    ],
    'storageFacade'
  );

  assertMatchesAll(
    assert,
    storageSharedOwner,
    [
      /export function isStorageLike\(/,
      /export function storageWithMarker\(/,
      /export function restoreWrappedStorageFns\(/,
      /export function rememberWrappedStorageFns\(/,
      /export function getStorage\(/,
      /export function readLocalOrderList\(/,
      /export function buildEmptyCloudSyncLocalCollections\(/,
    ],
    'storageSharedOwner'
  );

  assertMatchesAll(
    assert,
    storageReadOwner,
    [
      /export function readLocal\(/,
      /readLocalModelList\(/,
      /readLocalSavedColorsList\(/,
      /readLocalOrderList\(/,
      /buildEmptyCloudSyncLocalCollections\(/,
    ],
    'storageReadOwner'
  );

  assertMatchesAll(
    assert,
    storageWriteOwner,
    [
      /function writeRemoteCollectionsToStorage\(/,
      /export function applyRemote\(/,
      /ensureModelsLoadedViaService\(/,
      /writeSavedColors\(/,
      /writeColorSwatchesOrder\(/,
    ],
    'storageWriteOwner'
  );
});
