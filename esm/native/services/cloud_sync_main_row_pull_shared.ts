import type { CloudSyncDiagFn, TimeoutHandleLike } from '../../../types';

import {
  addPendingReason,
  createPendingReasonState,
  readPendingReasonSummary,
  resetPendingReasonState,
  type PendingReasonState,
} from './cloud_sync_pending_reason_state.js';
import {
  MAIN_ROW_PULL_DIAG_COOLDOWN_MS,
  MAIN_ROW_PULL_SCOPE_LABEL,
  normalizePullDelayMs,
  type MainRowPullRequestOptions,
  type PendingPullDelaysByBlocker,
  type PullFollowUpBlocker,
} from './cloud_sync_main_row_shared.js';

export type CreateCloudSyncMainRowPullFlowArgs = {
  setTimeoutFn: (handler: () => void, ms: number) => TimeoutHandleLike;
  clearTimeoutFn: (id: TimeoutHandleLike | null | undefined) => void;
  suppressRef: { v: boolean };
  diag?: CloudSyncDiagFn;
  isPushInFlight: () => boolean;
  hasPendingPushWork?: () => boolean;
  runPullRemote: (isInitial: boolean) => Promise<void>;
};

export type CloudSyncMainRowPullFlow = {
  schedulePullSoon: (opts?: MainRowPullRequestOptions) => void;
  pullOnce: (isInitial: boolean) => Promise<void>;
  flushPendingPullAfterFlights: () => void;
  dispose: () => void;
};

export type CloudSyncMainRowPullMutableState = {
  pullSoonTimer: TimeoutHandleLike | null;
  pullSoonDueAt: number;
  pullInFlight: Promise<void> | null;
  pendingPullDelaysByBlocker: PendingPullDelaysByBlocker;
  pendingPullCount: number;
  pendingPullReasons: PendingReasonState;
  lastPendingPullDiagAt: number;
  suppressedPendingPullRuns: number;
};

export function createCloudSyncMainRowPullMutableState(): CloudSyncMainRowPullMutableState {
  return {
    pullSoonTimer: null,
    pullSoonDueAt: 0,
    pullInFlight: null,
    pendingPullDelaysByBlocker: { push: null, pull: null },
    pendingPullCount: 0,
    pendingPullReasons: createPendingReasonState(),
    lastPendingPullDiagAt: 0,
    suppressedPendingPullRuns: 0,
  };
}

export function rememberCloudSyncMainRowPendingPullRequest(
  state: CloudSyncMainRowPullMutableState,
  reason: string
): void {
  state.pendingPullCount += 1;
  addPendingReason(state.pendingPullReasons, MAIN_ROW_PULL_SCOPE_LABEL, reason);
}

export function resetCloudSyncMainRowPendingPullRequestState(state: CloudSyncMainRowPullMutableState): void {
  state.pendingPullCount = 0;
  resetPendingReasonState(state.pendingPullReasons);
  state.lastPendingPullDiagAt = 0;
  state.suppressedPendingPullRuns = 0;
}

export function readCloudSyncMainRowPendingPullReasonSummary(
  state: CloudSyncMainRowPullMutableState
): string {
  return readPendingReasonSummary(state.pendingPullReasons, MAIN_ROW_PULL_SCOPE_LABEL);
}
export function publishCloudSyncMainRowPendingPullDiag(
  state: CloudSyncMainRowPullMutableState,
  diag: CloudSyncDiagFn
): void {
  if (state.pendingPullCount <= 1) return;
  const now = Date.now();
  const sinceLastDiag = now - state.lastPendingPullDiagAt;
  if (state.lastPendingPullDiagAt && sinceLastDiag < MAIN_ROW_PULL_DIAG_COOLDOWN_MS) {
    state.suppressedPendingPullRuns += 1;
    return;
  }
  const payload: { count: number; reason: string; suppressedRuns?: number } = {
    count: state.pendingPullCount,
    reason: readPendingReasonSummary(state.pendingPullReasons, MAIN_ROW_PULL_SCOPE_LABEL),
  };
  if (state.suppressedPendingPullRuns > 0) payload.suppressedRuns = state.suppressedPendingPullRuns;
  diag('mainRow.pull:coalesced:run', payload);
  state.lastPendingPullDiagAt = now;
  state.suppressedPendingPullRuns = 0;
}

export function rememberCloudSyncMainRowPendingPullDelayForBlocker(
  state: CloudSyncMainRowPullMutableState,
  blocker: PullFollowUpBlocker,
  nextDelayMsRaw: number
): number {
  const nextDelayMs = normalizePullDelayMs(nextDelayMsRaw);
  const currentDelayMs = state.pendingPullDelaysByBlocker[blocker];
  const mergedDelayMs = currentDelayMs == null ? nextDelayMs : Math.min(currentDelayMs, nextDelayMs);
  state.pendingPullDelaysByBlocker[blocker] = mergedDelayMs;
  return mergedDelayMs;
}

export function clearCloudSyncMainRowPendingPullDelays(state: CloudSyncMainRowPullMutableState): void {
  state.pendingPullDelaysByBlocker.push = null;
  state.pendingPullDelaysByBlocker.pull = null;
}

export function readCloudSyncMainRowPendingPullDelay(state: CloudSyncMainRowPullMutableState): number | null {
  const pushDelayMs = state.pendingPullDelaysByBlocker.push;
  const pullDelayMs = state.pendingPullDelaysByBlocker.pull;
  if (pushDelayMs == null) return pullDelayMs;
  if (pullDelayMs == null) return pushDelayMs;
  return Math.min(pushDelayMs, pullDelayMs);
}
