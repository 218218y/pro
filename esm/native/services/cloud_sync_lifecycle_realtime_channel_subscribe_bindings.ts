import {
  bindCloudSyncRealtimeBeforeUnloadCleanup,
  routeCloudSyncRealtimeBroadcastEvent,
  markCloudSyncRealtimeTimeout,
} from './cloud_sync_lifecycle_realtime_support.js';
import { isCloudSyncLifecycleGuardDisposed } from './cloud_sync_lifecycle_liveness_runtime.js';
import {
  REALTIME_BROADCAST_EVENT,
  REALTIME_CONNECT_SOFT_TIMEOUT_MS,
} from './cloud_sync_lifecycle_realtime_channel_shared.js';
import type { CloudSyncRealtimeChannelSubscriptionArgs } from './cloud_sync_lifecycle_realtime_channel_subscribe_shared.js';

type CloudSyncRealtimeSubscribeRefs = {
  isSubscribedRef: { current: boolean };
  everSubscribedRef: { current: boolean };
};

export function createCloudSyncRealtimeSubscribeRefs(): CloudSyncRealtimeSubscribeRefs {
  return {
    isSubscribedRef: { current: false },
    everSubscribedRef: { current: false },
  };
}

export function bindCloudSyncRealtimeBroadcastListener(
  args: Pick<
    CloudSyncRealtimeChannelSubscriptionArgs,
    | 'App'
    | 'chan'
    | 'transportToken'
    | 'transport'
    | 'disconnectStateRef'
    | 'clientId'
    | 'room'
    | 'runtimeStatus'
    | 'suppressRef'
    | 'markRealtimeEvent'
    | 'pullAllNow'
    | 'realtimeScopedHandlers'
    | 'isDisposed'
  >
): void {
  const {
    App,
    chan,
    transportToken,
    transport,
    disconnectStateRef,
    clientId,
    room,
    runtimeStatus,
    suppressRef,
    markRealtimeEvent,
    pullAllNow,
    realtimeScopedHandlers,
    isDisposed,
  } = args;

  chan.on?.call(chan, 'broadcast', { event: REALTIME_BROADCAST_EVENT }, (evt: unknown) => {
    if (isCloudSyncLifecycleGuardDisposed(isDisposed)) return;
    if (transportToken !== transport.getTransportToken()) return;
    if (disconnectStateRef.current) return;
    routeCloudSyncRealtimeBroadcastEvent({
      App,
      evt,
      clientId,
      room,
      runtimeStatus,
      suppressRef,
      markRealtimeEvent,
      pullAllNow,
      realtimeScopedHandlers,
    });
  });
}

export function armCloudSyncRealtimeConnectTimeout(
  args: Pick<
    CloudSyncRealtimeChannelSubscriptionArgs,
    | 'setTimeoutFn'
    | 'refs'
    | 'transportToken'
    | 'transport'
    | 'disconnectStateRef'
    | 'runtimeStatus'
    | 'publishStatus'
    | 'diag'
    | 'startPolling'
    | 'isDisposed'
  > & {
    isSubscribedRef: { current: boolean };
  }
): void {
  const {
    setTimeoutFn,
    refs,
    transportToken,
    transport,
    disconnectStateRef,
    runtimeStatus,
    publishStatus,
    diag,
    startPolling,
    isSubscribedRef,
    isDisposed,
  } = args;

  refs.connectTimer = setTimeoutFn(() => {
    if (isCloudSyncLifecycleGuardDisposed(isDisposed)) return;
    if (transportToken !== transport.getTransportToken()) return;
    if (disconnectStateRef.current) return;
    if (isSubscribedRef.current) return;
    markCloudSyncRealtimeTimeout({
      runtimeStatus,
      publishStatus,
      diag,
      startPolling,
    });
    refs.connectTimer = null;
  }, REALTIME_CONNECT_SOFT_TIMEOUT_MS);
}

export function bindCloudSyncRealtimeSubscribeBeforeUnload(
  args: Pick<CloudSyncRealtimeChannelSubscriptionArgs, 'App' | 'refs' | 'addListener'>
): void {
  bindCloudSyncRealtimeBeforeUnloadCleanup(args);
}
