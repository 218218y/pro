import { createCloudSyncRealtimeLifecycle } from './cloud_sync_lifecycle_realtime.js';
import { startCloudSyncRealtimeWithLifecycleRecovery } from './cloud_sync_lifecycle_runtime_realtime_start.js';
import { createCloudSyncRealtimeScopedHandlerMapFromTriggers } from './cloud_sync_pull_scopes.js';
import {
  createCloudSyncLifecycleAddListener,
  createCloudSyncLifecyclePullAllNow,
} from './cloud_sync_lifecycle_bindings.js';
import { createCloudSyncLifecyclePollingTransitions } from './cloud_sync_lifecycle_polling.js';
import {
  createCloudSyncLifecycleMutableState,
  type CloudSyncLifecycleArgs,
  type CloudSyncLifecycleMutableState,
} from './cloud_sync_lifecycle_state.js';
import type { CloudSyncPullAllNowFn } from './cloud_sync_lifecycle_support.js';
import type {
  CloudSyncPollingTransitionFn,
  CloudSyncRealtimeLifecycleOps,
} from './cloud_sync_lifecycle_realtime_shared.js';

export type CloudSyncLifecycleRuntimeDeps = {
  state: CloudSyncLifecycleMutableState;
  addListener: ReturnType<typeof createCloudSyncLifecycleAddListener>;
  pullAllNow: CloudSyncPullAllNowFn;
  startPolling: CloudSyncPollingTransitionFn;
  stopPolling: CloudSyncPollingTransitionFn;
  markRealtimeEvent: () => boolean;
  cloudSyncRealtime: CloudSyncRealtimeLifecycleOps;
};

export function createCloudSyncLifecycleRuntimeDeps(
  args: CloudSyncLifecycleArgs
): CloudSyncLifecycleRuntimeDeps {
  const {
    App,
    cfg,
    room,
    clientId,
    runtimeStatus,
    publishStatus,
    diag,
    suppressRef,
    isDisposed,
    mainPullTrigger,
    pullCoalescers,
    setTimeoutFn,
    clearTimeoutFn,
    setIntervalFn,
    clearIntervalFn,
    setSendRealtimeHint,
  } = args;

  const state = createCloudSyncLifecycleMutableState(cfg);
  const addListener = createCloudSyncLifecycleAddListener({
    App,
    listenerCleanup: state.listenerCleanup,
  });
  const restartRealtimeRef: { current: (() => void) | null } = { current: null };
  const pullAllNow = createCloudSyncLifecyclePullAllNow({
    suppressRef,
    mainPullTrigger,
    pullCoalescers,
    isDisposed,
    disposedRef: state.disposedRef,
    runtimeStatus,
  });
  const { startPolling, stopPolling, markRealtimeEvent } = createCloudSyncLifecyclePollingTransitions({
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
    restartRealtime: () => {
      restartRealtimeRef.current?.();
    },
  });

  const realtimeScopedHandlers = createCloudSyncRealtimeScopedHandlerMapFromTriggers({
    markRealtimeEvent,
    mainTrigger: mainPullTrigger,
    pullTriggers: pullCoalescers,
    reason: 'realtime',
  });

  const cloudSyncRealtime = createCloudSyncRealtimeLifecycle({
    App,
    cfg,
    room,
    clientId,
    runtimeStatus,
    publishStatus,
    diag,
    suppressRef,
    isDisposed,
    pullAllNow,
    startPolling,
    stopPolling,
    markRealtimeEvent,
    realtimeScopedHandlers,
    addListener,
    setTimeoutFn,
    clearTimeoutFn,
    refs: {
      connectTimer: null,
      client: null,
      channel: null,
    },
    setSendRealtimeHint,
  });
  restartRealtimeRef.current = () => {
    startCloudSyncRealtimeWithLifecycleRecovery({
      App,
      runtimeStatus,
      publishStatus,
      diag,
      startPolling,
      cloudSyncRealtime,
      op: 'cloudSyncLifecycle.realtimeRestart',
      diagEvent: 'realtime:owner-restart-error',
      pollingReason: 'realtime-owner-restart-error',
    });
  };

  return {
    state,
    addListener,
    pullAllNow,
    startPolling,
    stopPolling,
    markRealtimeEvent,
    cloudSyncRealtime,
  };
}
