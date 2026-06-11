import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const owner = readSource('../esm/native/services/cloud_sync_owner_context_runtime.ts', import.meta.url);
const shared = readSource(
  '../esm/native/services/cloud_sync_owner_context_runtime_shared.ts',
  import.meta.url
);
const access = readSource(
  '../esm/native/services/cloud_sync_owner_context_runtime_access.ts',
  import.meta.url
);
const client = readSource(
  '../esm/native/services/cloud_sync_owner_context_runtime_client.ts',
  import.meta.url
);

test('cloud sync owner context runtime keeps a thin facade over shared/access/client seams', () => {
  assertMatchesAll(
    assert,
    owner,
    [
      /cloud_sync_owner_context_runtime_access\.js/,
      /cloud_sync_owner_context_runtime_client\.js/,
      /cloud_sync_owner_context_runtime_shared\.js/,
      /export \{/,
    ],
    'cloud sync owner context runtime facade'
  );

  assertLacksAll(
    assert,
    owner,
    [
      /getBrowserFetchMaybe\(/,
      /getBrowserTimers\(/,
      /getStorageServiceMaybe\(/,
      /sessionStorage/,
      /randomRoomId\(/,
    ],
    'cloud sync owner context runtime facade'
  );

  assertMatchesAll(
    assert,
    shared,
    [
      /CLOUD_SYNC_CLIENT_KEY/,
      /CLOUD_SYNC_DIAG_LS_KEY/,
      /resolveCloudSyncOwnerStorageKeys/,
      /getCloudSyncDiagStorageMaybe/,
      /getCloudSyncClipboardMaybe/,
      /getCloudSyncPromptSinkMaybe/,
    ],
    'cloud sync owner context runtime shared'
  );

  assertMatchesAll(
    assert,
    access,
    [
      /getBrowserFetchMaybe\(/,
      /getBrowserTimers\(/,
      /getStorageServiceMaybe\(/,
      /createCloudSyncOwnerRestIo/,
      /createCloudSyncOwnerTimers/,
      /resolveCloudSyncOwnerStorage/,
    ],
    'cloud sync owner context runtime access'
  );

  assertMatchesAll(
    assert,
    client,
    [/sessionStorage/, /randomRoomId\(/, /resolveCloudSyncClientId/, /CLOUD_SYNC_CLIENT_KEY/],
    'cloud sync owner context runtime client'
  );
});
