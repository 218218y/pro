import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_support_shared.ts', import.meta.url);
const core = readSource('../esm/native/services/cloud_sync_support_shared_core.ts', import.meta.url);
const payload = readSource('../esm/native/services/cloud_sync_support_payload.ts', import.meta.url);
const runtimeStatus = readSource(
  '../esm/native/services/cloud_sync_support_runtime_status.ts',
  import.meta.url
);
const serialize = readSource('../esm/native/services/cloud_sync_support_serialize.ts', import.meta.url);

test('cloud sync support shared keeps a thin facade over core/payload/runtime-status/serialize seams', () => {
  assertMatchesAll(
    assert,
    facade,
    [
      /cloud_sync_support_shared_core\.js/,
      /cloud_sync_support_payload\.js/,
      /cloud_sync_support_runtime_status\.js/,
      /cloud_sync_support_serialize\.js/,
      /export type \{ CloudSyncStableSerializeOptions \}/,
    ],
    'cloud sync support shared facade'
  );

  assertLacksAll(
    assert,
    facade,
    [
      /function asRecord\(/,
      /function readCloudSyncSketchPayloadLike\(/,
      /function cloneRuntimeStatus\(/,
      /function stableSerializeCloudSyncValue\(/,
    ],
    'cloud sync support shared facade'
  );

  assertMatchesAll(
    assert,
    core,
    [
      /function asRecord\(/,
      /function normalizeModelList\(/,
      /function readCloudSyncErrorMessage\(/,
      /function readCloudSyncJsonField\(/,
      /function safeParseJSON\(/,
    ],
    'cloud sync support shared core'
  );

  assertMatchesAll(
    assert,
    payload,
    [
      /readCloudSyncSketchPayloadLike\(/,
      /readCloudSyncSyncPinPayloadLike\(/,
      /readCloudSyncTabsGatePayloadFields\(/,
      /cloud_sync_support_shared_core\.js/,
    ],
    'cloud sync support payload'
  );

  assertMatchesAll(
    assert,
    runtimeStatus,
    [/function cloneRuntimeStatus\(/, /function buildRuntimeStatusSnapshotKey\(/],
    'cloud sync support runtime status'
  );

  assertMatchesAll(
    assert,
    serialize,
    [
      /type CloudSyncStableSerializeOptions = \{/,
      /function stableSerializeCloudSyncValue\(/,
      /function computeHash\(/,
      /function hashString32\(/,
      /function parseIsoTimeMs\(/,
      /cloud_sync_support_shared_core\.js/,
    ],
    'cloud sync support serialize'
  );
});
