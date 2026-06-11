import type {
  AppContainer,
  IntervalHandleLike,
  CloudSyncDiagFn,
  CloudSyncRuntimeStatus,
} from '../../../types';
import {
  markCloudSyncRealtimeEvent,
  startCloudSyncPolling,
  stopCloudSyncPolling,
  type CloudSyncPullAllNowFn,
} from './cloud_sync_lifecycle_support.js';
import type {
  CloudSyncLifecycleMutableState,
  CloudSyncPollingTransitionFn,
} from './cloud_sync_lifecycle_state.js';

export function createCloudSyncLifecyclePollingTransitions(args: {
  App: AppContainer;
  runtimeStatus: CloudSyncRuntimeStatus;
  publishStatus: () => void;
  diag: CloudSyncDiagFn;
  suppressRef: { v: boolean };
  isDisposed: () => boolean;
  clearIntervalFn: (id: IntervalHandleLike | null | undefined) => void;
  setIntervalFn: (handler: () => void, ms: number) => IntervalHandleLike;
  state: Pick<CloudSyncLifecycleMutableState, 'pollTimerRef' | 'pollIntervalMs'>;
  pullAllNow: CloudSyncPullAllNowFn;
  restartRealtime?: (() => void) | null;
}): {
  startPolling: CloudSyncPollingTransitionFn;
  stopPolling: CloudSyncPollingTransitionFn;
  markRealtimeEvent: () => boolean;
} {
  const {
    App,
    runtimeStatus,
    publishStatus,
    diag,
    suppressRef,
    isDisposed,
    clearIntervalFn,
    setIntervalFn,
    state,
    pullAllNow,
    restartRealtime,
  } = args;
  const { pollTimerRef, pollIntervalMs } = state;

  const stopPolling: CloudSyncPollingTransitionFn = (reason, opts): void => {
    stopCloudSyncPolling({
      pollTimerRef,
      clearIntervalFn,
      runtimeStatus,
      pollIntervalMs,
      publishStatus,
      diag,
      reason,
      ...(opts ? { publish: opts.publish } : {}),
    });
  };

  const startPolling: CloudSyncPollingTransitionFn = (reason, opts): void => {
    startCloudSyncPolling({
      App,
      pollTimerRef,
      setIntervalFn,
      clearIntervalFn,
      runtimeStatus,
      pollIntervalMs,
      publishStatus,
      diag,
      reason,
      suppressRef,
      pullAllNow,
      restartRealtime: restartRealtime || undefined,
      isDisposed,
      ...(opts ? { publish: opts.publish } : {}),
    });
  };

  const markRealtimeEvent = (): boolean =>
    markCloudSyncRealtimeEvent({
      runtimeStatus,
      publishStatus,
      suppressRef,
      isDisposed,
    });

  return {
    startPolling,
    stopPolling,
    markRealtimeEvent,
  };
}
