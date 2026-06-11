import { queueMicrotaskMaybe } from '../runtime/api.js';
import { asRecord } from '../runtime/record.js';
import { readBuildDedupeSignatureFromArgs } from './build_dedupe_signature.js';
import { requireBuilderService } from '../runtime/builder_service_access.js';
import { getRenderer } from '../runtime/render_access.js';
import { getBuildReactionsServiceMaybe } from '../runtime/build_reactions_access.js';
import { getPlatformReportError } from '../runtime/platform_access.js';

import type { AppContainer, RendererLike, UnknownCallable } from '../../../types';

type AnyRecord = Record<string, unknown>;

type BuildRunnerSoftErrorExtra = {
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

export type CoalescedBuildOpts = {
  App: AppContainer;
  bwFn: CoalescedBuildFn;
  args: readonly unknown[];
  run: () => unknown;
};

export type CoalescedBuildDecision =
  | { kind: 'skip' }
  | { kind: 'queued' }
  | { kind: 'run'; signature: unknown };

export type PendingCoalescedReplay = {
  args: readonly unknown[];
  pendingSignature: unknown;
};

export type BuildRunnerShadowAutoUpdateState = {
  shadowMap: ShadowMapLike | null;
  hadShadowAuto: boolean;
  prevShadowAuto: boolean;
};

function readRecord(value: unknown): AnyRecord | null {
  return asRecord<AnyRecord>(value);
}

function readBuildRunnerSignatureValue(state: unknown): unknown {
  const stateRec = readRecord(state);
  const buildRec = readRecord(stateRec?.build);
  return Object.prototype.hasOwnProperty.call(buildRec || {}, 'signature') ? buildRec?.signature : null;
}

function reportBuildRunnerSoftError(
  App: AppContainer | null | undefined,
  where: string,
  error: unknown,
  extra?: BuildRunnerSoftErrorExtra
): void {
  try {
    const reportError = getPlatformReportError(App);
    if (reportError) {
      reportError(error, { where, fatal: false, ...(extra || {}) });
    }
  } catch {
    // swallow
  }
}

function readBuildRunnerShadowMap(App: AppContainer): ShadowMapLike | null {
  const renderer = asRecord<RendererWithShadowMap>(getRenderer(App));
  return asRecord<ShadowMapLike>(renderer?.shadowMap);
}

export function readBuildRunnerShadowAutoUpdateState(App: AppContainer): BuildRunnerShadowAutoUpdateState {
  const shadowMap = readBuildRunnerShadowMap(App);
  const hadShadowAuto = !!(shadowMap && Object.prototype.hasOwnProperty.call(shadowMap, 'autoUpdate'));
  const prevShadowAuto = hadShadowAuto ? !!shadowMap?.autoUpdate : false;
  return {
    shadowMap,
    hadShadowAuto,
    prevShadowAuto,
  };
}

export function disableBuildRunnerShadowAutoUpdate(
  App: AppContainer,
  state: BuildRunnerShadowAutoUpdateState
): void {
  if (!state.shadowMap || !state.hadShadowAuto) return;
  try {
    state.shadowMap.autoUpdate = false;
  } catch (error) {
    reportBuildRunnerSoftError(App, 'native/builder/build_runner.disableShadowAutoUpdate', error);
  }
}

export function restoreBuildRunnerShadowAutoUpdate(
  App: AppContainer,
  state: BuildRunnerShadowAutoUpdateState,
  runErr: unknown
): void {
  if (!state.shadowMap || !state.hadShadowAuto) return;
  try {
    state.shadowMap.autoUpdate = state.prevShadowAuto;
  } catch (error) {
    reportBuildRunnerSoftError(App, 'native/builder/build_runner.restoreShadowAutoUpdate', error, {
      preserveOriginalBuildError: !!runErr,
    });
  }
}

export function runBuildRunnerPostBuildReactions(
  App: AppContainer,
  ok: boolean,
  preserveOriginalBuildError: boolean
): void {
  try {
    const svc = getBuildReactionsServiceMaybe(App);
    const fn = svc && typeof svc.afterBuild === 'function' ? svc.afterBuild : null;
    if (!fn) return;
    fn.call(svc, ok);
  } catch (error) {
    reportBuildRunnerSoftError(App, 'native/builder/build_runner.afterBuildReactions', error, {
      preserveOriginalBuildError,
    });
  }
}

export function readBuildRunnerArgsSignature(args: readonly unknown[]): unknown {
  return readBuildDedupeSignatureFromArgs(args, readBuildRunnerSignatureValue);
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

function scheduleMicrotask(App: AppContainer, fn: () => void): void {
  const enqueue = queueMicrotaskMaybe(App);
  if (typeof enqueue === 'function') {
    enqueue(fn);
    return;
  }
  Promise.resolve().then(fn);
}

export function schedulePendingCoalescedReplay(
  App: AppContainer,
  bwFn: CoalescedBuildFn,
  args: readonly unknown[]
): void {
  scheduleMicrotask(App, () => {
    const bsvc = requireBuilderService(App, 'builder/build_runner.coalesced');
    bwFn.apply(bsvc, Array.isArray(args) ? args : []);
  });
}

export function finalizeCoalescedBuildRunRuntime(
  App: AppContainer,
  bwFn: CoalescedBuildFn,
  runErr: unknown
): void {
  finishCoalescedBuildRun(bwFn);
  runBuildRunnerPostBuildReactions(App, !runErr, !!runErr);
  const pendingReplay = takePendingCoalescedReplay(bwFn);
  if (pendingReplay) {
    schedulePendingCoalescedReplay(App, bwFn, pendingReplay.args);
  }
}
