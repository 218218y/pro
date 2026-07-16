import { readBuildInputFingerprintFromArgs } from './build_input_fingerprint.js';
import { readBuildStructureSignature } from './build_structure_signature.js';

import type { UnknownCallable } from '../../../types';

export type BuildRunnerSoftErrorExtra = {
  preserveOriginalBuildError?: boolean;
};

export type BuildRunnerShadowMapLike = {
  autoUpdate?: boolean;
};

export type CoalescedBuildFn = UnknownCallable & {
  __lastArgs?: readonly unknown[];
  __buildRunning?: boolean;
  __buildPending?: boolean;
  __runningBuildSignature?: unknown;
  __pendingBuildSignature?: unknown;
  __lastCompletedBuildSignature?: unknown;
};

export type CoalescedBuildDecision =
  { kind: 'skip' } | { kind: 'queued' } | { kind: 'run'; signature: unknown };

export type PendingCoalescedReplay = {
  args: readonly unknown[];
  pendingSignature: unknown;
};

export type BuildRunnerShadowAutoUpdateState = {
  shadowMap: BuildRunnerShadowMapLike | null;
  hadShadowAuto: boolean;
  prevShadowAuto: boolean;
};

export type BuildRunnerRuntimeContext = Readonly<{
  readShadowMap: () => BuildRunnerShadowMapLike | null;
  reportSoftError: (where: string, error: unknown, extra?: BuildRunnerSoftErrorExtra) => void;
  runPostBuildReactions: (ok: boolean, preserveOriginalBuildError: boolean) => void;
  scheduleMicrotask: (fn: () => void) => void;
  replayBuild: (bwFn: CoalescedBuildFn, args: readonly unknown[]) => void;
}>;

function reportBuildRunnerSoftError(
  context: BuildRunnerRuntimeContext,
  where: string,
  error: unknown,
  extra?: BuildRunnerSoftErrorExtra
): void {
  try {
    context.reportSoftError(where, error, extra);
  } catch {
    // Diagnostics are observational and cannot change the build result.
  }
}

export function readBuildRunnerShadowAutoUpdateState(
  context: BuildRunnerRuntimeContext
): BuildRunnerShadowAutoUpdateState {
  const shadowMap = context.readShadowMap();
  const hadShadowAuto = !!(shadowMap && Object.prototype.hasOwnProperty.call(shadowMap, 'autoUpdate'));
  const prevShadowAuto = hadShadowAuto ? !!shadowMap?.autoUpdate : false;
  return {
    shadowMap,
    hadShadowAuto,
    prevShadowAuto,
  };
}

export function disableBuildRunnerShadowAutoUpdate(
  context: BuildRunnerRuntimeContext,
  state: BuildRunnerShadowAutoUpdateState
): void {
  if (!state.shadowMap || !state.hadShadowAuto) return;
  try {
    state.shadowMap.autoUpdate = false;
  } catch (error) {
    reportBuildRunnerSoftError(context, 'native/builder/build_runner.disableShadowAutoUpdate', error);
  }
}

export function restoreBuildRunnerShadowAutoUpdate(
  context: BuildRunnerRuntimeContext,
  state: BuildRunnerShadowAutoUpdateState,
  runErr: unknown
): void {
  if (!state.shadowMap || !state.hadShadowAuto) return;
  try {
    state.shadowMap.autoUpdate = state.prevShadowAuto;
  } catch (error) {
    reportBuildRunnerSoftError(context, 'native/builder/build_runner.restoreShadowAutoUpdate', error, {
      preserveOriginalBuildError: !!runErr,
    });
  }
}

export function runBuildRunnerPostBuildReactions(
  context: BuildRunnerRuntimeContext,
  ok: boolean,
  preserveOriginalBuildError: boolean
): void {
  try {
    context.runPostBuildReactions(ok, preserveOriginalBuildError);
  } catch (error) {
    reportBuildRunnerSoftError(context, 'native/builder/build_runner.afterBuildReactions', error, {
      preserveOriginalBuildError,
    });
  }
}

export function readBuildRunnerArgsSignature(args: readonly unknown[]): unknown {
  return readBuildInputFingerprintFromArgs(args, readBuildStructureSignature);
}

export function stageCoalescedBuildRequest(
  bwFn: CoalescedBuildFn,
  args: readonly unknown[],
  signature: unknown
): CoalescedBuildDecision {
  bwFn.__lastArgs = Array.isArray(args) ? args : [];

  if (bwFn.__buildRunning) {
    const runningSignature = bwFn.__runningBuildSignature ?? null;
    if (signature !== null && runningSignature !== null && Object.is(signature, runningSignature)) {
      bwFn.__buildPending = false;
      bwFn.__pendingBuildSignature = null;
      return { kind: 'skip' };
    }

    bwFn.__buildPending = true;
    bwFn.__pendingBuildSignature = signature;
    return { kind: 'queued' };
  }

  bwFn.__buildRunning = true;
  bwFn.__buildPending = false;
  bwFn.__runningBuildSignature = signature;
  bwFn.__pendingBuildSignature = null;
  return { kind: 'run', signature };
}

export function finishCoalescedBuildRun(bwFn: CoalescedBuildFn): void {
  bwFn.__buildRunning = false;
  bwFn.__lastCompletedBuildSignature = bwFn.__runningBuildSignature ?? null;
  bwFn.__runningBuildSignature = null;
}

export function takePendingCoalescedReplay(bwFn: CoalescedBuildFn): PendingCoalescedReplay | null {
  if (!bwFn.__buildPending) return null;

  const args = Array.isArray(bwFn.__lastArgs) ? bwFn.__lastArgs : [];
  const pendingSignature = bwFn.__pendingBuildSignature ?? null;
  const completedSignature = bwFn.__lastCompletedBuildSignature ?? null;

  bwFn.__buildPending = false;
  bwFn.__pendingBuildSignature = null;

  if (
    pendingSignature !== null &&
    completedSignature !== null &&
    Object.is(pendingSignature, completedSignature)
  ) {
    return null;
  }

  return { args, pendingSignature };
}

export function schedulePendingCoalescedReplay(
  context: BuildRunnerRuntimeContext,
  bwFn: CoalescedBuildFn,
  args: readonly unknown[]
): void {
  try {
    context.scheduleMicrotask(() => {
      try {
        context.replayBuild(bwFn, args);
      } catch (error) {
        reportBuildRunnerSoftError(context, 'native/builder/build_runner.replay', error);
      }
    });
  } catch (error) {
    reportBuildRunnerSoftError(context, 'native/builder/build_runner.replaySchedule', error);
  }
}

export function finalizeCoalescedBuildRunRuntime(
  context: BuildRunnerRuntimeContext,
  bwFn: CoalescedBuildFn,
  runErr: unknown
): void {
  finishCoalescedBuildRun(bwFn);
  runBuildRunnerPostBuildReactions(context, !runErr, !!runErr);
  const pendingReplay = takePendingCoalescedReplay(bwFn);
  if (pendingReplay) {
    schedulePendingCoalescedReplay(context, bwFn, pendingReplay.args);
  }
}
