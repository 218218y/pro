// Post-build front reveal frame overlays (Pure ESM)
//
// Owns reveal-frame orchestration while focused helpers handle runtime/material policy
// and the per-door / per-drawer local frame flows.

import type { BuildContextLike } from '../../../types/index.js';

import { applyFrontRevealDoorFrames } from './post_build_front_reveal_frames_doors.js';
import { applyFrontRevealDrawerFrames } from './post_build_front_reveal_frames_drawers.js';
import { createFrontRevealFramesRuntime } from './post_build_front_reveal_frames_runtime.js';

/**
 * Apply post-build front reveal frame overlays.
 *
 * @param {BuildContextLike} ctx
 */
export function applyFrontRevealFrames(ctx: BuildContextLike): void {
  const runtime = createFrontRevealFramesRuntime(ctx);
  if (!runtime) return;

  runtime.cleanupLegacyFrames();
  runtime.cleanupStaleLocalFrames();
  applyFrontRevealDoorFrames(ctx, runtime);
  applyFrontRevealDrawerFrames(runtime);
  runtime.cleanupLegacySeamHelpers();
}
