import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_sketch_ops_floating.ts', import.meta.url);
const shared = readSource('../esm/native/services/cloud_sync_sketch_ops_floating_shared.ts', import.meta.url);
const state = readSource('../esm/native/services/cloud_sync_sketch_ops_floating_state.ts', import.meta.url);
const pull = readSource('../esm/native/services/cloud_sync_sketch_ops_floating_pull.ts', import.meta.url);
const push = readSource('../esm/native/services/cloud_sync_sketch_ops_floating_push.ts', import.meta.url);
const runtime = readSource(
  '../esm/native/services/cloud_sync_sketch_ops_floating_runtime.ts',
  import.meta.url
);

test('cloud sync floating sketch ops keep a thin facade over state/pull/push/runtime seams', () => {
  assertMatchesAll(assert, facade, [
    /cloud_sync_sketch_ops_floating_shared\.js/,
    /cloud_sync_sketch_ops_floating_runtime\.js/,
    /export type \{[\s\S]*CreateCloudSyncFloatingSketchSyncOpsDeps[\s\S]*CloudSyncFloatingSketchSyncOps[\s\S]*\}/,
    /export \{ createCloudSyncFloatingSketchSyncOps \}/,
  ]);

  assertLacksAll(assert, facade, [
    /const pushFloatingSketchSyncPinnedNow =/,
    /const pullFloatingSketchSyncPinnedOnce = async/,
    /beginCloudSyncOwnedAsyncFamilyFlight\(/,
    /readCloudSyncRowWithPullActivity\(/,
  ]);

  assertMatchesAll(assert, shared, [
    /cloud_sync_sketch_ops_floating_state\.js/,
    /export \{[\s\S]*applyFloatingSketchSyncPinnedInPlace[\s\S]*\} from '.\/cloud_sync_sketch_ops_floating_state\.js'/,
  ]);

  assertMatchesAll(assert, state, [
    /export type CreateCloudSyncFloatingSketchSyncOpsDeps = \{/,
    /export type CloudSyncFloatingSketchSyncOps = \{/,
    /export type CloudSyncFloatingSketchSyncMutableState = \{/,
    /floatingSketchSyncPushFlights = new WeakMap/,
    /createCloudSyncFloatingSketchSyncMutableState\(/,
    /applyFloatingSketchSyncPinnedInPlace\(/,
    /subscribeFloatingSketchSyncEnabledStateInPlace\(/,
  ]);

  assertMatchesAll(assert, pull, [
    /readCloudSyncRowWithPullActivity\(/,
    /parseFloatingSyncPayload\(/,
    /applyFloatingSketchSyncPinnedInPlace\(/,
    /cloud_sync_sketch_ops_floating_state\.js/,
    /export function createCloudSyncFloatingSketchSyncPullOnce\(/,
  ]);

  assertMatchesAll(assert, push, [
    /beginCloudSyncOwnedAsyncFamilyFlight\(/,
    /publishCloudSyncWriteActivity\(/,
    /resolveCloudSyncSettledRowAfterWrite\(/,
    /cloud_sync_sketch_ops_floating_state\.js/,
    /export function createCloudSyncFloatingSketchSyncPushNow\(/,
  ]);

  assertMatchesAll(assert, runtime, [
    /createCloudSyncFloatingSketchSyncMutableState\(/,
    /createCloudSyncFloatingSketchSyncPushNow\(/,
    /createCloudSyncFloatingSketchSyncPullOnce\(/,
    /cloud_sync_sketch_ops_floating_state\.js/,
    /export function createCloudSyncFloatingSketchSyncOps\(/,
  ]);
});
