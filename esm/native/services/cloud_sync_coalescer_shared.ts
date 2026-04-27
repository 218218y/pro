import type { CloudSyncDiagFn, TimeoutHandleLike } from '../../../types';

import { normalizeCloudSyncPullScopeLabel } from './cloud_sync_pull_scopes.js';
import { createPendingReasonState, resetPendingReasonState } from './cloud_sync_pending_reason_state.js';

export type PullCoalescerDeps = {
  scope: string;
  run: () => Promise<void> | void;
  debounceMs?: number;
  minGapMs?: number;
  maxDelayMs?: number;
  isDisposed: () => boolean;
  isSuppressed: () => boolean;
  isMainPushInFlight: () => boolean;
  subscribeMainPushSettled?: ((listener: () => void) => (() => void) | void) | null;
  setTimeoutFn: (handler: () => void, ms: number) => TimeoutHandleLike;
  clearTimeoutFn: (id: TimeoutHandleLike | undefined) => void;
  reportNonFatal: (op: string, err: unknown) => void;
  diag: CloudSyncDiagFn;
  diagCooldownMs?: number;
};

export type CleanupFn = (() => void) | null;

export type CloudSyncPullCoalescer = {
  trigger: (reason: string, immediate?: boolean) => void;
  cancel: () => void;
};

export type PullCoalescerPolicy = {
  scopeLabel: string;
  debounceMs: number;
  minGapMs: number;
  maxDelayMs: number;
  diagCooldownMs: number;
};

export type PullCoalescerState = {
  timer: TimeoutHandleLike | null;
  timerDueAt: number;
  queued: boolean;
  inFlight: boolean;
  firstQueuedAt: number;
  lastTriggerAt: number;
  lastRunStartAt: number;
  pendingCount: number;
  pendingReasons: ReturnType<typeof createPendingReasonState>;
  waitingForMainPush: boolean;
  mainPushSettledCleanup: CleanupFn;
  lastCoalescedDiagAt: number;
  suppressedCoalescedRuns: number;
};

export const FALLBACK_MAIN_PUSH_RETRY_MS = 25;

export function createPullCoalescerPolicy(deps: PullCoalescerDeps): PullCoalescerPolicy {
  return {
    scopeLabel: normalizeCloudSyncPullScopeLabel(deps.scope),
    debounceMs: Math.max(0, Number(deps.debounceMs) || 0),
    minGapMs: Math.max(0, Number(deps.minGapMs) || 0),
    maxDelayMs: Math.max(0, Number(deps.maxDelayMs) || 0),
    diagCooldownMs: Math.max(0, Number(deps.diagCooldownMs) || 0),
  };
}

export function createPullCoalescerState(): PullCoalescerState {
  return {
    timer: null,
    timerDueAt: 0,
    queued: false,
    inFlight: false,
    firstQueuedAt: 0,
    lastTriggerAt: 0,
    lastRunStartAt: 0,
    pendingCount: 0,
    pendingReasons: createPendingReasonState(),
    waitingForMainPush: false,
    mainPushSettledCleanup: null,
    lastCoalescedDiagAt: 0,
    suppressedCoalescedRuns: 0,
  };
}

export function resetPullCoalescerState(state: PullCoalescerState): void {
  state.queued = false;
  state.inFlight = false;
  state.waitingForMainPush = false;
  state.mainPushSettledCleanup = null;
  state.firstQueuedAt = 0;
  state.lastTriggerAt = 0;
  state.pendingCount = 0;
  resetPendingReasonState(state.pendingReasons);
  state.lastCoalescedDiagAt = 0;
  state.suppressedCoalescedRuns = 0;
}
