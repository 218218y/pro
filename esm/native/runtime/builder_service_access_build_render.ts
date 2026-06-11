import type {
  BuilderRenderFollowThroughOpts,
  BuilderRenderFollowThroughResult,
  BuilderViewportRefreshResult,
} from './builder_service_access_build_shared.js';
import { EMPTY_BUILDER_RENDER_FOLLOW_THROUGH_RESULT } from './builder_service_access_build_shared.js';
import {
  renderBuilderViewportNowRuntime,
  runBuilderRenderFollowThroughRuntime,
} from './builder_service_access_build_render_runtime.js';

export function runBuilderRenderFollowThrough(
  App: unknown,
  opts?: BuilderRenderFollowThroughOpts | null
): BuilderRenderFollowThroughResult {
  return runBuilderRenderFollowThroughRuntime(App, opts);
}

export function runBuilderRenderFollowThroughWhen(
  App: unknown,
  shouldRun: boolean,
  opts?: BuilderRenderFollowThroughOpts | null
): BuilderRenderFollowThroughResult {
  return shouldRun
    ? runBuilderRenderFollowThroughRuntime(App, opts)
    : EMPTY_BUILDER_RENDER_FOLLOW_THROUGH_RESULT;
}

export function renderBuilderViewportNow(App: unknown): BuilderViewportRefreshResult {
  return renderBuilderViewportNowRuntime(App);
}
