import {
  normalizeMainRowPullRequest,
  type MainRowPullRequestOptions,
  type PullFollowUpBlocker,
} from './cloud_sync_main_row_shared.js';
import {
  clearCloudSyncMainRowPendingPullDelays,
  createCloudSyncMainRowPullMutableState,
  publishCloudSyncMainRowPendingPullDiag,
  readCloudSyncMainRowPendingPullDelay,
  readCloudSyncMainRowPendingPullReasonSummary,
  rememberCloudSyncMainRowPendingPullDelayForBlocker,
  rememberCloudSyncMainRowPendingPullRequest,
  resetCloudSyncMainRowPendingPullRequestState,
  type CloudSyncMainRowPullFlow,
  type CreateCloudSyncMainRowPullFlowArgs,
} from './cloud_sync_main_row_pull_shared.js';

export function createCloudSyncMainRowPullFlow(
  args: CreateCloudSyncMainRowPullFlowArgs
): CloudSyncMainRowPullFlow {
  const state = createCloudSyncMainRowPullMutableState();
  const diag = args.diag || (() => undefined);
  const reportFailure = (operation: string, error: unknown): void => {
    if (typeof args.reportFailure !== 'function') return;
    try {
      args.reportFailure(operation, error);
    } catch {
      return;
    }
  };

  const clearPendingPull = (): void => {
    const timer = state.pullSoonTimer;
    state.pullSoonTimer = null;
    state.pullSoonDueAt = 0;
    if (!timer) return;
    try {
      args.clearTimeoutFn(timer);
    } catch (error) {
      reportFailure('cloudSync.mainRow.pull.clearTimer', error);
    }
  };

  const readActivePullBlocker = (): PullFollowUpBlocker | null => {
    if (args.isPushInFlight() || args.hasPendingPushWork?.()) return 'push';
    if (state.pullInFlight) return 'pull';
    return null;
  };

  const parkPullUntilFlightsSettle = (delayMsRaw: number): boolean => {
    const blocker = readActivePullBlocker();
    if (!blocker) return false;
    rememberCloudSyncMainRowPendingPullDelayForBlocker(state, blocker, delayMsRaw);
    clearPendingPull();
    return true;
  };

  const runPullOnce = (isInitial: boolean): Promise<void> => {
    clearPendingPull();
    if (state.pullInFlight) return state.pullInFlight;
    clearCloudSyncMainRowPendingPullDelays(state);
    let remotePull: Promise<void>;
    try {
      remotePull = Promise.resolve(args.runPullRemote(isInitial));
    } catch (error) {
      remotePull = Promise.reject(error);
    }
    const pull = remotePull.finally(() => {
      if (state.pullInFlight === pull) state.pullInFlight = null;
      flushPendingPullAfterFlights();
    });
    state.pullInFlight = pull;
    return pull;
  };

  const runScheduledPull = (): void => {
    try {
      publishCloudSyncMainRowPendingPullDiag(state, diag);
    } catch (error) {
      reportFailure('cloudSync.mainRow.pull.publishDiag', error);
    }
    resetCloudSyncMainRowPendingPullRequestState(state);
    void runPullOnce(false).catch(error => {
      reportFailure('cloudSync.mainRow.pull.runScheduled', error);
    });
  };

  const queuePullSoon = (opts?: MainRowPullRequestOptions, rememberReason = true): void => {
    if (args.suppressRef.v) return;
    const request = normalizeMainRowPullRequest(opts);
    const delayMs = request.immediate ? 0 : request.delayMs;
    if (rememberReason) rememberCloudSyncMainRowPendingPullRequest(state, request.reason);
    if (parkPullUntilFlightsSettle(delayMs)) return;

    const now = Date.now();
    const dueAt = now + delayMs;
    if (state.pullSoonTimer && state.pullSoonDueAt > 0 && state.pullSoonDueAt <= dueAt) return;
    clearPendingPull();
    state.pullSoonDueAt = dueAt;
    try {
      state.pullSoonTimer = args.setTimeoutFn(() => {
        state.pullSoonTimer = null;
        state.pullSoonDueAt = 0;
        if (args.suppressRef.v) {
          clearCloudSyncMainRowPendingPullDelays(state);
          resetCloudSyncMainRowPendingPullRequestState(state);
          return;
        }
        if (parkPullUntilFlightsSettle(0)) return;
        runScheduledPull();
      }, delayMs);
    } catch (error) {
      state.pullSoonTimer = null;
      state.pullSoonDueAt = 0;
      reportFailure('cloudSync.mainRow.pull.scheduleTimer', error);
      if (parkPullUntilFlightsSettle(0)) return;
      runScheduledPull();
    }
  };

  const flushPendingPullAfterFlights = (): void => {
    if (args.suppressRef.v || readActivePullBlocker()) return;
    const pendingDelay = readCloudSyncMainRowPendingPullDelay(state);
    if (pendingDelay == null) return;
    const reason = readCloudSyncMainRowPendingPullReasonSummary(state);
    clearCloudSyncMainRowPendingPullDelays(state);
    queuePullSoon({ delayMs: pendingDelay, reason }, false);
  };

  const schedulePullSoon = (opts?: MainRowPullRequestOptions): void => {
    if (args.suppressRef.v) return;
    queuePullSoon({
      immediate: !!opts?.immediate,
      delayMs: opts?.delayMs ?? 350,
      reason: opts?.reason,
    });
  };

  const dispose = (): void => {
    clearCloudSyncMainRowPendingPullDelays(state);
    resetCloudSyncMainRowPendingPullRequestState(state);
    state.pullInFlight = null;
    clearPendingPull();
  };

  return {
    schedulePullSoon,
    pullOnce: runPullOnce,
    flushPendingPullAfterFlights,
    dispose,
  };
}
