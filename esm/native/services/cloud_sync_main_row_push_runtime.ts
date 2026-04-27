import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import {
  type CloudSyncMainRowPushFlow,
  type CreateCloudSyncMainRowPushFlowArgs,
  clearCloudSyncMainRowPendingPush,
  createCloudSyncMainRowPushMutableState,
  requestCloudSyncMainRowPendingPushAfterFlights,
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

  const flushPendingPushAfterFlights = (): void => {
    if (args.suppressRef.v || args.isPushInFlight() || !state.pendingPushAfterFlight) return;
    state.pendingPushAfterFlight = false;
    void runPushNow();
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

  const runPushNow = (): Promise<void> => {
    clearPendingPush();
    const push = args.runPushRemote();
    void push.finally(() => {
      notifyPushSettled();
    });
    return push;
  };

  const subscribePushSettled = (listener: () => void): (() => void) => {
    if (typeof listener !== 'function') return () => undefined;
    state.pushSettledListeners.add(listener);
    return () => {
      state.pushSettledListeners.delete(listener);
    };
  };

  const schedulePush = (): void => {
    if (args.suppressRef.v) return;
    if (args.isPushInFlight()) {
      requestPendingPushAfterFlights();
      return;
    }
    if (state.pushTimer) return;
    state.pushTimer = args.setTimeoutFn(() => {
      state.pushTimer = null;
      void runPushNow();
    }, 700);
  };

  const dispose = (): void => {
    state.pendingPushAfterFlight = false;
    state.pushSettledListeners.clear();
    clearPendingPush();
  };

  return {
    schedulePush,
    pushNow: runPushNow,
    subscribePushSettled,
    clearPendingPush,
    dispose,
  };
}
