// Build runner with coalescing + renderer shadowMap autoUpdate gating
//
// Centralizes the "only one build at a time" behavior used by buildWardrobe,
// and ensures renderer state is restored even when builds throw.
//
// This module is intentionally dependency-light and delegates hot-path side
// effects to build_runner_runtime.

import type { AppContainer, UnknownCallable } from '../../../types';

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

type CoalescedBuildOpts = {
  App: AppContainer;
  bwFn: CoalescedBuildFn;
  args: readonly unknown[];
  run: () => unknown;
};

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
 *   App: AppContainer,
 *   bwFn: CoalescedBuildFn,
 *   args: readonly unknown[],
 *   run: ()=>unknown,
 * }} opts
 */
export function runCoalescedBuild(opts: CoalescedBuildOpts): unknown {
  if (!opts || !opts.App || typeof opts.run !== 'function' || typeof opts.bwFn !== 'function') {
    throw new Error('[builder/build_runner] Invalid arguments');
  }

  const { App, bwFn, args, run } = opts;
  const nextArgs = Array.isArray(args) ? args : [];
  const nextSignature = readBuildRunnerArgsSignature(nextArgs);
  const decision = stageCoalescedBuildRequest(bwFn, nextArgs, nextSignature);
  if (decision.kind !== 'run') return;

  const shadowState = readBuildRunnerShadowAutoUpdateState(App);
  disableBuildRunnerShadowAutoUpdate(App, shadowState);

  let result: unknown;
  let runErr: unknown = null;

  try {
    result = run();
  } catch (error) {
    runErr = error;
  } finally {
    restoreBuildRunnerShadowAutoUpdate(App, shadowState, runErr);
    finalizeCoalescedBuildRunRuntime(App, bwFn, runErr);
  }

  if (runErr) throw runErr;
  return result;
}
