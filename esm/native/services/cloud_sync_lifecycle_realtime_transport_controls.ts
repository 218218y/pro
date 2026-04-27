import {
  cleanupCloudSyncRealtimeTransport,
  clearCloudSyncRealtimeConnectTimer,
} from './cloud_sync_lifecycle_realtime_transport_cleanup.js';
import {
  type CloudSyncRealtimeTransport,
  type CloudSyncRealtimeTransportArgs,
  type CloudSyncRealtimeTransportMutableState,
} from './cloud_sync_lifecycle_realtime_transport_shared.js';
import {
  handleCloudSyncRealtimeDisconnect,
  setCloudSyncRealtimeFailure,
} from './cloud_sync_lifecycle_realtime_transport_status.js';

export function createCloudSyncRealtimeTransportControls(
  args: Pick<
    CloudSyncRealtimeTransportArgs,
    | 'App'
    | 'refs'
    | 'runtimeStatus'
    | 'publishStatus'
    | 'diag'
    | 'startPolling'
    | 'clearTimeoutFn'
    | 'setSendRealtimeHint'
  > & {
    mutableState: CloudSyncRealtimeTransportMutableState;
    getTransportToken: () => number;
  }
): Pick<
  CloudSyncRealtimeTransport,
  'clearConnectTimer' | 'cleanupRealtimeTransport' | 'setRealtimeFailure' | 'handleRealtimeDisconnect'
> {
  const {
    App,
    refs,
    runtimeStatus,
    publishStatus,
    diag,
    startPolling,
    clearTimeoutFn,
    setSendRealtimeHint,
    mutableState,
    getTransportToken,
  } = args;

  const clearConnectTimer = (): void => {
    clearCloudSyncRealtimeConnectTimer({ refs, clearTimeoutFn });
  };

  const cleanupRealtimeTransport = (op: string, opts?: { keepHints?: boolean }): void => {
    cleanupCloudSyncRealtimeTransport({
      App,
      refs,
      clearTimeoutFn,
      setSendRealtimeHint,
      mutableState,
      op,
      opts,
    });
  };

  const setRealtimeFailureFn: CloudSyncRealtimeTransport['setRealtimeFailure'] = (
    state,
    lastError,
    diagEvent,
    pollingReason
  ) => {
    setCloudSyncRealtimeFailure({
      runtimeStatus,
      publishStatus,
      diag,
      startPolling,
      cleanupRealtimeTransport,
      state,
      lastError,
      diagEvent,
      pollingReason,
    });
  };

  const handleRealtimeDisconnectFn: CloudSyncRealtimeTransport['handleRealtimeDisconnect'] = (
    why,
    subscribedRef,
    transportToken,
    disconnectStateRef,
    opts
  ) => {
    handleCloudSyncRealtimeDisconnect({
      runtimeStatus,
      publishStatus,
      diag,
      startPolling,
      cleanupRealtimeTransport,
      currentTransportToken: getTransportToken,
      why,
      subscribedRef,
      transportToken,
      disconnectStateRef,
      opts,
    });
  };

  return {
    clearConnectTimer,
    cleanupRealtimeTransport,
    setRealtimeFailure: setRealtimeFailureFn,
    handleRealtimeDisconnect: handleRealtimeDisconnectFn,
  };
}
