import type { AppContainer, TimeoutHandleLike } from '../../../types';

export type CreateCloudSyncMainRowPushFlowArgs = {
  App: AppContainer;
  setTimeoutFn: (handler: () => void, ms: number) => TimeoutHandleLike;
  clearTimeoutFn: (id: TimeoutHandleLike | null | undefined) => void;
  suppressRef: { v: boolean };
  isPushInFlight: () => boolean;
  runPushRemote: () => Promise<void>;
  flushPendingPullAfterFlights: () => void;
};

export type CloudSyncMainRowPushFlow = {
  schedulePush: () => void;
  pushNow: () => Promise<void>;
  subscribePushSettled: (listener: () => void) => () => void;
  clearPendingPush: () => void;
  dispose: () => void;
};

export type CloudSyncMainRowPushMutableState = {
  pushTimer: TimeoutHandleLike | null;
  pendingPushAfterFlight: boolean;
  pushSettledListeners: Set<() => void>;
};

export function createCloudSyncMainRowPushMutableState(): CloudSyncMainRowPushMutableState {
  return {
    pushTimer: null,
    pendingPushAfterFlight: false,
    pushSettledListeners: new Set<() => void>(),
  };
}

export function clearCloudSyncMainRowPendingPush(
  state: CloudSyncMainRowPushMutableState,
  clearTimeoutFn: (id: TimeoutHandleLike | null | undefined) => void
): void {
  if (!state.pushTimer) return;
  clearTimeoutFn(state.pushTimer);
  state.pushTimer = null;
}

export function requestCloudSyncMainRowPendingPushAfterFlights(
  state: CloudSyncMainRowPushMutableState,
  clearTimeoutFn: (id: TimeoutHandleLike | null | undefined) => void
): void {
  state.pendingPushAfterFlight = true;
  clearCloudSyncMainRowPendingPush(state, clearTimeoutFn);
}
