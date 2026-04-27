import type {
  BuildStateLike,
  BuilderDebugStatsLike,
  BuildReasonDebugStatLike,
  BuildDebugBudgetSummaryLike,
  BuilderSchedulerStateInternalLike,
} from '../../../types/index.js';

import {
  type AnyObj,
  type SchedulerPendingPlan,
  readBuildSignature,
  readPlanState,
  readObject,
} from './scheduler_shared.js';
import { readBuildDedupeSignatureFromState } from './build_dedupe_signature.js';

export type BuildStatsReasonMap = Record<string, BuildReasonDebugStatLike>;

type ReasonStatNumericKey =
  | 'requestCount'
  | 'immediateRequestCount'
  | 'debouncedRequestCount'
  | 'executeCount'
  | 'executeImmediateCount'
  | 'executeDebouncedCount'
  | 'overwriteCount'
  | 'debouncedScheduleCount'
  | 'reusedDebouncedScheduleCount'
  | 'builderWaitScheduleCount'
  | 'staleDebouncedTimerFireCount'
  | 'staleBuilderWaitWakeupCount'
  | 'duplicatePendingSignatureCount'
  | 'skippedDuplicatePendingRequestCount'
  | 'skippedSatisfiedRequestCount'
  | 'repeatedExecuteCount'
  | 'skippedRepeatedExecuteCount'
  | 'lastRequestTs'
  | 'lastExecuteTs';

export function nowForBuildStats(): number {
  try {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  } catch {
    return Date.now();
  }
}

export function normalizeBuildReason(reasonIn: unknown): string {
  const value = typeof reasonIn === 'string' ? reasonIn.trim() : '';
  return value || 'unknown';
}

export function readBuildDedupeSignature(state: BuildStateLike | null | undefined): unknown {
  return readBuildDedupeSignatureFromState(state, next => readBuildSignature(next as BuildStateLike));
}

function createReasonDebugStat(reason: string): BuildReasonDebugStatLike {
  return {
    reason,
    requestCount: 0,
    immediateRequestCount: 0,
    debouncedRequestCount: 0,
    executeCount: 0,
    executeImmediateCount: 0,
    executeDebouncedCount: 0,
    overwriteCount: 0,
    debouncedScheduleCount: 0,
    reusedDebouncedScheduleCount: 0,
    builderWaitScheduleCount: 0,
    staleDebouncedTimerFireCount: 0,
    staleBuilderWaitWakeupCount: 0,
    duplicatePendingSignatureCount: 0,
    skippedDuplicatePendingRequestCount: 0,
    skippedSatisfiedRequestCount: 0,
    repeatedExecuteCount: 0,
    skippedRepeatedExecuteCount: 0,
    lastRequestTs: 0,
    lastExecuteTs: 0,
  };
}

export function createBuildDebugStats(): BuilderDebugStatsLike {
  return {
    requestCount: 0,
    immediateRequestCount: 0,
    debouncedRequestCount: 0,
    executeCount: 0,
    executeImmediateCount: 0,
    executeDebouncedCount: 0,
    pendingOverwriteCount: 0,
    debouncedScheduleCount: 0,
    reusedDebouncedScheduleCount: 0,
    builderWaitScheduleCount: 0,
    staleDebouncedTimerFireCount: 0,
    staleBuilderWaitWakeupCount: 0,
    duplicatePendingSignatureCount: 0,
    skippedDuplicatePendingRequestCount: 0,
    skippedSatisfiedRequestCount: 0,
    repeatedExecuteCount: 0,
    skippedRepeatedExecuteCount: 0,
    lastRequestReason: '',
    lastExecuteReason: '',
    reasons: {},
  };
}

export function ensureBuildDebugStats(state: BuilderSchedulerStateInternalLike): BuilderDebugStatsLike {
  if (!state.debugStats) state.debugStats = createBuildDebugStats();
  return state.debugStats;
}

function readReasonStatNumber(rec: AnyObj, key: ReasonStatNumericKey): number | null {
  const value = rec[key];
  return typeof value === 'number' ? value : null;
}

function readReasonStat(value: unknown): BuildReasonDebugStatLike | null {
  const rec = readObject(value);
  if (!rec) return null;
  const numericKeys: ReasonStatNumericKey[] = [
    'requestCount',
    'immediateRequestCount',
    'debouncedRequestCount',
    'executeCount',
    'executeImmediateCount',
    'executeDebouncedCount',
    'overwriteCount',
    'debouncedScheduleCount',
    'reusedDebouncedScheduleCount',
    'builderWaitScheduleCount',
    'staleDebouncedTimerFireCount',
    'staleBuilderWaitWakeupCount',
    'duplicatePendingSignatureCount',
    'skippedDuplicatePendingRequestCount',
    'skippedSatisfiedRequestCount',
    'repeatedExecuteCount',
    'skippedRepeatedExecuteCount',
    'lastRequestTs',
    'lastExecuteTs',
  ];
  if (typeof rec.reason !== 'string') return null;
  for (const key of numericKeys) {
    if (readReasonStatNumber(rec, key) == null) return null;
  }
  const requestCount = readReasonStatNumber(rec, 'requestCount');
  const immediateRequestCount = readReasonStatNumber(rec, 'immediateRequestCount');
  const debouncedRequestCount = readReasonStatNumber(rec, 'debouncedRequestCount');
  const executeCount = readReasonStatNumber(rec, 'executeCount');
  const executeImmediateCount = readReasonStatNumber(rec, 'executeImmediateCount');
  const executeDebouncedCount = readReasonStatNumber(rec, 'executeDebouncedCount');
  const overwriteCount = readReasonStatNumber(rec, 'overwriteCount');
  const debouncedScheduleCount = readReasonStatNumber(rec, 'debouncedScheduleCount');
  const reusedDebouncedScheduleCount = readReasonStatNumber(rec, 'reusedDebouncedScheduleCount');
  const builderWaitScheduleCount = readReasonStatNumber(rec, 'builderWaitScheduleCount');
  const staleDebouncedTimerFireCount = readReasonStatNumber(rec, 'staleDebouncedTimerFireCount');
  const staleBuilderWaitWakeupCount = readReasonStatNumber(rec, 'staleBuilderWaitWakeupCount');
  const duplicatePendingSignatureCount = readReasonStatNumber(rec, 'duplicatePendingSignatureCount');
  const skippedDuplicatePendingRequestCount = readReasonStatNumber(
    rec,
    'skippedDuplicatePendingRequestCount'
  );
  const skippedSatisfiedRequestCount = readReasonStatNumber(rec, 'skippedSatisfiedRequestCount');
  const repeatedExecuteCount = readReasonStatNumber(rec, 'repeatedExecuteCount');
  const skippedRepeatedExecuteCount = readReasonStatNumber(rec, 'skippedRepeatedExecuteCount');
  const lastRequestTs = readReasonStatNumber(rec, 'lastRequestTs');
  const lastExecuteTs = readReasonStatNumber(rec, 'lastExecuteTs');
  if (
    requestCount == null ||
    immediateRequestCount == null ||
    debouncedRequestCount == null ||
    executeCount == null ||
    executeImmediateCount == null ||
    executeDebouncedCount == null ||
    overwriteCount == null ||
    debouncedScheduleCount == null ||
    reusedDebouncedScheduleCount == null ||
    builderWaitScheduleCount == null ||
    staleDebouncedTimerFireCount == null ||
    staleBuilderWaitWakeupCount == null ||
    duplicatePendingSignatureCount == null ||
    skippedDuplicatePendingRequestCount == null ||
    skippedSatisfiedRequestCount == null ||
    repeatedExecuteCount == null ||
    skippedRepeatedExecuteCount == null ||
    lastRequestTs == null ||
    lastExecuteTs == null
  ) {
    return null;
  }
  return {
    reason: rec.reason,
    requestCount,
    immediateRequestCount,
    debouncedRequestCount,
    executeCount,
    executeImmediateCount,
    executeDebouncedCount,
    overwriteCount,
    debouncedScheduleCount,
    reusedDebouncedScheduleCount,
    builderWaitScheduleCount,
    staleDebouncedTimerFireCount,
    staleBuilderWaitWakeupCount,
    duplicatePendingSignatureCount,
    skippedDuplicatePendingRequestCount,
    skippedSatisfiedRequestCount,
    repeatedExecuteCount,
    skippedRepeatedExecuteCount,
    lastRequestTs,
    lastExecuteTs,
  };
}

function getReasonStatsMap(value: unknown): BuildStatsReasonMap {
  const rec = readObject(value);
  if (!rec) return {};
  const out: BuildStatsReasonMap = {};
  for (const key of Object.keys(rec)) {
    const entry = readReasonStat(rec[key]);
    if (entry) out[key] = entry;
  }
  return out;
}

function ensureReasonStatsMap(stats: BuilderDebugStatsLike): BuildStatsReasonMap {
  const reasons = getReasonStatsMap(stats.reasons);
  stats.reasons = reasons;
  return reasons;
}

function getReasonStats(stats: BuilderDebugStatsLike, reason: string): BuildReasonDebugStatLike {
  const reasons = ensureReasonStatsMap(stats);
  if (!reasons[reason]) reasons[reason] = createReasonDebugStat(reason);
  return reasons[reason];
}

export function cloneBuildDebugStats(stats: BuilderDebugStatsLike): BuilderDebugStatsLike {
  return {
    ...stats,
    reasons: { ...getReasonStatsMap(stats.reasons) },
  };
}

function readStateSignature(state: BuildStateLike | null | undefined): unknown {
  return readBuildDedupeSignature(state);
}

function readPendingSignature(plan: SchedulerPendingPlan): unknown {
  return readStateSignature(readPlanState(plan));
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

export function hasRepeatedExecuteSignature(
  state: BuilderSchedulerStateInternalLike,
  buildState: BuildStateLike
): boolean {
  const sig = readStateSignature(buildState);
  return sig !== null && Object.is(state.lastExecutedSignature, sig);
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

export function summarizeBuildDebugBudget(
  stats: BuilderDebugStatsLike | null | undefined
): BuildDebugBudgetSummaryLike {
  const requestCount = typeof stats?.requestCount === 'number' ? Math.max(0, stats.requestCount) : 0;
  const executeCount = typeof stats?.executeCount === 'number' ? Math.max(0, stats.executeCount) : 0;
  const skippedDuplicatePendingRequestCount =
    typeof stats?.skippedDuplicatePendingRequestCount === 'number'
      ? Math.max(0, stats.skippedDuplicatePendingRequestCount)
      : 0;
  const skippedSatisfiedRequestCount =
    typeof stats?.skippedSatisfiedRequestCount === 'number'
      ? Math.max(0, stats.skippedSatisfiedRequestCount)
      : 0;
  const skippedRepeatedExecuteCount =
    typeof stats?.skippedRepeatedExecuteCount === 'number'
      ? Math.max(0, stats.skippedRepeatedExecuteCount)
      : 0;
  const debouncedScheduleCount =
    typeof stats?.debouncedScheduleCount === 'number' ? Math.max(0, stats.debouncedScheduleCount) : 0;
  const reusedDebouncedScheduleCount =
    typeof stats?.reusedDebouncedScheduleCount === 'number'
      ? Math.max(0, stats.reusedDebouncedScheduleCount)
      : 0;
  const builderWaitScheduleCount =
    typeof stats?.builderWaitScheduleCount === 'number' ? Math.max(0, stats.builderWaitScheduleCount) : 0;
  const staleDebouncedTimerFireCount =
    typeof stats?.staleDebouncedTimerFireCount === 'number'
      ? Math.max(0, stats.staleDebouncedTimerFireCount)
      : 0;
  const staleBuilderWaitWakeupCount =
    typeof stats?.staleBuilderWaitWakeupCount === 'number'
      ? Math.max(0, stats.staleBuilderWaitWakeupCount)
      : 0;
  const staleWakeupCount = staleDebouncedTimerFireCount + staleBuilderWaitWakeupCount;
  const suppressedRequestCount = skippedDuplicatePendingRequestCount + skippedSatisfiedRequestCount;
  const suppressedExecuteCount = skippedRepeatedExecuteCount;
  const totalDebounceEvents = debouncedScheduleCount + reusedDebouncedScheduleCount;
  const ratio = (num: number, den: number): number => (den > 0 ? Number((num / den).toFixed(4)) : 0);

  return {
    requestCount,
    executeCount,
    suppressedRequestCount,
    suppressedExecuteCount,
    duplicatePendingRate: ratio(skippedDuplicatePendingRequestCount, requestCount),
    noOpRequestRate: ratio(skippedSatisfiedRequestCount, requestCount),
    noOpExecuteRate: ratio(skippedRepeatedExecuteCount, requestCount),
    debouncedScheduleCount,
    reusedDebouncedScheduleCount,
    builderWaitScheduleCount,
    staleWakeupCount,
    debouncedScheduleReuseRate: ratio(reusedDebouncedScheduleCount, totalDebounceEvents),
  };
}
