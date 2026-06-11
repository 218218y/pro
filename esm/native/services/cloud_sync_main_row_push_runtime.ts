import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import {
  type CloudSyncMainRowPushFlow,
  type CreateCloudSyncMainRowPushFlowArgs,
  clearCloudSyncMainRowPendingPush,
  createCloudSyncMainRowPushMutableState,
  hasCloudSyncMainRowPendingPushWork,
  requestCloudSyncMainRowPendingPushAfterFlights,
  resetCloudSyncMainRowPendingPushAfterFlights,
} from './cloud_sync_main_row_push_shared.js';

export function createCloudSyncMainRowPushFlow(
  args: CreateCloudSyncMainRowPushFlowArgs
): CloudSyncMainRowPushFlow {
  const state = createCloudSyncMainRowPushMutableState();

  const clearPendingPush = (): void => {
    clearCloudSyncMainRowPendingPush(state, args.clearTimeoutFn);
  };

  const requestPendingPushAfterFlights = (): void => {
    requestCloudSyncMainRowPendingPushAfterFlights(state, args.clearTimeoutFn);
  };

  const resetPendingPushAfterFlights = (): void => {
    resetCloudSyncMainRowPendingPushAfterFlights(state, args.clearTimeoutFn);
  };

  const flushPendingPushAfterFlights = (): void => {
    if (!state.pendingPushAfterFlight) return;
    if (args.suppressRef.v) {
      resetPendingPushAfterFlights();
      return;
    }
    if (args.isPushInFlight()) return;
    state.pendingPushAfterFlight = false;
    runPushNowDetached();
  };

  const notifyPushSettled = (): void => {
    flushPendingPushAfterFlights();
    args.flushPendingPullAfterFlights();
    if (!state.pushSettledListeners.size) return;
    const listeners = Array.from(state.pushSettledListeners);
    for (const listener of listeners) {
      try {
        listener();
      } catch (err) {
        _cloudSyncReportNonFatal(args.App, 'cloudSyncMainRow.pushSettled', err, { throttleMs: 8000 });
      }
    }
  };

  const reportPushFailure = (err: unknown): void => {
    _cloudSyncReportNonFatal(args.App, 'cloudSyncMainRow.push', err, { throttleMs: 8000 });
  };

  const runPushNow = (): Promise<void> => {
    clearPendingPush();
    let push: Promise<void>;
    try {
      push = Promise.resolve(args.runPushRemote());
    } catch (err) {
      reportPushFailure(err);
      notifyPushSettled();
      return Promise.reject(err);
    }
    void push.then(
      () => {
        notifyPushSettled();
      },
      err => {
        reportPushFailure(err);
        notifyPushSettled();
      }
    );
    return push;
  };

  const runPushNowDetached = (): void => {
    void runPushNow().catch(() => undefined);
  };

  const subscribePushSettled = (listener: () => void): (() => void) => {
    if (typeof listener !== 'function') return () => undefined;
    state.pushSettledListeners.add(listener);
    return () => {
      state.pushSettledListeners.delete(listener);
    };
  };

  const hasPendingPushWork = (): boolean => hasCloudSyncMainRowPendingPushWork(state);

  const schedulePush = (): void => {
    if (args.suppressRef.v) return;
    if (args.isPushInFlight()) {
      requestPendingPushAfterFlights();
      return;
    }
    if (state.pushTimer) return;
    state.pushTimer = args.setTimeoutFn(() => {
      state.pushTimer = null;
      if (args.suppressRef.v) {
        resetPendingPushAfterFlights();
        return;
      }
      runPushNowDetached();
    }, 700);
  };

  const dispose = (): void => {
    resetPendingPushAfterFlights();
    state.pushSettledListeners.clear();
  };

  return {
    schedulePush,
    pushNow: runPushNow,
    subscribePushSettled,
    clearPendingPush,
    hasPendingPushWork,
    dispose,
  };
}
