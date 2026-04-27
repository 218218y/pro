import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const mainRowFacade = readSource('../esm/native/services/cloud_sync_main_row.ts', import.meta.url);
const mainRowSharedOwner = readSource(
  '../esm/native/services/cloud_sync_main_row_shared.ts',
  import.meta.url
);
const mainRowPullOwner = readSource('../esm/native/services/cloud_sync_main_row_pull.ts', import.meta.url);
const mainRowPullSharedOwner = readSource(
  '../esm/native/services/cloud_sync_main_row_pull_shared.ts',
  import.meta.url
);
const mainRowPullRuntimeOwner = readSource(
  '../esm/native/services/cloud_sync_main_row_pull_runtime.ts',
  import.meta.url
);
const mainRowPushOwner = readSource('../esm/native/services/cloud_sync_main_row_push.ts', import.meta.url);
const mainRowPushSharedOwner = readSource(
  '../esm/native/services/cloud_sync_main_row_push_shared.ts',
  import.meta.url
);
const mainRowPushRuntimeOwner = readSource(
  '../esm/native/services/cloud_sync_main_row_push_runtime.ts',
  import.meta.url
);

test('[cloud-sync-main-row] facade stays thin while dedicated owners hold mutable state, pull scheduling, and push settlement flow', () => {
  assertMatchesAll(
    assert,
    mainRowFacade,
    [
      /from '\.\/cloud_sync_main_row_shared\.js';/,
      /from '\.\/cloud_sync_main_row_pull\.js';/,
      /from '\.\/cloud_sync_main_row_push\.js';/,
      /export type \{ CloudSyncMainRowOps, CreateCloudSyncMainRowOpsArgs \} from '\.\/cloud_sync_main_row_shared\.js';/,
      /export function createCloudSyncMainRowOps\(/,
    ],
    'mainRowFacade'
  );
  assertLacksAll(
    assert,
    mainRowFacade,
    [
      /const MAIN_ROW_PULL_SCOPE_LABEL = 'main';/,
      /function normalizeMainRowPullRequest\(/,
      /function createCloudSyncMainRowMutableState\(/,
      /function createCloudSyncMainRowPullFlow\(/,
      /function createCloudSyncMainRowPushFlow\(/,
      /const pushSettledListeners = new Set/,
      /const pendingPullReasons = createPendingReasonState\(\)/,
    ],
    'mainRowFacade'
  );

  assertMatchesAll(
    assert,
    mainRowSharedOwner,
    [
      /export const MAIN_ROW_PULL_SCOPE_LABEL = 'main';/,
      /export function normalizeMainRowPullRequest\(/,
      /export function createCloudSyncMainRowMutableState\(/,
      /const mainWriteFlight = createCloudSyncMainWriteSingleFlight/,
    ],
    'mainRowSharedOwner'
  );
  assertMatchesAll(
    assert,
    mainRowPullOwner,
    [
      /from '\.\/cloud_sync_main_row_pull_shared\.js';/,
      /from '\.\/cloud_sync_main_row_pull_runtime\.js';/,
      /export\s+type\s*\{[\s\S]*CreateCloudSyncMainRowPullFlowArgs,[\s\S]*CloudSyncMainRowPullFlow,?[\s\S]*\}\s*from '\.\/cloud_sync_main_row_pull_shared\.js';/s,
      /export\s*\{[\s\S]*createCloudSyncMainRowPullFlow[\s\S]*\}\s*from '\.\/cloud_sync_main_row_pull_runtime\.js';/s,
    ],
    'mainRowPullOwner'
  );
  assertMatchesAll(
    assert,
    mainRowPullSharedOwner,
    [
      /export function createCloudSyncMainRowPullMutableState\(/,
      /createPendingReasonState\(/,
      /export function publishCloudSyncMainRowPendingPullDiag\(/,
      /export function rememberCloudSyncMainRowPendingPullDelayForBlocker\(/,
    ],
    'mainRowPullSharedOwner'
  );
  assertMatchesAll(
    assert,
    mainRowPullRuntimeOwner,
    [
      /export function createCloudSyncMainRowPullFlow\(/,
      /const queuePullSoon = \(opts\?: MainRowPullRequestOptions, rememberReason = true\): void => \{/,
      /const parkPullUntilFlightsSettle = \(delayMsRaw: number\): boolean => \{/,
      /const runPullOnce = \(isInitial: boolean\): Promise<void> => \{/,
      /const flushPendingPullAfterFlights = \(\): void => \{/,
    ],
    'mainRowPullRuntimeOwner'
  );
  assertMatchesAll(
    assert,
    mainRowPushOwner,
    [
      /from '\.\/cloud_sync_main_row_push_shared\.js';/,
      /from '\.\/cloud_sync_main_row_push_runtime\.js';/,
      /export\s+type\s*\{[\s\S]*CreateCloudSyncMainRowPushFlowArgs,[\s\S]*CloudSyncMainRowPushFlow,?[\s\S]*\}\s*from '\.\/cloud_sync_main_row_push_shared\.js';/s,
      /export\s*\{[\s\S]*createCloudSyncMainRowPushFlow[\s\S]*\}\s*from '\.\/cloud_sync_main_row_push_runtime\.js';/s,
    ],
    'mainRowPushOwner'
  );
  assertMatchesAll(
    assert,
    mainRowPushSharedOwner,
    [
      /export type CreateCloudSyncMainRowPushFlowArgs = \{/,
      /export type CloudSyncMainRowPushMutableState = \{/,
      /pushSettledListeners: Set<\(\) => void>;/,
      /export function createCloudSyncMainRowPushMutableState\(\)/,
      /export function clearCloudSyncMainRowPendingPush\(/,
      /export function requestCloudSyncMainRowPendingPushAfterFlights\(/,
    ],
    'mainRowPushSharedOwner'
  );
  assertMatchesAll(
    assert,
    mainRowPushRuntimeOwner,
    [
      /export function createCloudSyncMainRowPushFlow\(/,
      /const state = createCloudSyncMainRowPushMutableState\(\);/,
      /const requestPendingPushAfterFlights = \(\): void => \{/,
      /const notifyPushSettled = \(\): void => \{/,
      /_cloudSyncReportNonFatal\(args\.App, 'cloudSyncMainRow\.pushSettled'/,
    ],
    'mainRowPushRuntimeOwner'
  );
});
