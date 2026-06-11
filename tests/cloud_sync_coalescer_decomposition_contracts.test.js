import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_coalescer.ts', import.meta.url);
const shared = readSource('../esm/native/services/cloud_sync_coalescer_shared.ts', import.meta.url);
const policy = readSource('../esm/native/services/cloud_sync_coalescer_policy.ts', import.meta.url);
const diag = readSource('../esm/native/services/cloud_sync_coalescer_diag.ts', import.meta.url);
const runtime = readSource('../esm/native/services/cloud_sync_coalescer_runtime.ts', import.meta.url);
const runtimeShared = readSource(
  '../esm/native/services/cloud_sync_coalescer_runtime_shared.ts',
  import.meta.url
);
const controlsRuntime = readSource(
  '../esm/native/services/cloud_sync_coalescer_controls_runtime.ts',
  import.meta.url
);
const queueRuntime = readSource(
  '../esm/native/services/cloud_sync_coalescer_queue_runtime.ts',
  import.meta.url
);

test('cloud sync coalescer keeps a thin facade over shared/policy/diag/runtime seams', () => {
  assertMatchesAll(
    assert,
    facade,
    [
      /cloud_sync_coalescer_shared\.js/,
      /cloud_sync_coalescer_runtime\.js/,
      /export type \{[\s\S]*PullCoalescerDeps[\s\S]*CloudSyncPullCoalescer[\s\S]*\}/,
      /export \{ createCloudSyncPullCoalescer \}/,
    ],
    'cloud sync coalescer facade'
  );

  assertLacksAll(
    assert,
    facade,
    [
      /resolveQueuedDueAt\(/,
      /resolveBlockedMainPushRetryDelay\(/,
      /reportCoalescedPullDiag\(/,
      /addPendingReason\(/,
    ],
    'cloud sync coalescer facade'
  );

  assertMatchesAll(
    assert,
    shared,
    [
      /export type PullCoalescerDeps = \{/,
      /export type PullCoalescerState = \{/,
      /FALLBACK_MAIN_PUSH_RETRY_MS = 25/,
      /createPullCoalescerPolicy\(/,
      /createPullCoalescerState\(/,
      /resetPullCoalescerState\(/,
    ],
    'cloud sync coalescer shared'
  );

  assertMatchesAll(
    assert,
    policy,
    [
      /resolveBlockedMainPushRetryDelay\(/,
      /resolveQueuedDueAt\(/,
      /FALLBACK_MAIN_PUSH_RETRY_MS/,
      /state\.firstQueuedAt/,
    ],
    'cloud sync coalescer policy'
  );

  assertMatchesAll(
    assert,
    diag,
    [/reportCoalescedPullDiag\(/, /suppressedCoalescedRuns/, /pull:coalesced:run/, /reportNonFatal\(/],
    'cloud sync coalescer diag'
  );

  assertMatchesAll(
    assert,
    runtimeShared,
    [
      /export interface CloudSyncPullCoalescerRuntimeContext \{/,
      /createCloudSyncPullCoalescerRuntimeContext\(/,
      /resumeAfterMainPushSettled: \(\) => void/,
    ],
    'cloud sync coalescer runtime shared'
  );

  assertMatchesAll(
    assert,
    controlsRuntime,
    [
      /createCloudSyncPullCoalescerControls\(/,
      /resolveBlockedMainPushRetryDelay\(/,
      /resolveQueuedDueAt\(/,
      /subscribeMainPushSettled/,
    ],
    'cloud sync coalescer controls runtime'
  );

  assertMatchesAll(
    assert,
    queueRuntime,
    [
      /createCloudSyncPullCoalescerFire\(/,
      /triggerCloudSyncPullCoalescer\(/,
      /cancelCloudSyncPullCoalescer\(/,
      /reportCoalescedPullDiag\(/,
      /addPendingReason\(/,
    ],
    'cloud sync coalescer queue runtime'
  );

  assertMatchesAll(
    assert,
    runtime,
    [
      /createPullCoalescerPolicy\(/,
      /createPullCoalescerState\(/,
      /createCloudSyncPullCoalescerRuntimeContext\(/,
      /createCloudSyncPullCoalescerControls\(/,
      /createCloudSyncPullCoalescerFire\(/,
      /triggerCloudSyncPullCoalescer\(/,
      /export function createCloudSyncPullCoalescer\(/,
    ],
    'cloud sync coalescer runtime'
  );

  assertLacksAll(
    assert,
    runtime,
    [
      /resolveQueuedDueAt\(/,
      /resolveBlockedMainPushRetryDelay\(/,
      /reportCoalescedPullDiag\(/,
      /addPendingReason\(/,
    ],
    'cloud sync coalescer runtime'
  );
});
