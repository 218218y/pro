import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const storageFacade = readSource('../esm/native/services/cloud_sync_support_storage.ts', import.meta.url);
const storageSharedOwner = readSource(
  '../esm/native/services/cloud_sync_support_storage_shared.ts',
  import.meta.url
);
const storageWriteOwner = readSource(
  '../esm/native/services/cloud_sync_support_storage_write.ts',
  import.meta.url
);

test('[cloud-sync-support-storage] facade exposes canonical storage access and remote apply owners only', () => {
  assertMatchesAll(
    assert,
    storageFacade,
    [
      /from '\.\/cloud_sync_support_storage_shared\.js';/,
      /from '\.\/cloud_sync_support_storage_write\.js';/,
      /export \{ getStorage \} from '\.\/cloud_sync_support_storage_shared\.js';/,
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
      /cloud_sync_support_storage_read/,
      /storageWithMarker/,
    ],
    'storageFacade'
  );

  assertMatchesAll(
    assert,
    storageSharedOwner,
    [/export function isStorageLike\(/, /export function getStorage\(/],
    'storageSharedOwner'
  );
  assertLacksAll(
    assert,
    storageSharedOwner,
    [/storageWithMarker/, /restoreWrappedStorageFns/, /rememberWrappedStorageFns/],
    'storageSharedOwner'
  );
  assertMatchesAll(
    assert,
    storageWriteOwner,
    [
      /export function applyRemote\(/,
      /createCloudCollectionsRepository\(/,
      /repository\.commit\(/,
      /commitResult\.mirrorFailures/,
      /ensureModelsLoadedViaService\(/,
      /writeSavedColors\(/,
      /writeColorSwatchesOrder\(/,
    ],
    'storageWriteOwner'
  );
  assertLacksAll(
    assert,
    storageWriteOwner,
    [/function writeRemoteCollectionsToStorage\(/],
    'storageWriteOwner'
  );
});
