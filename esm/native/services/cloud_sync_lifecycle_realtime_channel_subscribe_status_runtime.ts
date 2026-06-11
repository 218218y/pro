import { normalizeUnknownError } from '../runtime/error_normalization.js';
import { isCloudSyncLifecycleGuardDisposed } from './cloud_sync_lifecycle_liveness_runtime.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import {
  markCloudSyncRealtimeSubscribed,
  markCloudSyncRealtimeTimeout,
  normalizeCloudSyncRealtimeSubscribeStatus,
  sendCloudSyncRealtimeHint,
} from './cloud_sync_lifecycle_realtime_support.js';
import {
  REALTIME_BROADCAST_EVENT,
  REALTIME_HINT_DEDUPE_MS,
} from './cloud_sync_lifecycle_realtime_channel_shared.js';
import type { CloudSyncRealtimeChannelSubscriptionArgs } from './cloud_sync_lifecycle_realtime_channel_subscribe_shared.js';

type CloudSyncRealtimeSubscribeStatusRuntimeArgs = Pick<
  CloudSyncRealtimeChannelSubscriptionArgs,
  | 'App'
  | 'cfg'
  | 'room'
  | 'clientId'
  | 'runtimeStatus'
  | 'publishStatus'
  | 'diag'
  | 'suppressRef'
  | 'isDisposed'
  | 'pullAllNow'
  | 'startPolling'
  | 'stopPolling'
  | 'setSendRealtimeHint'
  | 'transport'
  | 'transportToken'
  | 'disconnectStateRef'
  | 'refs'
> & {
  isSubscribedRef: { current: boolean };
  everSubscribedRef: { current: boolean };
};

function installCloudSyncRealtimeHintSender(
  args: Pick<
    CloudSyncRealtimeSubscribeStatusRuntimeArgs,
    | 'App'
    | 'cfg'
    | 'room'
    | 'clientId'
    | 'runtimeStatus'
    | 'isDisposed'
    | 'setSendRealtimeHint'
    | 'transport'
    | 'refs'
  >
): void {
  const { App, cfg, room, clientId, runtimeStatus, isDisposed, setSendRealtimeHint, transport, refs } = args;
  setSendRealtimeHint((scope, rowName): void => {
    void sendCloudSyncRealtimeHint({
      App,
      isDisposed,
      channel: refs.channel,
      realtimeMode: cfg.realtimeMode,
      runtimeStatus,
      scope,
      rowName,
      room,
      clientId,
      eventName: REALTIME_BROADCAST_EVENT,
      dedupeMs: REALTIME_HINT_DEDUPE_MS,
      sentAtByKey: transport.sentAtByKey,
    });
  });
}

export function applyCloudSyncRealtimeSubscribeStatus(
  args: CloudSyncRealtimeSubscribeStatusRuntimeArgs & {
    status: unknown;
  }
): void {
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
    pullAllNow,
    startPolling,
    stopPolling,
    setSendRealtimeHint,
    transport,
    transportToken,
    disconnectStateRef,
    refs,
    isSubscribedRef,
    everSubscribedRef,
    status,
  } = args;

  if (isDisposed()) return;
  if (transportToken !== transport.getTransportToken()) return;
  if (disconnectStateRef.current) return;
  const normalizedStatus = normalizeCloudSyncRealtimeSubscribeStatus(status);
  if (normalizedStatus === 'SUBSCRIBED') {
    transport.clearConnectTimer();
    markCloudSyncRealtimeSubscribed({
      App,
      runtimeStatus,
      publishStatus,
      diag,
      suppressRef,
      stopPolling,
      pullAllNow,
      subscribedRef: isSubscribedRef,
      everSubscribedRef,
    });
    installCloudSyncRealtimeHintSender({
      App,
      cfg,
      room,
      clientId,
      runtimeStatus,
      isDisposed,
      setSendRealtimeHint,
      transport,
      refs,
    });
    return;
  }
  if (normalizedStatus === 'TIMED_OUT') {
    markCloudSyncRealtimeTimeout({
      runtimeStatus,
      publishStatus,
      diag,
      startPolling,
    });
    return;
  }
  if (normalizedStatus === 'CHANNEL_ERROR' || normalizedStatus === 'CLOSED') {
    transport.handleRealtimeDisconnect(normalizedStatus, isSubscribedRef, transportToken, disconnectStateRef);
  }
}

export function handleCloudSyncRealtimeSubscribeFailure(
  args: Pick<
    CloudSyncRealtimeChannelSubscriptionArgs,
    'App' | 'transport' | 'transportToken' | 'disconnectStateRef' | 'isDisposed'
  > & {
    err: unknown;
    isSubscribedRef: { current: boolean };
  }
): 'failed' {
  const { App, transport, transportToken, disconnectStateRef, isDisposed, err, isSubscribedRef } = args;
  if (isCloudSyncLifecycleGuardDisposed(isDisposed)) return 'failed';
  _cloudSyncReportNonFatal(App, 'realtime.subscribe', err, { throttleMs: 6000 });
  transport.handleRealtimeDisconnect('subscribe_error', isSubscribedRef, transportToken, disconnectStateRef, {
    lastError: normalizeUnknownError(err).message,
  });
  return 'failed';
}
