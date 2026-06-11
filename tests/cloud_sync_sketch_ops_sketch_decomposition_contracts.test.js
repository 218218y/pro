import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_sketch_ops_sketch.ts', import.meta.url);
const shared = readSource('../esm/native/services/cloud_sync_sketch_ops_sketch_shared.ts', import.meta.url);
const state = readSource('../esm/native/services/cloud_sync_sketch_ops_sketch_state.ts', import.meta.url);
const load = readSource('../esm/native/services/cloud_sync_sketch_ops_sketch_load.ts', import.meta.url);
const pull = readSource('../esm/native/services/cloud_sync_sketch_ops_sketch_pull.ts', import.meta.url);
const push = readSource('../esm/native/services/cloud_sync_sketch_ops_sketch_push.ts', import.meta.url);
const runtime = readSource('../esm/native/services/cloud_sync_sketch_ops_sketch_runtime.ts', import.meta.url);

test('cloud sync sketch room ops keep a thin facade over state/load/pull/push/runtime seams', () => {
  assertMatchesAll(assert, facade, [
    /cloud_sync_sketch_ops_sketch_shared\.js/,
    /cloud_sync_sketch_ops_sketch_runtime\.js/,
    /export\s+type\s*\{[\s\S]*CloudSyncSketchRoomOps,[\s\S]*CreateCloudSyncSketchRoomOpsDeps,?[\s\S]*\}/s,
    /export\s*\{[\s\S]*createCloudSyncSketchRoomOps[\s\S]*\}/s,
  ]);

  assertLacksAll(assert, facade, [
    /const syncSketchNow = async/,
    /const pullSketchOnce = async/,
    /resolveCloudSyncSettledRowAfterWrite\(/,
    /readCloudSyncRowWithPullActivity\(/,
  ]);

  assertMatchesAll(assert, shared, [
    /cloud_sync_sketch_ops_sketch_state\.js/,
    /cloud_sync_sketch_ops_sketch_load\.js/,
    /export type \{[\s\S]*CreateCloudSyncSketchRoomOpsDeps/,
    /export \{[\s\S]*tryLoadEligibleRemoteSketch/,
  ]);

  assertMatchesAll(assert, state, [
    /export type CreateCloudSyncSketchRoomOpsDeps = \{/,
    /export type CloudSyncSketchRoomOps = \{/,
    /export type CloudSyncSketchRoomMutableState = \{/,
    /createCloudSyncSketchRoomMutableState\(/,
    /rememberSettledRemoteSketchFingerprint\(/,
  ]);

  assertMatchesAll(assert, load, [
    /loadRemoteSketch\(/,
    /tryLoadEligibleRemoteSketch\(/,
    /finishPulledSketchLoad\(/,
    /runInitialCloudSketchCatchup\(/,
  ]);

  assertMatchesAll(assert, pull, [
    /cloud_sync_sketch_ops_sketch_state\.js/,
    /cloud_sync_sketch_ops_sketch_load\.js/,
    /readCloudSyncRowWithPullActivity\(/,
    /runInitialCloudSketchCatchup\(/,
    /tryLoadEligibleRemoteSketch\(/,
    /export function createCloudSyncSketchPullOnce\(/,
  ]);

  assertMatchesAll(assert, push, [
    /cloud_sync_sketch_ops_sketch_state\.js/,
    /readCloudSyncRowWithPullActivity\(/,
    /resolveCloudSyncSettledRowAfterWrite\(/,
    /publishCloudSyncWriteActivity\(/,
    /export function createCloudSyncSketchSyncNow\(/,
  ]);

  assertMatchesAll(assert, runtime, [
    /cloud_sync_sketch_ops_sketch_state\.js/,
    /createCloudSyncSketchRoomMutableState\(/,
    /createCloudSyncSketchSyncNow\(/,
    /createCloudSyncSketchPullOnce\(/,
    /export function createCloudSyncSketchRoomOps\(/,
  ]);
});
