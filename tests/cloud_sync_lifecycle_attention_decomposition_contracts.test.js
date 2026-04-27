import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_lifecycle_attention.ts', import.meta.url);
const shared = readSource('../esm/native/services/cloud_sync_lifecycle_attention_shared.ts', import.meta.url);
const diag = readSource('../esm/native/services/cloud_sync_lifecycle_attention_diag.ts', import.meta.url);
const pulls = readSource('../esm/native/services/cloud_sync_lifecycle_attention_pulls.ts', import.meta.url);
const pullsRuntime = readSource(
  '../esm/native/services/cloud_sync_lifecycle_attention_pulls_runtime.ts',
  import.meta.url
);
const pullsHandlers = readSource(
  '../esm/native/services/cloud_sync_lifecycle_attention_pulls_handlers.ts',
  import.meta.url
);

test('cloud sync lifecycle attention keeps diag and attention bindings on focused seams', () => {
  assertMatchesAll(assert, facade, [
    /cloud_sync_lifecycle_attention_shared\.js/,
    /cloud_sync_lifecycle_attention_diag\.js/,
    /cloud_sync_lifecycle_attention_pulls\.js/,
  ]);
  assertLacksAll(assert, facade, [
    /export function bindCloudSyncDiagStorageListener\(/,
    /export function bindCloudSyncAttentionPulls\(/,
    /function readStorageEventLike\(/,
  ]);

  assertMatchesAll(assert, shared, [
    /export type CloudSyncDiagStorageListenerArgs = \{/,
    /export type CloudSyncAttentionPullArgs = \{/,
    /export function readStorageEventLike\(/,
  ]);
  assertLacksAll(assert, shared, [
    /export function bindCloudSyncDiagStorageListener\(/,
    /export function bindCloudSyncAttentionPulls\(/,
  ]);

  assertMatchesAll(assert, diag, [
    /export function bindCloudSyncDiagStorageListener\(/,
    /readStorageEventLike\(/,
    /diag\.storageListener\.callback/,
  ]);
  assertLacksAll(assert, diag, [/export function bindCloudSyncAttentionPulls\(/]);

  assertMatchesAll(assert, pulls, [
    /export function bindCloudSyncAttentionPulls\(/,
    /cloud_sync_lifecycle_attention_pulls_runtime\.js/,
    /cloud_sync_lifecycle_attention_pulls_handlers\.js/,
  ]);
  assertLacksAll(assert, pulls, [
    /export function bindCloudSyncDiagStorageListener\(/,
    /requestCloudSyncLifecycleRefresh\(/,
  ]);

  assertMatchesAll(assert, pullsRuntime, [
    /createCloudSyncAttentionPullMutableState\(/,
    /requestCloudSyncAttentionPull\(/,
    /shouldRequestCloudSyncAttentionVisibilityPull\(/,
    /requestCloudSyncLifecycleRefresh\(/,
  ]);

  assertMatchesAll(assert, pullsHandlers, [
    /createCloudSyncAttentionPullHandlers\(/,
    /requestCloudSyncAttentionPull\(/,
    /shouldRequestCloudSyncAttentionVisibilityPull\(/,
    /visibilityListener\.callback/,
  ]);
});
