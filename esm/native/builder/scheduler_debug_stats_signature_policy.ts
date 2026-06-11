import type { BuildStateLike, BuilderSchedulerStateInternalLike } from '../../../types/index.js';

import {
  type SchedulerPendingPlan,
  readBuildSignature,
  readPlanInputFingerprint,
  readPlanState,
} from './scheduler_shared.js';
import { readBuildInputFingerprintFromState } from './build_input_fingerprint.js';

export function readBuildInputFingerprint(state: BuildStateLike | null | undefined): unknown {
  return readBuildInputFingerprintFromState(state, next => readBuildSignature(next as BuildStateLike));
}

export function readStateInputFingerprint(state: BuildStateLike | null | undefined): unknown {
  return readBuildInputFingerprint(state);
}

export function readPendingSignature(plan: SchedulerPendingPlan | null | undefined): unknown {
  if (!plan) return null;
  const fingerprint = readPlanInputFingerprint(plan);
  if (fingerprint !== null) return fingerprint;
  return readStateInputFingerprint(readPlanState(plan));
}

export function hasDuplicatePendingSignature(
  state: BuilderSchedulerStateInternalLike,
  nextPlan: SchedulerPendingPlan
): boolean {
  if (!state.pendingPlan) return false;
  const nextSig = readPendingSignature(nextPlan);
  if (nextSig === null) return false;
  return Object.is(readPendingSignature(state.pendingPlan), nextSig);
}

export function shouldSuppressDuplicatePendingRequest(
  state: BuilderSchedulerStateInternalLike,
  nextPlan: SchedulerPendingPlan,
  immediate: boolean,
  forceBuild: boolean
): boolean {
  if (immediate || forceBuild || state.pendingImmediate) return false;
  if (!state.debouncedRunScheduled) return false;
  return hasDuplicatePendingSignature(state, nextPlan);
}

export function hasRepeatedExecuteSignature(
  state: BuilderSchedulerStateInternalLike,
  buildState: BuildStateLike
): boolean {
  const sig = readStateInputFingerprint(buildState);
  return sig !== null && Object.is(state.lastExecutedSignature, sig);
}

export function shouldSuppressSatisfiedRequest(
  state: BuilderSchedulerStateInternalLike,
  buildState: BuildStateLike,
  immediate: boolean,
  forceBuild: boolean
): boolean {
  if (immediate || forceBuild) return false;
  if (state.pendingPlan || state.debouncedRunScheduled || state.waitingForBuilder) return false;
  return hasRepeatedExecuteSignature(state, buildState);
}

export function shouldSuppressRepeatedExecute(
  state: BuilderSchedulerStateInternalLike,
  buildState: BuildStateLike,
  immediate: boolean,
  forceBuild: boolean,
  allowImmediate = false
): boolean {
  if (forceBuild) return false;
  if (immediate && !allowImmediate) return false;
  return hasRepeatedExecuteSignature(state, buildState);
}
