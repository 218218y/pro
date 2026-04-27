// Post-build finalize helpers (Pure ESM)
//
// Goals:
// - Keep builder/core orchestration lean
// - Finalization is best-effort: it should not throw during normal operation.
//
// Policy:
// - `finalizeBuild(ctx)` is the canonical API and expects a BuildContext.
// - `finalizeBuildBestEffort(args)` is a narrow escape hatch used when a build fails
//   before a BuildContext is fully created.

import { guardVoid } from '../runtime/api.js';
import { isBuildContext } from './build_context.js';
import {
  resolveFinalizeBuildContextArgs,
  runFinalizeBuildBestEffort,
} from './post_build_finalize_runtime.js';

import type { BuildContextLike } from '../../../types/index.js';
import type { FinalizeBestEffortArgs } from './post_build_finalize_runtime.js';

export function finalizeBuildBestEffort(args: FinalizeBestEffortArgs) {
  const base = { where: 'builder/post_build_finalize' };

  guardVoid(args?.App, { ...base, op: 'builder.postBuildFollowThrough', failFast: true }, () => {
    runFinalizeBuildBestEffort(args);
  });
}

/**
 * Canonical finalization entry point.
 *
 * @param {import('../../../types').BuildContextLike} ctx
 */
export function finalizeBuild(ctx: BuildContextLike) {
  if (!isBuildContext(ctx)) {
    throw new Error('[builder/finalize] BuildContext required');
  }

  finalizeBuildBestEffort(resolveFinalizeBuildContextArgs(ctx));
}
