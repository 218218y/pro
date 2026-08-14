import { finalizeBuild } from './post_build_finalize.js';
import { readFunction } from './build_flow_readers.js';

import type { BuildContextLike, BuilderRebuildDrawerMetaFn } from '../../../types';
import type { BuildFlowFinalizeBestEffort } from './build_flow_orchestration.js';
import type { PreparedBuildWardrobeFlow } from './build_wardrobe_flow_prepare.js';

type BuildWardrobeExecutor = (prepared: PreparedBuildWardrobeFlow) => BuildContextLike | null;

type BuildWardrobeRuntimeOptions = {
  execute: BuildWardrobeExecutor;
  finalizeBuild?: (ctx: BuildContextLike) => void;
  finalizeBuildBestEffort?: (args: BuildFlowFinalizeBestEffort) => void;
  reportBuildFailure?: (prepared: PreparedBuildWardrobeFlow, error: unknown) => void;
};

function reportBuildWardrobeFailure(prepared: PreparedBuildWardrobeFlow, error: unknown): void {
  prepared.orchestration.reportBuildFailure(prepared.label, error, prepared.deps.showToast);
}

function reportSecondaryFailureSafely(
  prepared: PreparedBuildWardrobeFlow,
  error: unknown,
  operation: 'build-failure-report' | 'finalize-failure-report',
  originalError: unknown
): void {
  try {
    prepared.orchestration.reportSecondaryFailure(prepared.label, error, {
      operation,
      originalError,
    });
  } catch {
    // Secondary diagnostics cannot replace the authoritative build/finalize result.
  }
}

function reportBuildFailureSafely(
  prepared: PreparedBuildWardrobeFlow,
  error: unknown,
  reportFailure: NonNullable<BuildWardrobeRuntimeOptions['reportBuildFailure']>
): void {
  try {
    reportFailure(prepared, error);
  } catch (reportingError) {
    reportSecondaryFailureSafely(prepared, reportingError, 'build-failure-report', error);
  }
}

function reportFinalizeFailureSafely(prepared: PreparedBuildWardrobeFlow, error: unknown): void {
  try {
    prepared.orchestration.reportFinalizeFailure(prepared.label, error);
  } catch (reportingError) {
    reportSecondaryFailureSafely(prepared, reportingError, 'finalize-failure-report', error);
  }
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
  const { orchestration } = prepared;
  let buildCtx: BuildContextLike | null = null;
  let didBuildThrow = false;
  let buildError: unknown;
  let didFinalizeThrow = false;
  let finalizeError: unknown;

  orchestration.beginConstructionCorrectionFeedback();
  try {
    try {
      buildCtx = options.execute(prepared);
    } catch (error) {
      didBuildThrow = true;
      buildError = error;
      const reportFailure = options.reportBuildFailure || reportBuildWardrobeFailure;
      reportBuildFailureSafely(prepared, error, reportFailure);
    } finally {
      try {
        finalizePreparedBuildWardrobeFlow(prepared, buildCtx, options);
      } catch (error) {
        didFinalizeThrow = true;
        finalizeError = error;
        reportFinalizeFailureSafely(prepared, error);
      }
    }

    if (didBuildThrow) throw buildError;
    if (didFinalizeThrow) throw finalizeError;
    return buildCtx;
  } finally {
    orchestration.completeConstructionCorrectionFeedback(!didBuildThrow && !didFinalizeThrow);
  }
}
