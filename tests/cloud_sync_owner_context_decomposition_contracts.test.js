import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const owner = readSource('../esm/native/services/cloud_sync_owner_context.ts', import.meta.url);
const shared = readSource('../esm/native/services/cloud_sync_owner_context_shared.ts', import.meta.url);
const create = readSource('../esm/native/services/cloud_sync_owner_context_create.ts', import.meta.url);

test('cloud sync owner context keeps a thin public facade over shared/create seams', () => {
  assertMatchesAll(
    assert,
    owner,
    [
      /cloud_sync_owner_context_shared\.js/,
      /cloud_sync_owner_context_create\.js/,
      /export \{ createCloudSyncOwnerContext \}/,
      /export type \{/,
    ],
    'cloud sync owner context facade'
  );

  assertLacksAll(
    assert,
    owner,
    [
      /readCfg\(/,
      /buildRestUrl\(/,
      /createCloudSyncOwnerRooms\(/,
      /createCloudSyncOwnerStatusRuntime\(/,
      /reserveCloudSyncPublicationEpoch\(/,
    ],
    'cloud sync owner context facade'
  );

  assertMatchesAll(
    assert,
    shared,
    [
      /export type CloudSyncOwnerContext = \{/,
      /getCloudSyncDiagStorageMaybe/,
      /getCloudSyncClipboardMaybe/,
      /getCloudSyncPromptSinkMaybe/,
    ],
    'cloud sync owner context shared'
  );

  assertMatchesAll(
    assert,
    create,
    [
      /readCfg\(/,
      /buildRestUrl\(/,
      /createCloudSyncOwnerRooms\(/,
      /createCloudSyncOwnerStatusRuntime\(/,
      /reserveCloudSyncPublicationEpoch\(/,
    ],
    'cloud sync owner context create'
  );
});
