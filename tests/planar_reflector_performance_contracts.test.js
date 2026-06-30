import assert from 'node:assert/strict';
import test from 'node:test';

import { readFirstExisting } from './_read_src.js';

const runtimeSource = readFirstExisting(
  ['../esm/native/runtime/planar_reflector_runtime.ts'],
  import.meta.url
);
const driverSource = readFirstExisting(
  ['../esm/native/platform/render_loop_mirror_driver.ts'],
  import.meta.url
);

test('planar reflectors adapt render-target resolution by mirror size and reflector count', () => {
  assert.match(runtimeSource, /DEFAULT_REFLECTOR_SMALL_LONG_EDGE = 512/);
  assert.match(runtimeSource, /DEFAULT_REFLECTOR_MEDIUM_LONG_EDGE = 768/);
  assert.match(runtimeSource, /DEFAULT_REFLECTOR_SHARED_LONG_EDGE = 640/);
  assert.match(runtimeSource, /resolveReflectorLongEdge\(App, mirror, installedPlanarCount\)/);
  assert.match(runtimeSource, /mirrorLongM <= 0\.75 \|\| mirrorAreaM2 <= 0\.45/);
  assert.match(runtimeSource, /installedPlanarCount >= 4/);
  assert.match(runtimeSource, /installedPlanarCount >= 2/);
});

test('planar mirror refresh supports budgeted progressive batches', () => {
  assert.match(runtimeSource, /export type PlanarMirrorRefreshOptions/);
  assert.match(runtimeSource, /maxSurfaces\?: number \| null/);
  assert.match(runtimeSource, /startIndex\?: number \| null/);
  assert.match(runtimeSource, /completedCycle: boolean/);
  assert.match(runtimeSource, /nextIndex: number/);
  assert.match(runtimeSource, /planar-reflector-budget-deferred/);
});

test('render loop keeps planar reflector motion live with motion-synchronous batches', () => {
  assert.match(driverSource, /MIRROR_REFLECTOR_MOVE_MAX_UPDATES_PER_FRAME/);
  assert.match(driverSource, /MIRROR_REFLECTOR_MAX_UPDATES_PER_FRAME/);
  assert.match(driverSource, /MIRROR_REFLECTOR_MOVE_UPDATE_MS', 0/);
  assert.match(driverSource, /motionActive \? 8 : 3/);
  assert.match(driverSource, /__mirrorPlanarCursorIndex/);
  assert.match(driverSource, /__mirrorPlanarBatchPending/);
  assert.match(driverSource, /markPlanarBatchPending/);
  assert.match(driverSource, /maxBudgetMs: resolveRemainingFrameBudgetMs/);
});
