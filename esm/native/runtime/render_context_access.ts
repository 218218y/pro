// Render context access helpers (Canonical)
//
// Purpose:
// - Expose a narrow, engine-friendly context object for camera/controls/renderer callers.
// - Keep future engine boot refactors from leaking raw render-bag probing into consumers.
// - Reuse the hardened render seams already present in runtime/services.

import type { AppContainer, RenderCameraControlsLike, RenderContextLike } from '../../../types';

import { getViewerContainerMaybe } from './dom_access.js';
import { getViewportSurface } from './render_access.js';

function readViewerContainer(App: AppContainer): HTMLElement | null {
  return getViewerContainerMaybe(App);
}

/** Returns the canonical render context. Never throws. */
export function getRenderContext(App: AppContainer): RenderContextLike {
  const surface = getViewportSurface(App);
  return {
    ...surface,
    container: readViewerContainer(App),
  };
}

export function getCameraAndControls(App: AppContainer): RenderCameraControlsLike | null {
  try {
    const ctx = getRenderContext(App);
    if (!ctx.camera || !ctx.controls) return null;
    return { camera: ctx.camera, controls: ctx.controls };
  } catch {
    return null;
  }
}

export type { RenderContextLike };
