import assert from 'node:assert/strict';
import test from 'node:test';

import { readFirstExisting } from './_read_src.js';
import { assertNamedExports, getTypeLiteralPropertyFacts } from './_semantic_source_contracts.js';

const runtimeSource = readFirstExisting(
  ['../esm/native/runtime/planar_reflector_runtime.ts'],
  import.meta.url
);
const contractsSource = readFirstExisting(
  ['../esm/native/runtime/planar_reflector_contracts.ts'],
  import.meta.url
);
const refreshSource = readFirstExisting(
  ['../esm/native/runtime/planar_reflector_refresh_runtime.ts'],
  import.meta.url
);
const schedulerSource = [
  readFirstExisting(['../esm/native/runtime/mirror_config_access.ts'], import.meta.url),
  readFirstExisting(['../esm/native/platform/render_loop_mirror_shared.ts'], import.meta.url),
  readFirstExisting(['../esm/native/platform/render_loop_mirror_planar_scheduler.ts'], import.meta.url),
].join('\n');

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
  assertNamedExports(assert, runtimeSource, ['PlanarMirrorRefreshOptions'], {
    sourceModule: './planar_reflector_contracts.js',
    exportKind: 'type',
    label: 'planar reflector refresh type seam',
  });
  assert.match(contractsSource, /export type PlanarMirrorRefreshOptions/);
  const refreshOptions = getTypeLiteralPropertyFacts(
    contractsSource,
    'PlanarMirrorRefreshOptions',
    'planar_reflector_contracts.ts'
  );
  assert.deepEqual(
    refreshOptions?.filter(property => property.name === 'maxSurfaces' || property.name === 'startIndex'),
    [
      { name: 'maxSurfaces', optional: true, readonly: false, type: 'null|number' },
      { name: 'startIndex', optional: true, readonly: false, type: 'null|number' },
    ]
  );
  assert.match(contractsSource, /completedCycle: boolean/);
  assert.match(contractsSource, /nextIndex: number/);
  assert.match(refreshSource, /planar-reflector-budget-deferred/);
  assert.match(refreshSource, /renderPlanarReflectorSurface/);
  assert.match(runtimeSource, /refreshTrackedPlanarMirrorSurfacesNow/);
});

test('render loop keeps planar reflector motion live with motion-synchronous batches', () => {
  assert.match(schedulerSource, /MIRROR_REFLECTOR_MOVE_MAX_UPDATES_PER_FRAME/);
  assert.match(schedulerSource, /MIRROR_REFLECTOR_MAX_UPDATES_PER_FRAME/);
  assert.match(schedulerSource, /MIRROR_REFLECTOR_MOVE_UPDATE_MS', 0/);
  assert.match(schedulerSource, /motionActive \? 8 : 3/);
  assert.match(schedulerSource, /__mirrorPlanarCursorIndex/);
  assert.match(schedulerSource, /__mirrorPlanarBatchPending/);
  assert.match(schedulerSource, /markPlanarBatchPending/);
  assert.match(schedulerSource, /maxBudgetMs: resolveRemainingFrameBudgetMs/);
});
