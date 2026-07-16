import { finalizeBuild } from './post_build_finalize.js';
import { readFunction } from './build_flow_readers.js';

import type { BuildContextLike, BuilderRebuildDrawerMetaFn } from '../../../types';
import type { BuildFlowFinalizeFallback } from './build_flow_orchestration.js';
import type { PreparedBuildWardrobeFlow } from './build_wardrobe_flow_prepare.js';

type BuildWardrobeExecutor = (prepared: PreparedBuildWardrobeFlow) => BuildContextLike | null;

type BuildWardrobeRuntimeOptions = {
  execute: BuildWardrobeExecutor;
  finalizeBuild?: (ctx: BuildContextLike) => void;
  finalizeBuildBestEffort?: (args: BuildFlowFinalizeFallback) => void;
  reportBuildFailure?: (prepared: PreparedBuildWardrobeFlow, error: unknown) => void;
};

function reportBuildWardrobeFailure(prepared: PreparedBuildWardrobeFlow, error: unknown): void {
  prepared.orchestration.reportBuildFailure(prepared.label, error, prepared.deps.showToast);
}

function finalizePreparedBuildWardrobeFlow(
  prepared: PreparedBuildWardrobeFlow,
  buildCtx: BuildContextLike | null,
  options: BuildWardrobeRuntimeOptions
): void {
  const { deps, orchestration } = prepared;
  const { pruneCachesSafe, rebuildDrawerMeta } = deps;

  if (buildCtx) {
    (options.finalizeBuild || finalizeBuild)(buildCtx);
    return;
  }

  (options.finalizeBuildBestEffort || orchestration.finalizeBestEffort)({
    pruneCachesSafe: readFunction<(scene: unknown) => void>(pruneCachesSafe),
    drawerRebuildSnapshot: prepared.buildState.drawerRebuildSnapshot,
    rebuildDrawerMeta: readFunction<BuilderRebuildDrawerMetaFn>(rebuildDrawerMeta),
  });
}

export function runPreparedBuildWardrobeFlow(
  prepared: PreparedBuildWardrobeFlow,
  options: BuildWardrobeRuntimeOptions
): BuildContextLike | null {
  const { label, orchestration } = prepared;

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
      orchestration.reportFinalizeFailure(label, error);
    }
  }

  if (buildError) throw buildError;
  if (finalizeError) throw finalizeError;
  return buildCtx;
}
