import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const pullFacade = readSource('../esm/native/services/cloud_sync_main_row_pull.ts', import.meta.url);
const pullSharedOwner = readSource(
  '../esm/native/services/cloud_sync_main_row_pull_shared.ts',
  import.meta.url
);
const pullRuntimeOwner = readSource(
  '../esm/native/services/cloud_sync_main_row_pull_runtime.ts',
  import.meta.url
);

test('[cloud-sync-main-row-pull] facade stays thin while shared state/diag helpers and runtime scheduling live in dedicated owners', () => {
  assertMatchesAll(
    assert,
    pullFacade,
    [
      /from '\.\/cloud_sync_main_row_pull_shared\.js';/,
      /from '\.\/cloud_sync_main_row_pull_runtime\.js';/,
      /export\s+type\s*\{[\s\S]*CreateCloudSyncMainRowPullFlowArgs,[\s\S]*CloudSyncMainRowPullFlow,?[\s\S]*\}\s*from '\.\/cloud_sync_main_row_pull_shared\.js';/s,
      /export\s*\{[\s\S]*createCloudSyncMainRowPullFlow[\s\S]*\}\s*from '\.\/cloud_sync_main_row_pull_runtime\.js';/s,
    ],
    'pullFacade'
  );
  assertLacksAll(
    assert,
    pullFacade,
    [
      /createPendingReasonState\(/,
      /const queuePullSoon = \(opts\?: MainRowPullRequestOptions, rememberReason = true\): void => \{/,
      /const parkPullUntilFlightsSettle = \(delayMsRaw: number\): boolean => \{/,
      /diag\('mainRow\.pull:coalesced:run'/,
    ],
    'pullFacade'
  );

  assertMatchesAll(
    assert,
    pullSharedOwner,
    [
      /export function createCloudSyncMainRowPullMutableState\(/,
      /createPendingReasonState\(/,
      /export function publishCloudSyncMainRowPendingPullDiag\(/,
      /diag\('mainRow\.pull:coalesced:run'/,
      /export function rememberCloudSyncMainRowPendingPullDelayForBlocker\(/,
    ],
    'pullSharedOwner'
  );

  assertMatchesAll(
    assert,
    pullRuntimeOwner,
    [
      /export function createCloudSyncMainRowPullFlow\(/,
      /const queuePullSoon = \(opts\?: MainRowPullRequestOptions, rememberReason = true\): void => \{/,
      /const parkPullUntilFlightsSettle = \(delayMsRaw: number\): boolean => \{/,
      /const runPullOnce = \(isInitial: boolean\): Promise<void> => \{/,
      /const flushPendingPullAfterFlights = \(\): void => \{/,
    ],
    'pullRuntimeOwner'
  );
});
