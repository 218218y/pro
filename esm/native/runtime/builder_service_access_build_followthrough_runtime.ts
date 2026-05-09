import { getScene } from './render_access.js';
import { finalizeBuilderRegistry } from './builder_service_access_slots.js';
import { applyBuilderHandles } from './builder_service_access_build_handles.js';
import {
  readPostBuildUpdateShadows,
  shouldApplyBuilderHandles,
  shouldClearBuilderBuildUi,
  shouldFinalizeBuilderRegistry,
  shouldTriggerPlatformRender,
} from './builder_service_access_build_shared.js';
import type {
  BuilderChestModeFollowThroughOpts,
  BuilderChestModeFollowThroughResult,
  BuilderPostBuildFollowThroughOpts,
  BuilderPostBuildFollowThroughResult,
} from './builder_service_access_build_shared.js';
import { clearBuilderBuildUi } from './builder_service_access_build_ui.js';
import {
  renderBuilderViewportNowRuntime,
  runBuilderRenderFollowThroughRuntime,
} from './builder_service_access_build_render_runtime.js';

export function runBuilderPostBuildFollowThroughRuntime(
  App: unknown,
  opts?: BuilderPostBuildFollowThroughOpts | null
): BuilderPostBuildFollowThroughResult {
  const finalizedRegistry = shouldFinalizeBuilderRegistry(opts) ? finalizeBuilderRegistry(App) : false;
  const rebuiltDrawerMeta =
    typeof opts?.rebuildDrawerMeta === 'function' ? (opts.rebuildDrawerMeta(), true) : false;
  const appliedHandles = shouldApplyBuilderHandles(opts)
    ? applyBuilderHandles(App, { triggerRender: false })
    : false;

  let prunedCaches = false;
  if (typeof opts?.pruneCachesSafe === 'function') {
    const scene = getScene(App);
    if (scene) {
      opts.pruneCachesSafe(scene);
      prunedCaches = true;
    }
  }

  const clearedBuildUi = shouldClearBuilderBuildUi(opts) ? clearBuilderBuildUi(App) : false;
  const renderResult = shouldTriggerPlatformRender(opts)
    ? runBuilderRenderFollowThroughRuntime(App, {
        updateShadows: readPostBuildUpdateShadows(opts),
      })
    : { triggeredRender: false, ensuredRenderLoop: false };

  return {
    finalizedRegistry,
    rebuiltDrawerMeta,
    appliedHandles,
    prunedCaches,
    clearedBuildUi,
    triggeredRender: renderResult.triggeredRender,
    ensuredRenderLoop: renderResult.ensuredRenderLoop,
  };
}

export function runBuilderChestModeFollowThroughRuntime(
  App: unknown,
  opts?: BuilderChestModeFollowThroughOpts | null
): BuilderChestModeFollowThroughResult {
  const appliedHandles = shouldApplyBuilderHandles(opts)
    ? applyBuilderHandles(App, { triggerRender: false })
    : false;
  const viewport =
    opts?.renderViewport === false
      ? { renderedViewport: false, updatedControls: false }
      : renderBuilderViewportNowRuntime(App);
  const finalizedRegistry = shouldFinalizeBuilderRegistry(opts) ? finalizeBuilderRegistry(App) : false;

  return {
    finalizedRegistry,
    rebuiltDrawerMeta: false,
    appliedHandles,
    prunedCaches: false,
    clearedBuildUi: false,
    triggeredRender: false,
    ensuredRenderLoop: false,
    ...viewport,
  };
}
