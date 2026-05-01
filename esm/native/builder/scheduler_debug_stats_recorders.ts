import type { BuildStateLike, BuilderSchedulerStateInternalLike } from '../../../types/index.js';

import { type SchedulerPendingPlan } from './scheduler_shared.js';
import {
  ensureBuildDebugStats,
  getReasonStats,
  normalizeBuildReason,
} from './scheduler_debug_stats_reason_store.js';
import { readPendingSignature, readStateSignature } from './scheduler_debug_stats_signature_policy.js';

export function recordSkippedDuplicatePendingRequest(
  state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown
): string {
  const reason = normalizeBuildReason(reasonIn);
  const stats = ensureBuildDebugStats(state);
  const perReason = getReasonStats(stats, reason);

  stats.skippedDuplicatePendingRequestCount += 1;
  perReason.skippedDuplicatePendingRequestCount += 1;

  return reason;
}

export function recordDebouncedSchedule(
  state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown,
  reusedExistingSchedule = false
): string {
  const reason = normalizeBuildReason(reasonIn);
  const stats = ensureBuildDebugStats(state);
  const perReason = getReasonStats(stats, reason);

  if (reusedExistingSchedule) {
    stats.reusedDebouncedScheduleCount += 1;
    perReason.reusedDebouncedScheduleCount += 1;
    return reason;
  }

  stats.debouncedScheduleCount += 1;
  perReason.debouncedScheduleCount += 1;
  return reason;
}

export function recordBuilderWaitSchedule(
  state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown
): string {
  const reason = normalizeBuildReason(reasonIn);
  const stats = ensureBuildDebugStats(state);
  const perReason = getReasonStats(stats, reason);

  stats.builderWaitScheduleCount += 1;
  perReason.builderWaitScheduleCount += 1;
  return reason;
}

export function recordStaleDebouncedTimerFire(
  state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown
): string {
  const reason = normalizeBuildReason(reasonIn);
  const stats = ensureBuildDebugStats(state);
  const perReason = getReasonStats(stats, reason);

  stats.staleDebouncedTimerFireCount += 1;
  perReason.staleDebouncedTimerFireCount += 1;
  return reason;
}

export function recordStaleBuilderWaitWakeup(
  state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown
): string {
  const reason = normalizeBuildReason(reasonIn);
  const stats = ensureBuildDebugStats(state);
  const perReason = getReasonStats(stats, reason);

  stats.staleBuilderWaitWakeupCount += 1;
  perReason.staleBuilderWaitWakeupCount += 1;
  return reason;
}

export function recordSkippedSatisfiedRequest(
  state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown
): string {
  const reason = normalizeBuildReason(reasonIn);
  const stats = ensureBuildDebugStats(state);
  const perReason = getReasonStats(stats, reason);

  stats.skippedSatisfiedRequestCount += 1;
  perReason.skippedSatisfiedRequestCount += 1;

  return reason;
}

export function recordBuildRequest(
  state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown,
  immediate: boolean,
  nextPlan: SchedulerPendingPlan,
  requestTs: number
): string {
  const reason = normalizeBuildReason(reasonIn);
  const stats = ensureBuildDebugStats(state);
  const perReason = getReasonStats(stats, reason);
  const hadPending = !!state.pendingPlan;
  const nextSig = readPendingSignature(nextPlan);
  const pendingSig = readPendingSignature(state.pendingPlan);

  stats.requestCount += 1;
  if (immediate) stats.immediateRequestCount += 1;
  else stats.debouncedRequestCount += 1;
  stats.lastRequestReason = reason;

  perReason.requestCount += 1;
  if (immediate) perReason.immediateRequestCount += 1;
  else perReason.debouncedRequestCount += 1;
  perReason.lastRequestTs = requestTs;

  if (hadPending) {
    stats.pendingOverwriteCount += 1;
    perReason.overwriteCount += 1;
  }

  if (hadPending && nextSig !== null && Object.is(pendingSig, nextSig)) {
    stats.duplicatePendingSignatureCount += 1;
    perReason.duplicatePendingSignatureCount += 1;
  }

  return reason;
}

export function recordBuildExecute(
  state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown,
  immediate: boolean,
  buildState: BuildStateLike,
  execTs: number
): string {
  const reason = normalizeBuildReason(reasonIn);
  const stats = ensureBuildDebugStats(state);
  const perReason = getReasonStats(stats, reason);
  const sig = readStateSignature(buildState);

  stats.executeCount += 1;
  if (immediate) stats.executeImmediateCount += 1;
  else stats.executeDebouncedCount += 1;
  stats.lastExecuteReason = reason;

  perReason.executeCount += 1;
  if (immediate) perReason.executeImmediateCount += 1;
  else perReason.executeDebouncedCount += 1;
  perReason.lastExecuteTs = execTs;

  if (sig !== null && Object.is(state.lastExecutedSignature, sig)) {
    stats.repeatedExecuteCount += 1;
    perReason.repeatedExecuteCount += 1;
  }
  state.lastExecutedSignature = sig;

  return reason;
}

export function recordSkippedRepeatedExecute(
  state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown
): string {
  const reason = normalizeBuildReason(reasonIn);
  const stats = ensureBuildDebugStats(state);
  const perReason = getReasonStats(stats, reason);

  stats.skippedRepeatedExecuteCount += 1;
  perReason.skippedRepeatedExecuteCount += 1;

  return reason;
}
