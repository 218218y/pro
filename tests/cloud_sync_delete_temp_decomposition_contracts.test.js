import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_delete_temp.ts', import.meta.url);
const shared = readSource('../esm/native/services/cloud_sync_delete_temp_shared.ts', import.meta.url);
const write = readSource('../esm/native/services/cloud_sync_delete_temp_write.ts', import.meta.url);
const runtime = readSource('../esm/native/services/cloud_sync_delete_temp_runtime.ts', import.meta.url);

test('cloud sync delete-temp keeps a thin facade over shared/write/runtime seams', () => {
  assertMatchesAll(assert, facade, [
    /cloud_sync_delete_temp_shared\.js/,
    /cloud_sync_delete_temp_write\.js/,
    /cloud_sync_delete_temp_runtime\.js/,
    /export \{ createCloudSyncDeleteTempOps \}/,
  ]);

  assertLacksAll(assert, facade, [
    /function deleteTemporaryItemsInCloud\(/,
    /function readDeleteTempCollections\(/,
    /function filterTemporaryModels\(/,
    /writeCloudSyncMainRowPayload\(/,
  ]);

  assertMatchesAll(assert, shared, [
    /export type DeleteTempArgs = \{/,
    /export type DeleteTempCollections = \{/,
    /buildDeleteTempOp\(/,
    /readDeleteTempCollections\(/,
    /resolveDeleteTempPayload\(/,
    /normalizeModelList\(/,
    /normalizeSavedColorsList\(/,
  ]);

  assertMatchesAll(assert, write, [
    /writeCloudSyncMainRowPayload\(/,
    /applyRemote\(/,
    /readLocal\(/,
    /computeHash\(/,
    /export async function writeDeleteTempPayloadAndApplyLocally\(/,
  ]);

  assertMatchesAll(assert, runtime, [
    /readCloudSyncRowWithPullActivity\(/,
    /resolveDeleteTempPayload\(/,
    /writeDeleteTempPayloadAndApplyLocally\(/,
    /export function createCloudSyncDeleteTempOps\(/,
  ]);
});
