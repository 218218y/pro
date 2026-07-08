import type {
  BuildDebugBudgetSummaryLike,
  BuildReasonDebugStatLike,
  BuildStateLike,
  BuilderDebugStatsLike,
  BuilderSchedulerStateInternalLike,
} from '../../../types/index.js';

import { type SchedulerPendingPlan } from './scheduler_shared.js';
import {
  readBuildInputFingerprint,
  readExecutionSignature,
  hasDuplicatePendingSignature,
  hasRepeatedExecuteSignature,
  shouldSuppressDuplicatePendingRequest,
  shouldSuppressSatisfiedRequest,
  shouldSuppressRepeatedExecute,
} from './scheduler_debug_stats_signature_policy.js';

export type BuildStatsReasonMap = Record<string, BuildReasonDebugStatLike>;

export {
  readBuildInputFingerprint,
  hasDuplicatePendingSignature,
  hasRepeatedExecuteSignature,
  shouldSuppressDuplicatePendingRequest,
  shouldSuppressSatisfiedRequest,
  shouldSuppressRepeatedExecute,
};

export const MAX_BUILD_DURATION_SAMPLES = 512;

type BuildExecuteStatus = 'ok' | 'error';

const EMPTY_BUDGET: BuildDebugBudgetSummaryLike = Object.freeze({
  requestCount: 0,
  executeCount: 0,
  suppressedRequestCount: 0,
  suppressedExecuteCount: 0,
  duplicatePendingRate: 0,
  noOpRequestRate: 0,
  noOpExecuteRate: 0,
  debouncedScheduleCount: 0,
  reusedDebouncedScheduleCount: 0,
  builderWaitScheduleCount: 0,
  staleWakeupCount: 0,
  debouncedScheduleReuseRate: 0,
});

export function nowForBuildStats(): number {
  return 0;
}

export function isBuildDebugStatsEnabled(): boolean {
  return false;
}

export function normalizeBuildReason(reasonIn: unknown): string {
  const value = typeof reasonIn === 'string' ? reasonIn.trim() : '';
  return value || 'unknown';
}

export function createBuildDebugStats(): BuilderDebugStatsLike {
  return { reasons: {} } as BuilderDebugStatsLike;
}

export function ensureBuildDebugStats(_state: BuilderSchedulerStateInternalLike): BuilderDebugStatsLike {
  return createBuildDebugStats();
}

export function cloneBuildDebugStats(_stats: BuilderDebugStatsLike): BuilderDebugStatsLike {
  return createBuildDebugStats();
}

export function recordSkippedDuplicatePendingRequest(
  _state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown
): string {
  return normalizeBuildReason(reasonIn);
}

export function recordDebouncedSchedule(
  _state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown,
  _reusedExistingSchedule = false
): string {
  return normalizeBuildReason(reasonIn);
}

export function recordBuilderWaitSchedule(
  _state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown
): string {
  return normalizeBuildReason(reasonIn);
}

export function recordStaleDebouncedTimerFire(
  _state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown
): string {
  return normalizeBuildReason(reasonIn);
}

export function recordStaleBuilderWaitWakeup(
  _state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown
): string {
  return normalizeBuildReason(reasonIn);
}

export function recordSkippedSatisfiedRequest(
  _state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown
): string {
  return normalizeBuildReason(reasonIn);
}

export function recordBuildRequest(
  _state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown,
  _immediate: boolean,
  _forceBuild: boolean,
  _nextPlan: SchedulerPendingPlan,
  _requestTs: number
): string {
  return normalizeBuildReason(reasonIn);
}

export function recordBuildExecute(
  state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown,
  _immediate: boolean,
  _forceBuild: boolean,
  buildState: BuildStateLike,
  _execTs: number,
  plan?: SchedulerPendingPlan | null
): string {
  const reason = normalizeBuildReason(reasonIn);
  state.lastExecutedSignature = readExecutionSignature(plan, buildState);
  return reason;
}

export function recordBuildExecuteDuration(
  _state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown,
  _immediate: boolean,
  _forceBuild: boolean,
  _durationMsIn: unknown,
  _status: BuildExecuteStatus
): string {
  return normalizeBuildReason(reasonIn);
}

export function recordSkippedRepeatedExecute(
  _state: BuilderSchedulerStateInternalLike,
  reasonIn: unknown
): string {
  return normalizeBuildReason(reasonIn);
}

export function summarizeBuildDebugBudget(
  _stats: BuilderDebugStatsLike | null | undefined
): BuildDebugBudgetSummaryLike {
  return { ...EMPTY_BUDGET };
}
