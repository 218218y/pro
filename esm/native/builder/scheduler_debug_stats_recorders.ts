import type {
  BuildStateLike,
  BuilderDebugStatsLike,
  BuilderSchedulerStateInternalLike,
} from '../../../types/index.js';

import { type SchedulerPendingPlan } from './scheduler_shared.js';
import {
  ensureBuildDebugStats,
  getReasonStats,
  isBuildDebugStatsEnabled,
  MAX_BUILD_DURATION_SAMPLES,
  normalizeBuildReason,
} from './scheduler_debug_stats_reason_store.js';
import { readExecutionSignature, readPendingSignature } from './scheduler_debug_stats_signature_policy.js';

type BuildExecuteStatus = 'ok' | 'error';

type DurationStatsTarget = {
  executeDurationTotalMs: number;
  executeDurationAvgMs: number;
  executeDurationP95Ms: number;
  executeDurationMaxMs: number;
  executeDurationSamplesMs: number[];
};

type DurationStatsSnapshot = {
  totalMs: number;
  avgMs: number;
  p95Ms: number;
  maxMs: number;
  samplesMs: number[];
};

function normalizeDurationMs(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric * 100) / 100) : 0;
}

function percentile(values: number[], pct: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * pct) - 1));
  return sorted[rank] || 0;
}

function recordDurationSample(target: DurationStatsTarget, durationMsIn: unknown): void {
  const durationMs = normalizeDurationMs(durationMsIn);
  const samples = Array.isArray(target.executeDurationSamplesMs) ? target.executeDurationSamplesMs : [];
  samples.push(durationMs);
  if (samples.length > MAX_BUILD_DURATION_SAMPLES) {
    samples.splice(0, samples.length - MAX_BUILD_DURATION_SAMPLES);
  }
  target.executeDurationSamplesMs = samples;
  target.executeDurationTotalMs = normalizeDurationMs(samples.reduce((sum, value) => sum + value, 0));
  target.executeDurationAvgMs = normalizeDurationMs(target.executeDurationTotalMs / samples.length);
  target.executeDurationP95Ms = normalizeDurationMs(percentile(samples, 0.95));
  target.executeDurationMaxMs = samples.length ? Math.max(...samples) : 0;
}

function createDurationSnapshot(samplesIn: unknown, durationMsIn: unknown): DurationStatsSnapshot {
  const durationMs = normalizeDurationMs(durationMsIn);
  const samplesMs = Array.isArray(samplesIn)
    ? samplesIn
        .map(item => (Number.isFinite(Number(item)) ? normalizeDurationMs(item) : null))
        .filter((item): item is number => item !== null)
    : [];
  samplesMs.push(durationMs);
  if (samplesMs.length > MAX_BUILD_DURATION_SAMPLES) {
    samplesMs.splice(0, samplesMs.length - MAX_BUILD_DURATION_SAMPLES);
  }
  const totalMs = normalizeDurationMs(samplesMs.reduce((sum, value) => sum + value, 0));
  return {
    totalMs,
    avgMs: normalizeDurationMs(totalMs / samplesMs.length),
    p95Ms: normalizeDurationMs(percentile(samplesMs, 0.95)),
    maxMs: samplesMs.length ? Math.max(...samplesMs) : 0,
    samplesMs,
  };
}

function recordSplitDurationSample(
  stats: BuilderDebugStatsLike,
  prefix: 'executeImmediate' | 'executeDebounced' | 'executeForce' | 'executeNonForce',
  durationMs: number
): void {
  if (prefix === 'executeImmediate') {
    const next = createDurationSnapshot(stats.executeImmediateDurationSamplesMs, durationMs);
    stats.executeImmediateDurationTotalMs = next.totalMs;
    stats.executeImmediateDurationAvgMs = next.avgMs;
    stats.executeImmediateDurationP95Ms = next.p95Ms;
    stats.executeImmediateDurationMaxMs = next.maxMs;
    stats.executeImmediateDurationSamplesMs = next.samplesMs;
    return;
  }
  if (prefix === 'executeDebounced') {
    const next = createDurationSnapshot(stats.executeDebouncedDurationSamplesMs, durationMs);
    stats.executeDebouncedDurationTotalMs = next.totalMs;
    stats.executeDebouncedDurationAvgMs = next.avgMs;
    stats.executeDebouncedDurationP95Ms = next.p95Ms;
    stats.executeDebouncedDurationMaxMs = next.maxMs;
    stats.executeDebouncedDurationSamplesMs = next.samplesMs;
    return;
  }
  if (prefix === 'executeForce') {
    const next = createDurationSnapshot(stats.executeForceDurationSamplesMs, durationMs);
    stats.executeForceDurationTotalMs = next.totalMs;
    stats.executeForceDurationAvgMs = next.avgMs;
    stats.executeForceDurationP95Ms = next.p95Ms;
    stats.executeForceDurationMaxMs = next.maxMs;
    stats.executeForceDurationSamplesMs = next.samplesMs;
    return;
  }
  const next = createDurationSnapshot(stats.executeNonForceDurationSamplesMs, durationMs);
  stats.executeNonForceDurationTotalMs = next.totalMs;
  stats.executeNonForceDurationAvgMs = next.avgMs;
  stats.executeNonForceDurationP95Ms = next.p95Ms;
  stats.executeNonForceDurationMaxMs = next.maxMs;
  stats.executeNonForceDurationSamplesMs = next.samplesMs;
}

export function recordSkippedDuplicatePendingRequest(
  state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown
): string {
  const reason = normalizeBuildReason(reasonIn);
  if (!isBuildDebugStatsEnabled()) return reason;
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
  if (!isBuildDebugStatsEnabled()) return reason;
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
  if (!isBuildDebugStatsEnabled()) return reason;
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
  if (!isBuildDebugStatsEnabled()) return reason;
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
  if (!isBuildDebugStatsEnabled()) return reason;
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
  if (!isBuildDebugStatsEnabled()) return reason;
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
  forceBuild: boolean,
  nextPlan: SchedulerPendingPlan,
  requestTs: number
): string {
  const reason = normalizeBuildReason(reasonIn);
  if (!isBuildDebugStatsEnabled()) return reason;
  const stats = ensureBuildDebugStats(state);
  const perReason = getReasonStats(stats, reason);
  const hadPending = !!state.pendingPlan;
  const nextSig = readPendingSignature(nextPlan);
  const pendingSig = readPendingSignature(state.pendingPlan);

  stats.requestCount += 1;
  if (immediate) {
    stats.immediateRequestCount += 1;
    if (forceBuild) stats.immediateForceRequestCount += 1;
    else stats.immediateNonForceRequestCount += 1;
  } else {
    stats.debouncedRequestCount += 1;
    if (forceBuild) stats.debouncedForceRequestCount += 1;
    else stats.debouncedNonForceRequestCount += 1;
  }
  if (forceBuild) stats.forceRequestCount += 1;
  stats.lastRequestReason = reason;

  perReason.requestCount += 1;
  if (immediate) {
    perReason.immediateRequestCount += 1;
    if (forceBuild) perReason.immediateForceRequestCount += 1;
    else perReason.immediateNonForceRequestCount += 1;
  } else {
    perReason.debouncedRequestCount += 1;
    if (forceBuild) perReason.debouncedForceRequestCount += 1;
    else perReason.debouncedNonForceRequestCount += 1;
  }
  if (forceBuild) perReason.forceRequestCount += 1;
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
  forceBuild: boolean,
  buildState: BuildStateLike,
  execTs: number,
  plan?: SchedulerPendingPlan | null
): string {
  const reason = normalizeBuildReason(reasonIn);
  const sig = readExecutionSignature(plan, buildState);

  if (!isBuildDebugStatsEnabled()) {
    state.lastExecutedSignature = sig;
    return reason;
  }

  const stats = ensureBuildDebugStats(state);
  const perReason = getReasonStats(stats, reason);

  stats.executeCount += 1;
  if (immediate) {
    stats.executeImmediateCount += 1;
    if (forceBuild) stats.executeImmediateForceCount += 1;
    else stats.executeImmediateNonForceCount += 1;
  } else {
    stats.executeDebouncedCount += 1;
    if (forceBuild) stats.executeDebouncedForceCount += 1;
    else stats.executeDebouncedNonForceCount += 1;
  }
  if (forceBuild) stats.executeForceCount += 1;
  stats.lastExecuteReason = reason;

  perReason.executeCount += 1;
  if (immediate) {
    perReason.executeImmediateCount += 1;
    if (forceBuild) perReason.executeImmediateForceCount += 1;
    else perReason.executeImmediateNonForceCount += 1;
  } else {
    perReason.executeDebouncedCount += 1;
    if (forceBuild) perReason.executeDebouncedForceCount += 1;
    else perReason.executeDebouncedNonForceCount += 1;
  }
  if (forceBuild) perReason.executeForceCount += 1;
  perReason.lastExecuteTs = execTs;

  if (sig !== null && Object.is(state.lastExecutedSignature, sig)) {
    stats.repeatedExecuteCount += 1;
    perReason.repeatedExecuteCount += 1;
  }
  state.lastExecutedSignature = sig;

  return reason;
}

export function recordBuildExecuteDuration(
  state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown,
  immediate: boolean,
  forceBuild: boolean,
  durationMsIn: unknown,
  status: BuildExecuteStatus
): string {
  const reason = normalizeBuildReason(reasonIn);
  if (!isBuildDebugStatsEnabled()) return reason;
  const stats = ensureBuildDebugStats(state);
  const perReason = getReasonStats(stats, reason);
  const durationMs = normalizeDurationMs(durationMsIn);

  if (status === 'ok') {
    stats.executeSuccessCount += 1;
    perReason.executeSuccessCount += 1;
  } else {
    stats.executeFailureCount += 1;
    perReason.executeFailureCount += 1;
  }
  stats.lastExecuteStatus = status;
  perReason.lastExecuteStatus = status;

  recordDurationSample(stats, durationMs);
  recordDurationSample(perReason, durationMs);
  recordSplitDurationSample(stats, immediate ? 'executeImmediate' : 'executeDebounced', durationMs);
  recordSplitDurationSample(stats, forceBuild ? 'executeForce' : 'executeNonForce', durationMs);

  return reason;
}

export function recordSkippedRepeatedExecute(
  state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown
): string {
  const reason = normalizeBuildReason(reasonIn);
  if (!isBuildDebugStatsEnabled()) return reason;
  const stats = ensureBuildDebugStats(state);
  const perReason = getReasonStats(stats, reason);

  stats.skippedRepeatedExecuteCount += 1;
  perReason.skippedRepeatedExecuteCount += 1;

  return reason;
}
