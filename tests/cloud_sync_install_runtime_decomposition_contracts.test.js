import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_install_runtime.ts', import.meta.url);
const shared = readSource('../esm/native/services/cloud_sync_install_runtime_shared.ts', import.meta.url);
const ops = readSource('../esm/native/services/cloud_sync_install_runtime_ops.ts', import.meta.url);
const panel = readSource('../esm/native/services/cloud_sync_install_runtime_panel.ts', import.meta.url);
const create = readSource('../esm/native/services/cloud_sync_install_runtime_create.ts', import.meta.url);

test('cloud sync install runtime keeps a thin facade over shared/ops/panel/create seams', () => {
  assertMatchesAll(
    assert,
    facade,
    [
      /cloud_sync_install_runtime_shared\.js/,
      /cloud_sync_install_runtime_create\.js/,
      /export type \{[\s\S]*CloudSyncInstallRuntimeArgs[\s\S]*CloudSyncInstallRuntime[\s\S]*\}/,
      /export \{ createCloudSyncInstallRuntime \}/,
    ],
    'cloud sync install runtime facade'
  );

  assertLacksAll(
    assert,
    facade,
    [
      /createCloudSyncTabsGateOps\(/,
      /createCloudSyncSketchOps\(/,
      /createCloudSyncMainRowOps\(/,
      /createCloudSyncDeleteTempOps\(/,
      /installCloudSyncPanelApi\(/,
    ],
    'cloud sync install runtime facade'
  );

  assertMatchesAll(
    assert,
    shared,
    [
      /export type CloudSyncHintSender = CloudSyncRealtimeHintSender \| null;/,
      /export type CloudSyncInstallRuntimeArgs = \{/,
      /export type CloudSyncInstallRuntime = \{/,
      /createCloudSyncRealtimeHintEmitter\(/,
    ],
    'cloud sync install runtime shared'
  );

  assertMatchesAll(
    assert,
    ops,
    [
      /createCloudSyncTabsGateOps\(/,
      /createCloudSyncSketchOps\(/,
      /createCloudSyncMainRowOps\(/,
      /createCloudSyncDeleteTempOps\(/,
      /createCloudSyncRealtimeHintEmitter\(/,
    ],
    'cloud sync install runtime ops'
  );

  assertMatchesAll(
    assert,
    panel,
    [
      /installCloudSyncPanelApi\(/,
      /cloneRuntimeStatus/,
      /setRoomInUrlInBrowser/,
      /randomRoomId/,
      /subscribeFloatingSketchSyncEnabledState/,
    ],
    'cloud sync install runtime panel'
  );

  assertMatchesAll(
    assert,
    create,
    [/createCloudSyncInstallRuntimeOps\(/, /installCloudSyncInstallRuntimePanelApi\(/, /return runtime;/],
    'cloud sync install runtime create'
  );
});
