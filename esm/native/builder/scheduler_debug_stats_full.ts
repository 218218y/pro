export type { BuildStatsReasonMap } from './scheduler_debug_stats_reason_store.js';

export {
  nowForBuildStats,
  isBuildDebugStatsEnabled,
  MAX_BUILD_DURATION_SAMPLES,
  normalizeBuildReason,
  createBuildDebugStats,
  ensureBuildDebugStats,
  cloneBuildDebugStats,
} from './scheduler_debug_stats_reason_store.js';

export {
  readBuildInputFingerprint,
  hasDuplicatePendingSignature,
  hasRepeatedExecuteSignature,
  shouldSuppressDuplicatePendingRequest,
  shouldSuppressSatisfiedRequest,
  shouldSuppressRepeatedExecute,
} from './scheduler_debug_stats_signature_policy.js';

export {
  recordSkippedDuplicatePendingRequest,
  recordDebouncedSchedule,
  recordBuilderWaitSchedule,
  recordStaleDebouncedTimerFire,
  recordStaleBuilderWaitWakeup,
  recordSkippedSatisfiedRequest,
  recordBuildRequest,
  recordBuildExecute,
  recordBuildExecuteDuration,
  recordSkippedRepeatedExecute,
} from './scheduler_debug_stats_recorders.js';

export { summarizeBuildDebugBudget } from './scheduler_debug_stats_budget.js';
