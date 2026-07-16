// Build runner with coalescing + renderer shadowMap autoUpdate gating
//
// Centralizes the "only one build at a time" behavior used by buildWardrobe,
// and ensures renderer state is restored even when builds throw.
//
// This module is intentionally dependency-light and delegates hot-path side
// effects to build_runner_runtime.

import type { UnknownCallable } from '../../../types';
import type { BuildRunnerRuntimeContext } from './build_runner_runtime.js';

import {
  readBuildRunnerArgsSignature,
  stageCoalescedBuildRequest,
  readBuildRunnerShadowAutoUpdateState,
  disableBuildRunnerShadowAutoUpdate,
  restoreBuildRunnerShadowAutoUpdate,
  finalizeCoalescedBuildRunRuntime,
} from './build_runner_runtime.js';

type CoalescedBuildFn = UnknownCallable & {
  __lastArgs?: readonly unknown[];
  __buildRunning?: boolean;
  __buildPending?: boolean;
  __runningBuildSignature?: unknown;
  __pendingBuildSignature?: unknown;
  __lastCompletedBuildSignature?: unknown;
};

export type SynchronousBuildRun<TResult> = () => TResult;

type CoalescedBuildOpts<TResult> = {
  context: BuildRunnerRuntimeContext;
  bwFn: CoalescedBuildFn;
  args: readonly unknown[];
  run: SynchronousBuildRun<TResult>;
};

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) return false;
  return typeof (value as { then?: unknown }).then === 'function';
}

function observeUnexpectedAsyncBuild(context: BuildRunnerRuntimeContext, value: PromiseLike<unknown>): void {
  void Promise.resolve(value).catch(error => {
    try {
      context.reportSoftError('native/builder/build_runner.asyncBuildRejection', error, {
        preserveOriginalBuildError: true,
      });
    } catch {
      // The invariant error remains authoritative even if diagnostics fail.
    }
  });
}

/**
 * Run a build function with "coalescing" semantics:
 * - If a build is already running, keep only the latest requested args.
 * - If the latest requested signature matches the currently running build,
 *   suppress the pending rerun entirely.
 * - After the running build finishes, the latest pending args will run once.
 *
 * It also temporarily disables renderer.shadowMap.autoUpdate (if available)
 * and restores it afterwards.
 *
 * @param {{
 *   context: BuildRunnerRuntimeContext,
 *   bwFn: CoalescedBuildFn,
 *   args: readonly unknown[],
 *   run: ()=>unknown,
 * }} opts
 */
export function runCoalescedBuild<TResult>(opts: CoalescedBuildOpts<TResult>): TResult | undefined {
  if (!opts || !opts.context || typeof opts.run !== 'function' || typeof opts.bwFn !== 'function') {
    throw new Error('[builder/build_runner] Invalid arguments');
  }

  const { context, bwFn, args, run } = opts;
  const nextArgs = Array.isArray(args) ? args : [];
  const nextSignature = readBuildRunnerArgsSignature(nextArgs);
  const decision = stageCoalescedBuildRequest(bwFn, nextArgs, nextSignature);
  if (decision.kind !== 'run') return;

  const shadowState = readBuildRunnerShadowAutoUpdateState(context);
  disableBuildRunnerShadowAutoUpdate(context, shadowState);

  let result: TResult | undefined;
  let runErr: unknown = null;

  try {
    result = run();
    if (isPromiseLike(result)) {
      observeUnexpectedAsyncBuild(context, result);
      throw new Error('[builder/build_runner] Build callback must be synchronous');
    }
  } catch (error) {
    runErr = error;
  } finally {
    restoreBuildRunnerShadowAutoUpdate(context, shadowState, runErr);
    finalizeCoalescedBuildRunRuntime(context, bwFn, runErr);
  }

  if (runErr) throw runErr;
  return result;
}
