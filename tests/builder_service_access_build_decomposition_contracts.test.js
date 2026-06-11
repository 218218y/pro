import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const buildFacade = readSource('../esm/native/runtime/builder_service_access_build.ts', import.meta.url);
const buildUiOwner = readSource('../esm/native/runtime/builder_service_access_build_ui.ts', import.meta.url);
const buildRenderOwner = readSource(
  '../esm/native/runtime/builder_service_access_build_render.ts',
  import.meta.url
);
const buildHandlesOwner = readSource(
  '../esm/native/runtime/builder_service_access_build_handles.ts',
  import.meta.url
);
const buildFollowThroughOwner = readSource(
  '../esm/native/runtime/builder_service_access_build_followthrough.ts',
  import.meta.url
);
const buildRequestOwner = readSource(
  '../esm/native/runtime/builder_service_access_build_request.ts',
  import.meta.url
);
const buildSharedOwner = readSource(
  '../esm/native/runtime/builder_service_access_build_shared.ts',
  import.meta.url
);

test('[builder-access-build] facade stays thin while dedicated owners hold build ui, handles, render, request, and follow-through logic', () => {
  assertMatchesAll(
    assert,
    buildFacade,
    [
      /from '\.\/builder_service_access_build_ui\.js';/,
      /from '\.\/builder_service_access_build_render\.js';/,
      /from '\.\/builder_service_access_build_handles\.js';/,
      /from '\.\/builder_service_access_build_followthrough\.js';/,
      /from '\.\/builder_service_access_build_request\.js';/,
      /from '\.\/builder_service_access_build_shared\.js';/,
      /export \{[\s\S]*requestBuilderStructuralRefresh,[\s\S]*requestBuilderBuildWithUi,[\s\S]*\} from '\.\/builder_service_access_build_request\.js';/s,
      /export type \{[\s\S]*BuilderPostBuildFollowThroughOpts,[\s\S]*BuilderChestModeFollowThroughResult,[\s\S]*\} from '\.\/builder_service_access_build_shared\.js';/s,
    ],
    'buildFacade'
  );
  assertLacksAll(
    assert,
    buildFacade,
    [
      /function resolveBuilderBuildProfileMeta\(/,
      /function requestBuilderBuildInternal\(/,
      /function renderBuilderViewportNow\(/,
      /function shouldTriggerStructuralRefreshRender\(/,
      /function readBuilderRequestBuildFn\(/,
      /function applyBuilderHandles\(/,
    ],
    'buildFacade'
  );
});

test('[builder-access-build] dedicated owners hold the canonical logic after decomposition', () => {
  assertMatchesAll(
    assert,
    buildUiOwner,
    [
      /export function getBuilderBuildUi\(/,
      /export function ensureBuilderBuildUi\(/,
      /export function clearBuilderBuildUi\(/,
    ],
    'buildUiOwner'
  );
  assertMatchesAll(
    assert,
    buildRenderOwner,
    [
      /export function runBuilderRenderFollowThrough\(/,
      /export function runBuilderRenderFollowThroughWhen\(/,
      /export function renderBuilderViewportNow\(/,
    ],
    'buildRenderOwner'
  );
  assertMatchesAll(
    assert,
    buildHandlesOwner,
    [
      /export function applyBuilderHandles\(/,
      /export function refreshBuilderHandles\(/,
      /export function purgeBuilderHandlesForRemovedDoors\(/,
    ],
    'buildHandlesOwner'
  );
  assertMatchesAll(
    assert,
    buildFollowThroughOwner,
    [
      /export function runBuilderPostBuildFollowThrough\(/,
      /export function runBuilderChestModeFollowThrough\(/,
    ],
    'buildFollowThroughOwner'
  );
  assertMatchesAll(
    assert,
    buildRequestOwner,
    [
      /export function requestBuilderBuild\(/,
      /export function requestBuilderBuildWithUi\(/,
      /export function requestBuilderStructuralRefresh\(/,
      /function requestBuilderBuildInternal\(/,
    ],
    'buildRequestOwner'
  );
  assertMatchesAll(
    assert,
    buildSharedOwner,
    [
      /export function resolveBuilderBuildProfileMeta\(/,
      /export function stripBuilderFollowThroughMeta\(/,
      /export function shouldTriggerStructuralRefreshRender\(/,
    ],
    'buildSharedOwner'
  );
});
