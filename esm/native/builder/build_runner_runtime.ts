import { queueMicrotaskMaybe } from '../runtime/api.js';
import { asRecord } from '../runtime/record.js';
import { readBuildInputFingerprintFromArgs } from './build_input_fingerprint.js';
import { readBuildStructureSignature } from './build_structure_signature.js';
import { requireBuilderService } from '../runtime/builder_service_access.js';
import { getRenderer } from '../runtime/render_access.js';
import { getBuildReactionsServiceMaybe } from '../runtime/build_reactions_access.js';
import { getPlatformReportError } from '../runtime/platform_access.js';

import type { AppContainer, RendererLike, UnknownCallable } from '../../../types';

export type BuildRunnerSoftErrorExtra = {
  preserveOriginalBuildError?: boolean;
};

type ShadowMapLike = {
  autoUpdate?: boolean;
};

type RendererWithShadowMap = RendererLike & {
  shadowMap?: ShadowMapLike | null;
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
  shadowMap: ShadowMapLike | null;
  hadShadowAuto: boolean;
  prevShadowAuto: boolean;
};

export type BuildRunnerRuntimeContext = Readonly<{
  readShadowMap: () => ShadowMapLike | null;
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
  context.reportSoftError(where, error, extra);
}

export function createBuildRunnerRuntimeContext(App: AppContainer): BuildRunnerRuntimeContext {
  const reportSoftError = (where: string, error: unknown, extra?: BuildRunnerSoftErrorExtra): void => {
    try {
      const reportError = getPlatformReportError(App);
      if (reportError) reportError(error, { where, fatal: false, ...extra });
    } catch {
      // Diagnostics are observational and cannot change the build result.
    }
  };
  return Object.freeze({
    readShadowMap: () => {
      const renderer = asRecord<RendererWithShadowMap>(getRenderer(App));
      return asRecord<ShadowMapLike>(renderer?.shadowMap);
    },
    reportSoftError,
    runPostBuildReactions: (ok, preserveOriginalBuildError) => {
      try {
        const service = getBuildReactionsServiceMaybe(App);
        const afterBuild = service && typeof service.afterBuild === 'function' ? service.afterBuild : null;
        if (afterBuild) afterBuild.call(service, ok);
      } catch (error) {
        reportSoftError('native/builder/build_runner.afterBuildReactions', error, {
          preserveOriginalBuildError,
        });
      }
    },
    scheduleMicrotask: fn => {
      const enqueue = queueMicrotaskMaybe(App);
      if (typeof enqueue === 'function') enqueue(fn);
      else void Promise.resolve().then(fn);
    },
    replayBuild: (bwFn, args) => {
      const builder = requireBuilderService(App, 'builder/build_runner.coalesced');
      bwFn.apply(builder, Array.isArray(args) ? args : []);
    },
  });
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
  context.runPostBuildReactions(ok, preserveOriginalBuildError);
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
  context.scheduleMicrotask(() => context.replayBuild(bwFn, args));
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
