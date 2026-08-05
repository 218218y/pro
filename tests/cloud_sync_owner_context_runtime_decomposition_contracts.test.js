import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

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

test('cloud sync owner context runtime keeps shared, access, and client responsibilities in focused owners', () => {
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
      /createCloudSyncOwnerGatewayIo/,
      /createCloudSyncOwnerTimers/,
      /resolveCloudSyncOwnerStorage/,
    ],
    'cloud sync owner context runtime access'
  );

  assertMatchesAll(
    assert,
    client,
    [/sessionStorage/, /randomCloudSyncIdSegment\(/, /resolveCloudSyncClientId/, /CLOUD_SYNC_CLIENT_KEY/],
    'cloud sync owner context runtime client'
  );

  assertLacksAll(
    assert,
    shared,
    [/getBrowserFetchMaybe\(/, /getBrowserTimers\(/, /getStorageServiceMaybe\(/, /sessionStorage/],
    'cloud sync owner context runtime shared'
  );
  assertLacksAll(
    assert,
    access,
    [/sessionStorage/, /randomCloudSyncIdSegment\(/],
    'cloud sync owner context runtime access'
  );
});
