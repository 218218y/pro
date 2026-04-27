import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, bundleSources, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const owner = readSource('../esm/native/services/cloud_sync_pull_scopes.ts', import.meta.url);
const bundle = bundleSources(
  [
    '../esm/native/services/cloud_sync_pull_scopes.ts',
    '../esm/native/services/cloud_sync_pull_scopes_shared.ts',
    '../esm/native/services/cloud_sync_pull_scopes_pull.ts',
    '../esm/native/services/cloud_sync_pull_scopes_realtime.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

test('cloud sync pull scopes facade stays thin and re-exports split owners', () => {
  assertMatchesAll(assert, owner, [
    /export \* from '\.\/cloud_sync_pull_scopes_shared\.js';/,
    /export \* from '\.\/cloud_sync_pull_scopes_pull\.js';/,
    /export \* from '\.\/cloud_sync_pull_scopes_realtime\.js';/,
  ]);
  assertLacksAll(assert, owner, [
    /function createCloudSyncInstallPullRunnerMap\(/,
    /function triggerCloudSyncPullAllScopes\(/,
    /function createCloudSyncRealtimeScopedHandlerMapFromTriggers\(/,
    /const CLOUD_SYNC_PULL_SCOPE_ORDER =/,
  ]);
});

test('cloud sync pull scopes bundle keeps scope registry, pull triggers, and realtime routing in split owners', () => {
  assertMatchesAll(assert, bundle, [
    /export const CLOUD_SYNC_PULL_SCOPE_ORDER =/,
    /export function createCloudSyncInstallPullRunnerMap\(args:/,
    /export function triggerCloudSyncPullScopes\(args:/,
    /export function triggerCloudSyncPullAllScopes\(args:/,
    /export function createCloudSyncRealtimeScopedHandlerMapFromTriggers\(args:/,
    /export function invokeCloudSyncRealtimeScopedHandler\(/,
  ]);
});
