// Render-loop visual effect helpers.
//
// Keeps the render-loop owner focused on orchestration and RAF wiring while
// mirror, floor, and front-overlay policies live behind dedicated seams.

import type { AppContainer } from '../../../types';

import { autoHideRenderLoopRoomFloor } from './render_loop_visual_effects_floor.js';
import { updateRenderLoopFrontOverlaySeamsVisibility } from './render_loop_visual_effects_front_overlay.js';
import { updateRenderLoopMirrorMotionState } from './render_loop_visual_effects_mirror.js';
import { markRenderLoopMirrorDirty, type VisualDeps } from './render_loop_visual_effects_shared.js';

export function createRenderLoopVisualEffects(App: AppContainer, deps: VisualDeps) {
  const A = App;
  const { report: __renderLoopReport } = deps;

  function __wp_markMirrorDirty(): void {
    markRenderLoopMirrorDirty(A, deps);
  }

  function __wp_updateMirrorMotionState(nowMs: number, doorOrDrawerAnimating: boolean): void {
    try {
      updateRenderLoopMirrorMotionState(A, deps, nowMs, doorOrDrawerAnimating);
    } catch (_e) {
      __renderLoopReport(A, 'mirrorMotionState', _e, { throttleMs: 5000 });
    }
  }

  function __wp_autoHideRoomFloor() {
    try {
      autoHideRenderLoopRoomFloor(A, deps);
    } catch (_e) {
      __renderLoopReport(A, 'autoHideFloor', _e, { throttleMs: 5000 });
    }
  }

  function __wp_updateFrontOverlaySeamsVisibility(): void {
    try {
      updateRenderLoopFrontOverlaySeamsVisibility(A, deps);
    } catch (_e) {
      __renderLoopReport(A, 'frontSeams', _e, { throttleMs: 5000 });
    }
  }

  return {
    markMirrorDirty: __wp_markMirrorDirty,
    updateMirrorMotionState: __wp_updateMirrorMotionState,
    autoHideRoomFloor: __wp_autoHideRoomFloor,
    updateFrontOverlaySeamsVisibility: __wp_updateFrontOverlaySeamsVisibility,
  };
}
