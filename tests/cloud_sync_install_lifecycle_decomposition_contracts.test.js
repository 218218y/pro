import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_install_lifecycle.ts', import.meta.url);
const shared = readSource('../esm/native/services/cloud_sync_install_lifecycle_shared.ts', import.meta.url);
const setup = readSource('../esm/native/services/cloud_sync_install_lifecycle_setup.ts', import.meta.url);
const runtime = readSource('../esm/native/services/cloud_sync_install_lifecycle_runtime.ts', import.meta.url);
const runtimeSetup = readSource(
  '../esm/native/services/cloud_sync_install_lifecycle_runtime_setup.ts',
  import.meta.url
);

test('cloud sync install lifecycle keeps a thin facade over shared/setup/runtime seams', () => {
  assertMatchesAll(
    assert,
    facade,
    [
      /cloud_sync_install_lifecycle_shared\.js/,
      /cloud_sync_install_lifecycle_runtime\.js/,
      /export type \{ CloudSyncInstallLifecycleArgs \}/,
      /export \{ installCloudSyncOwnerLifecycle \}/,
    ],
    'cloud sync install lifecycle facade'
  );

  assertLacksAll(
    assert,
    facade,
    [
      /createCloudSyncStorageWrap\(/,
      /createCloudSyncPullCoalescerFactory\(/,
      /runCloudSyncInitialPulls\(/,
      /createCloudSyncLifecycleOps\(/,
      /function createCloudSyncInstallLiveness\(/,
    ],
    'cloud sync install lifecycle facade'
  );

  assertMatchesAll(
    assert,
    shared,
    [
      /export type CloudSyncInstallLifecycleArgs = \{/,
      /export type CloudSyncInstallLiveness = \{/,
      /createCloudSyncInstallLiveness\(/,
      /createCloudSyncLifecycleStatusPublisher\(/,
      /createCloudSyncLifecycleHintSetter\(/,
    ],
    'cloud sync install lifecycle shared'
  );

  assertMatchesAll(
    assert,
    setup,
    [
      /createCloudSyncStorageWrap\(/,
      /createCloudSyncPullCoalescerFactory\(/,
      /createCloudSyncInstallPullRunnerMap\(/,
      /createCloudSyncPullCoalescerMap\(/,
      /cancelCloudSyncPullScopeMap\(/,
    ],
    'cloud sync install lifecycle setup'
  );

  assertMatchesAll(
    assert,
    runtime,
    [
      /cloud_sync_install_lifecycle_runtime_setup\.js/,
      /prepareCloudSyncInstallLifecycle\(/,
      /runCloudSyncInitialPulls\(/,
      /createLifecycleOps\(/,
    ],
    'cloud sync install lifecycle runtime'
  );

  assertMatchesAll(
    assert,
    runtimeSetup,
    [
      /createCloudSyncInstallLiveness\(/,
      /installCloudSyncLifecycleStorageWrap\(/,
      /createCloudSyncInstallPullCoalescers\(/,
      /createCloudSyncLifecycleStatusPublisher\(/,
      /createCloudSyncLifecycleHintSetter\(/,
      /createCloudSyncLifecycleOps\(/,
    ],
    'cloud sync install lifecycle runtime setup'
  );
});
