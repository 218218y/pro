import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const finalizeFacade = readSource('../esm/native/builder/post_build_finalize.ts', import.meta.url);
const finalizeRuntimeOwner = readSource(
  '../esm/native/builder/post_build_finalize_runtime.ts',
  import.meta.url
);
const buildRenderFacade = readSource(
  '../esm/native/runtime/builder_service_access_build_render.ts',
  import.meta.url
);
const buildRenderRuntimeOwner = readSource(
  '../esm/native/runtime/builder_service_access_build_render_runtime.ts',
  import.meta.url
);
const buildFollowThroughFacade = readSource(
  '../esm/native/runtime/builder_service_access_build_followthrough.ts',
  import.meta.url
);
const buildFollowThroughRuntimeOwner = readSource(
  '../esm/native/runtime/builder_service_access_build_followthrough_runtime.ts',
  import.meta.url
);
const buildRequestFacade = readSource(
  '../esm/native/runtime/builder_service_access_build_request.ts',
  import.meta.url
);
const buildRequestRuntimeOwner = readSource(
  '../esm/native/runtime/builder_service_access_build_request_runtime.ts',
  import.meta.url
);

test('[build-completion-runtime-owners] facades stay thin while runtime owners hold finalize/render/request/follow-through logic', () => {
  assertMatchesAll(
    assert,
    finalizeFacade,
    [
      /from '\.\/post_build_finalize_runtime\.js';/,
      /export function finalizeBuildBestEffort\(/,
      /export function finalizeBuild\(/,
    ],
    'finalizeFacade'
  );
  assertLacksAll(
    assert,
    finalizeFacade,
    [
      /function readFinalizeArgs\(/,
      /function readBuildCtxPruneCachesSafe\(/,
      /runBuilderPostBuildFollowThrough\(/,
    ],
    'finalizeFacade'
  );

  assertMatchesAll(
    assert,
    buildRenderFacade,
    [
      /from '\.\/builder_service_access_build_render_runtime\.js';/,
      /export function runBuilderRenderFollowThrough\(/,
      /export function renderBuilderViewportNow\(/,
    ],
    'buildRenderFacade'
  );
  assertLacksAll(
    assert,
    buildRenderFacade,
    [/getViewportSurface\(/, /runPlatformRenderFollowThrough\(/],
    'buildRenderFacade'
  );

  assertMatchesAll(
    assert,
    buildFollowThroughFacade,
    [
      /from '\.\/builder_service_access_build_followthrough_runtime\.js';/,
      /export function runBuilderPostBuildFollowThrough\(/,
      /export function runBuilderChestModeFollowThrough\(/,
    ],
    'buildFollowThroughFacade'
  );
  assertLacksAll(
    assert,
    buildFollowThroughFacade,
    [/getScene\(/, /finalizeBuilderRegistry\(/, /clearBuilderBuildUi\(/],
    'buildFollowThroughFacade'
  );

  assertMatchesAll(
    assert,
    buildRequestFacade,
    [
      /from '\.\/builder_service_access_build_request_runtime\.js';/,
      /export function requestBuilderBuild\(/,
      /export function requestBuilderStructuralRefresh\(/,
    ],
    'buildRequestFacade'
  );
  assertLacksAll(
    assert,
    buildRequestFacade,
    [
      /function readBuilderRequestBuildFn\(/,
      /function hasCanonicalSchedulerRenderOwnership\(/,
      /cloneBuilderRequestMeta\(/,
    ],
    'buildRequestFacade'
  );
});

test('[build-completion-runtime-owners] runtime owners keep the canonical execution logic after decomposition', () => {
  assertMatchesAll(
    assert,
    finalizeRuntimeOwner,
    [
      /export function resolveFinalizeBuildBestEffortArgs\(/,
      /export function resolveFinalizeBuildContextArgs\(/,
      /export function runFinalizeBuildBestEffort\(/,
    ],
    'finalizeRuntimeOwner'
  );
  assertMatchesAll(
    assert,
    buildRenderRuntimeOwner,
    [
      /export function runBuilderRenderFollowThroughRuntime\(/,
      /export function renderBuilderViewportNowRuntime\(/,
      /getViewportSurface\(/,
    ],
    'buildRenderRuntimeOwner'
  );
  assertMatchesAll(
    assert,
    buildFollowThroughRuntimeOwner,
    [
      /export function runBuilderPostBuildFollowThroughRuntime\(/,
      /export function runBuilderChestModeFollowThroughRuntime\(/,
      /finalizeBuilderRegistry\(/,
      /clearBuilderBuildUi\(/,
    ],
    'buildFollowThroughRuntimeOwner'
  );
  assertMatchesAll(
    assert,
    buildRequestRuntimeOwner,
    [
      /export function readBuilderRequestBuildFn\(/,
      /export function requestBuilderBuildRuntime\(/,
      /export function refreshBuilderAfterDoorOpsRuntime\(/,
      /export function requestBuilderStructuralRefreshRuntime\(/,
    ],
    'buildRequestRuntimeOwner'
  );
});
