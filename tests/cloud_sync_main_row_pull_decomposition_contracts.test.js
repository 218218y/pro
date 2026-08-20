import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';
import { getVariableFunctionSignatureFact } from './_semantic_source_contracts.js';

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
  assert.equal(
    getVariableFunctionSignatureFact(pullFacade, 'queuePullSoon', 'cloud_sync_main_row_pull.ts'),
    null,
    'thin pull facade should not own queuePullSoon'
  );
  assertLacksAll(
    assert,
    pullFacade,
    [
      /createPendingReasonState\(/,
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
      /const parkPullUntilFlightsSettle = \(delayMsRaw: number\): boolean => \{/,
      /const runPullOnce = \(isInitial: boolean\): Promise<void> => \{/,
      /const flushPendingPullAfterFlights = \(\): void => \{/,
    ],
    'pullRuntimeOwner'
  );
  assert.deepEqual(
    getVariableFunctionSignatureFact(
      pullRuntimeOwner,
      'queuePullSoon',
      'cloud_sync_main_row_pull_runtime.ts'
    ),
    {
      name: 'queuePullSoon',
      async: false,
      params: [
        { name: 'opts', optional: true, type: 'MainRowPullRequestOptions' },
        {
          name: 'rememberReason',
          optional: true,
          type: null,
          default: { kind: 'literal', value: true },
        },
      ],
      returnType: 'void',
    }
  );
});
