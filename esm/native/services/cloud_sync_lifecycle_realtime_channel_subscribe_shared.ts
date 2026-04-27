import type { CloudSyncRealtimeChannelLike } from '../../../types';

import type { CloudSyncRealtimeChannelStartArgs } from './cloud_sync_lifecycle_realtime_channel_shared.js';

export type CloudSyncRealtimeChannelSubscriptionArgs = Pick<
  CloudSyncRealtimeChannelStartArgs,
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
  | 'markRealtimeEvent'
  | 'realtimeScopedHandlers'
  | 'addListener'
  | 'setTimeoutFn'
  | 'refs'
  | 'setSendRealtimeHint'
  | 'transport'
  | 'restartRealtime'
> & {
  transportToken: number;
  disconnectStateRef: { current: boolean };
  isCurrentRealtimeStart: () => boolean;
  chan: CloudSyncRealtimeChannelLike;
};

export function hasCloudSyncRealtimeChannelSubscriptionApi(chan: CloudSyncRealtimeChannelLike): boolean {
  return typeof chan.on === 'function' && typeof chan.subscribe === 'function';
}
