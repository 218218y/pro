import {
  bindCloudSyncRealtimeSubscribeBeforeUnload,
  bindCloudSyncRealtimeBroadcastListener,
  armCloudSyncRealtimeConnectTimeout,
  createCloudSyncRealtimeSubscribeRefs,
} from './cloud_sync_lifecycle_realtime_channel_subscribe_bindings.js';
import {
  createCloudSyncRealtimeSubscribeStatusHandler,
  handleCloudSyncRealtimeSubscribeFailure,
} from './cloud_sync_lifecycle_realtime_channel_subscribe_status.js';
import {
  hasCloudSyncRealtimeChannelSubscriptionApi,
  type CloudSyncRealtimeChannelSubscriptionArgs,
} from './cloud_sync_lifecycle_realtime_channel_subscribe_shared.js';

export function subscribeCloudSyncRealtimeChannel(
  args: CloudSyncRealtimeChannelSubscriptionArgs
): 'ok' | 'stale' | 'failed' {
  const {
    runtimeStatus,
    publishStatus,
    diag,
    startPolling,
    transport,
    transportToken,
    disconnectStateRef,
    isCurrentRealtimeStart,
    chan,
  } = args;

  if (!hasCloudSyncRealtimeChannelSubscriptionApi(chan)) {
    transport.setRealtimeFailure(
      'error',
      'channel listener API not available',
      'realtime:error',
      'missing-channel-api'
    );
    return 'failed';
  }

  bindCloudSyncRealtimeBroadcastListener(args);

  const { isSubscribedRef, everSubscribedRef } = createCloudSyncRealtimeSubscribeRefs();
  armCloudSyncRealtimeConnectTimeout({
    ...args,
    runtimeStatus,
    publishStatus,
    diag,
    startPolling,
    isSubscribedRef,
  });

  const onSubscribeStatus = createCloudSyncRealtimeSubscribeStatusHandler({
    ...args,
    isSubscribedRef,
    everSubscribedRef,
  });

  try {
    chan.subscribe?.call(chan, onSubscribeStatus);
  } catch (err) {
    return handleCloudSyncRealtimeSubscribeFailure({
      App: args.App,
      transport,
      transportToken,
      disconnectStateRef,
      isDisposed: args.isDisposed,
      err,
      isSubscribedRef,
    });
  }

  if (!isCurrentRealtimeStart()) return 'stale';
  bindCloudSyncRealtimeSubscribeBeforeUnload(args);
  return 'ok';
}
