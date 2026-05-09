import type { UnknownRecord } from '../../../types';

import { asRecord } from './record.js';
import { runPlatformRenderFollowThrough } from './platform_access.js';
import { getViewportSurface } from './render_access.js';
import type {
  BuilderRenderFollowThroughOpts,
  BuilderRenderFollowThroughResult,
  BuilderViewportRefreshResult,
} from './builder_service_access_build_shared.js';

export function runBuilderRenderFollowThroughRuntime(
  App: unknown,
  opts?: BuilderRenderFollowThroughOpts | null
): BuilderRenderFollowThroughResult {
  const result = runPlatformRenderFollowThrough(App, {
    updateShadows: !!opts?.updateShadows,
  });
  return {
    triggeredRender: result.triggeredRender,
    ensuredRenderLoop: result.ensuredRenderLoop,
  };
}

export function renderBuilderViewportNowRuntime(App: unknown): BuilderViewportRefreshResult {
  const render = asRecord<UnknownRecord>(getViewportSurface(App));
  const renderer = asRecord<UnknownRecord>(render?.renderer);
  const controls = asRecord<UnknownRecord>(render?.controls);

  let renderedViewport = false;
  const renderFn = renderer && typeof renderer.render === 'function' ? renderer.render : null;
  if (renderFn && render?.scene && render?.camera) {
    renderFn.call(renderer, render.scene, render.camera);
    renderedViewport = true;
  }

  let updatedControls = false;
  const updateFn = controls && typeof controls.update === 'function' ? controls.update : null;
  if (updateFn) {
    updateFn.call(controls);
    updatedControls = true;
  }

  return { renderedViewport, updatedControls };
}
