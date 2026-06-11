import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_main_row_remote.ts', import.meta.url);
const sharedOwner = readSource(
  '../esm/native/services/cloud_sync_main_row_remote_shared.ts',
  import.meta.url
);
const pushOwner = readSource('../esm/native/services/cloud_sync_main_row_remote_push.ts', import.meta.url);
const pullOwner = readSource('../esm/native/services/cloud_sync_main_row_remote_pull.ts', import.meta.url);
const runtimeOwner = readSource(
  '../esm/native/services/cloud_sync_main_row_remote_runtime.ts',
  import.meta.url
);

test('[cloud-sync-main-row-remote] facade stays thin while shared, push, and pull owners hold remote flow logic', () => {
  assertMatchesAll(
    assert,
    facade,
    [
      /export type \{[\s\S]*CreateCloudSyncMainRowRemoteOpsArgs,[\s\S]*CloudSyncMainRowRemoteOps,[\s\S]*\} from '\.\/cloud_sync_main_row_remote_shared\.js';/,
      /export \{ createCloudSyncMainRowRemoteOps \} from '\.\/cloud_sync_main_row_remote_runtime\.js';/,
    ],
    'mainRowRemoteFacade'
  );
  assertLacksAll(
    assert,
    facade,
    [
      /function shouldSkipCloudSyncMainRowPush\(/,
      /function settleCloudSyncMainRowWrite\(/,
      /createCloudSyncAsyncSingleFlightRunner/,
      /readCloudSyncRowWithPullActivity/,
      /const pushNow = /,
      /const pullOnce = /,
    ],
    'mainRowRemoteFacade'
  );

  assertMatchesAll(
    assert,
    sharedOwner,
    [
      /export type CreateCloudSyncMainRowRemoteOpsArgs = \{/,
      /export type CloudSyncMainRowRemoteOps = \{/,
      /export function shouldSkipCloudSyncMainRowPush\(/,
      /export function settleCloudSyncMainRowWrite\(/,
    ],
    'mainRowRemoteSharedOwner'
  );

  assertMatchesAll(
    assert,
    pushOwner,
    [
      /export function createCloudSyncMainRowPushNow\(/,
      /const runPushFlight = createCloudSyncAsyncSingleFlightRunner\(\);/,
      /state\.runMainWriteFlight\(/,
      /writeCloudSyncMainRowPayload\(/,
      /settleCloudSyncMainRowWrite\(/,
    ],
    'mainRowRemotePushOwner'
  );

  assertMatchesAll(
    assert,
    pullOwner,
    [
      /export function createCloudSyncMainRowPullOnce\(/,
      /readCloudSyncRowWithPullActivity\(/,
      /if \(!row\) \{/,
      /if \(!state\.getLastSeenUpdatedAt\(\)\) \{/,
      /if \(updatedAt && updatedAt !== state\.getLastSeenUpdatedAt\(\)\) \{/,
    ],
    'mainRowRemotePullOwner'
  );

  assertMatchesAll(
    assert,
    runtimeOwner,
    [
      /export function createCloudSyncMainRowRemoteOps\(/,
      /pushNow: createCloudSyncMainRowPushNow\(args\),/,
      /pullOnce: createCloudSyncMainRowPullOnce\(args\),/,
    ],
    'mainRowRemoteRuntimeOwner'
  );
});
