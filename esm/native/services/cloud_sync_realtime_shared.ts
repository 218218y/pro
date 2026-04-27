import type {
  AppContainer,
  CloudSyncRealtimeChannelLike,
  CloudSyncRealtimeClientLike,
  CloudSyncRealtimeChannelOptionsLike,
  CloudSyncRuntimeStatus,
} from '../../../types';

import { getCloudSyncTestHooksMaybe } from '../runtime/cloud_sync_access.js';

export type CloudSyncRealtimeFactory = (
  url: string,
  key: string,
  opt?: Record<string, unknown>
) => CloudSyncRealtimeClientLike;

export function hasLiveRealtimeSubscriptionStatus(status: CloudSyncRuntimeStatus): boolean {
  const realtime = status?.realtime;
  return (
    realtime?.enabled !== false &&
    String(realtime?.state || '') === 'subscribed' &&
    String(realtime?.channel || '').trim().length > 0
  );
}

export function getRealtimeChannel(
  client: CloudSyncRealtimeClientLike | null,
  name: string,
  opts?: CloudSyncRealtimeChannelOptionsLike
): CloudSyncRealtimeChannelLike | null {
  return client && typeof client.channel === 'function' ? client.channel(name, opts) || null : null;
}

export function removeRealtimeChannel(
  client: CloudSyncRealtimeClientLike | null,
  channel: CloudSyncRealtimeChannelLike | null
): void {
  if (!client || !channel || typeof client.removeChannel !== 'function') return;
  client.removeChannel(channel);
}

export function disconnectRealtimeClient(client: CloudSyncRealtimeClientLike | null): void {
  const rt = client?.realtime;
  if (rt && typeof rt.disconnect === 'function') rt.disconnect();
}

export function getRealtimeCreateClientHook(App: AppContainer): CloudSyncRealtimeFactory | null {
  const hooks = getCloudSyncTestHooksMaybe(App);
  return hooks && typeof hooks.createSupabaseClient === 'function' ? hooks.createSupabaseClient : null;
}
