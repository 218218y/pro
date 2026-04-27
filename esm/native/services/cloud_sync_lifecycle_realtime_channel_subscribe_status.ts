import {
  applyCloudSyncRealtimeSubscribeStatus,
  handleCloudSyncRealtimeSubscribeFailure,
} from './cloud_sync_lifecycle_realtime_channel_subscribe_status_runtime.js';
import type { CloudSyncRealtimeChannelSubscriptionArgs } from './cloud_sync_lifecycle_realtime_channel_subscribe_shared.js';

type CloudSyncRealtimeSubscribeStatusHandlerArgs = Pick<
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

export function createCloudSyncRealtimeSubscribeStatusHandler(
  args: CloudSyncRealtimeSubscribeStatusHandlerArgs
): (status: unknown) => void {
  return (status: unknown): void => {
    applyCloudSyncRealtimeSubscribeStatus({
      ...args,
      status,
    });
  };
}

export { handleCloudSyncRealtimeSubscribeFailure };
