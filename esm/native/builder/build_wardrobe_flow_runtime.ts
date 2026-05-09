import { guardVoid, reportError } from '../runtime/api.js';
import { reportErrorViaPlatform } from '../runtime/platform_access.js';
import { finalizeBuild, finalizeBuildBestEffort } from './post_build_finalize.js';
import { readFunction } from './build_flow_readers.js';

import type { BuildContextLike } from '../../../types';
import type { PreparedBuildWardrobeFlow } from './build_wardrobe_flow_prepare.js';

type BuildWardrobeExecutor = (prepared: PreparedBuildWardrobeFlow) => BuildContextLike | null;

type BuildWardrobeRuntimeOptions = {
  execute: BuildWardrobeExecutor;
  finalizeBuild?: (ctx: BuildContextLike) => void;
  finalizeBuildBestEffort?: (args: {
    App: unknown;
    pruneCachesSafe?: ((scene: unknown) => void) | null;
    rebuildDrawerMeta?: (() => void) | null;
  }) => void;
  reportBuildFailure?: (prepared: PreparedBuildWardrobeFlow, error: unknown) => void;
};

function reportBuildWardrobeFailure(prepared: PreparedBuildWardrobeFlow, error: unknown): void {
  const { App, label, deps } = prepared;
  const { showToast } = deps;

  guardVoid(App, { where: label, op: 'console.error', fatal: true, failFast: true }, () => {
    console.error('[WardrobePro][builder] buildWardrobe failed:', error);
  });

  guardVoid(App, { where: label, op: 'platform.reportError', fatal: true, failFast: true }, () => {
    reportErrorViaPlatform(App, error, { where: label, fatal: true });
  });

  guardVoid(App, { where: label, op: 'showToast', fatal: true, failFast: true }, () => {
    if (typeof showToast === 'function') {
      showToast('אירעה שגיאה בבניית הדגם.', 'error');
    }
  });
}

function finalizePreparedBuildWardrobeFlow(
  prepared: PreparedBuildWardrobeFlow,
  buildCtx: BuildContextLike | null,
  options: BuildWardrobeRuntimeOptions
): void {
  const { App, deps } = prepared;
  const { pruneCachesSafe, rebuildDrawerMeta } = deps;

  if (buildCtx) {
    (options.finalizeBuild || finalizeBuild)(buildCtx);
    return;
  }

  (options.finalizeBuildBestEffort || finalizeBuildBestEffort)({
    App,
    pruneCachesSafe: readFunction<(scene: unknown) => void>(pruneCachesSafe),
    rebuildDrawerMeta: readFunction<() => void>(rebuildDrawerMeta),
  });
}

export function runPreparedBuildWardrobeFlow(
  prepared: PreparedBuildWardrobeFlow,
  options: BuildWardrobeRuntimeOptions
): BuildContextLike | null {
  const { App, label } = prepared;

  let buildCtx: BuildContextLike | null = null;
  let buildError: unknown = null;
  let finalizeError: unknown = null;

  try {
    buildCtx = options.execute(prepared);
  } catch (error) {
    buildError = error;
    const reportFailure = options.reportBuildFailure || reportBuildWardrobeFailure;
    reportFailure(prepared, error);
  } finally {
    try {
      finalizePreparedBuildWardrobeFlow(prepared, buildCtx, options);
    } catch (error) {
      finalizeError = error;
      reportError(App, error, { where: label, op: 'finalizeBuild', fatal: true });
      guardVoid(App, { where: label, op: 'console.error.finalize', failFast: true }, () => {
        console.error('[WardrobePro][builder] finalize failed:', error);
      });
    }
  }

  if (buildError) throw buildError;
  if (finalizeError) throw finalizeError;
  return buildCtx;
}
