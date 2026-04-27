import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const owner = readSource('../esm/native/services/cloud_sync.ts', import.meta.url);
const runtime = readSource('../esm/native/services/cloud_sync_service_install_runtime.ts', import.meta.url);
const error = readSource('../esm/native/services/cloud_sync_service_install_error.ts', import.meta.url);

test('cloud sync service install keeps a thin facade over runtime and error seams', () => {
  assertMatchesAll(
    assert,
    owner,
    [/cloud_sync_service_install_runtime\.js/, /installCloudSyncService/],
    'cloud sync service facade'
  );

  assertLacksAll(
    assert,
    owner,
    [
      /disposePreviousCloudSyncInstall\(/,
      /createCloudSyncOwnerContext\(/,
      /createCloudSyncInstallRuntime\(/,
      /installCloudSyncOwnerLifecycle\(/,
      /ensureCloudSyncServiceState\(/,
    ],
    'cloud sync service facade'
  );

  assertMatchesAll(
    assert,
    runtime,
    [
      /disposePreviousCloudSyncInstall\(/,
      /createCloudSyncOwnerContext\(/,
      /createCloudSyncInstallRuntime\(/,
      /installCloudSyncOwnerLifecycle\(/,
      /handleCloudSyncInstallError\(/,
    ],
    'cloud sync service runtime'
  );

  assertMatchesAll(
    assert,
    error,
    [
      /ensureCloudSyncServiceState\(/,
      /canInvokeCloudSyncPublishedDispose\(/,
      /clearCloudSyncPublishedState\(/,
      /_cloudSyncReportNonFatal/,
    ],
    'cloud sync service error'
  );
});
