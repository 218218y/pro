import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCloudSyncAttentionPullMutableState,
  requestCloudSyncAttentionPull,
  shouldRequestCloudSyncAttentionVisibilityPull,
} from '../esm/native/services/cloud_sync_lifecycle_attention_pulls_runtime.js';

test('cloud sync attention pull runtime enforces boot grace and cooldown before accepting a pull', () => {
  const pullCalls: Array<Record<string, unknown>> = [];
  const state = createCloudSyncAttentionPullMutableState(10_000);

  const baseArgs = {
    App: {} as any,
    runtimeStatus: { realtime: { state: 'disconnected' } } as any,
    suppressRef: { v: false },
    pullAllNow: (opts?: Record<string, unknown>) => {
      pullCalls.push(opts || {});
    },
    state,
  };

  assert.equal(requestCloudSyncAttentionPull({ ...baseArgs, reason: 'focus', now: 12_000 }), false);
  assert.equal(requestCloudSyncAttentionPull({ ...baseArgs, reason: 'focus', now: 16_000 }), true);
  assert.equal(requestCloudSyncAttentionPull({ ...baseArgs, reason: 'focus', now: 20_000 }), false);
  assert.equal(requestCloudSyncAttentionPull({ ...baseArgs, reason: 'focus', now: 31_500 }), true);

  assert.deepEqual(pullCalls, [
    { includeControls: false, reason: 'attention:focus', minRecentPullGapMs: 8000 },
    { includeControls: false, reason: 'attention:focus', minRecentPullGapMs: 8000 },
  ]);
});

test('cloud sync attention visibility runtime only requests a pull after a meaningful hidden gap', () => {
  const state = createCloudSyncAttentionPullMutableState(10_000);

  assert.equal(
    shouldRequestCloudSyncAttentionVisibilityPull({ state, visibilityState: 'hidden', now: 12_000 }),
    false
  );
  assert.equal(
    shouldRequestCloudSyncAttentionVisibilityPull({ state, visibilityState: 'visible', now: 15_000 }),
    false
  );

  assert.equal(
    shouldRequestCloudSyncAttentionVisibilityPull({ state, visibilityState: 'hidden', now: 20_000 }),
    false
  );
  assert.equal(
    shouldRequestCloudSyncAttentionVisibilityPull({ state, visibilityState: 'visible', now: 26_500 }),
    true
  );
});
