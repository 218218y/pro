import type { CloudSyncPollingStatus, CloudSyncRealtimeStatus, CloudSyncRuntimeStatus } from '../../../types';

export function cloneRuntimeStatus(status: CloudSyncRuntimeStatus): CloudSyncRuntimeStatus {
  const sourceRealtime = status.realtime || ({} as CloudSyncRealtimeStatus);
  const sourcePolling = status.polling || ({} as CloudSyncPollingStatus);
  const realtime: CloudSyncRealtimeStatus = {
    enabled: !!sourceRealtime.enabled,
    mode: sourceRealtime.mode === 'broadcast' ? 'broadcast' : 'broadcast',
    state: String(sourceRealtime.state || ''),
    channel: String(sourceRealtime.channel || ''),
  };
  const polling: CloudSyncPollingStatus = {
    active: !!sourcePolling.active,
    intervalMs: Number(sourcePolling.intervalMs) || 0,
    reason: String(sourcePolling.reason || ''),
  };
  return {
    room: String(status.room || ''),
    clientId: String(status.clientId || ''),
    instanceId: String(status.instanceId || ''),
    realtime,
    polling,
    lastPullAt: Number(status.lastPullAt) || 0,
    lastPushAt: Number(status.lastPushAt) || 0,
    lastRealtimeEventAt: Number(status.lastRealtimeEventAt) || 0,
    lastError: String(status.lastError || ''),
    diagEnabled: !!status.diagEnabled,
  };
}

export function buildRuntimeStatusSnapshotKey(status: CloudSyncRuntimeStatus): string {
  const snapshot = cloneRuntimeStatus(status);
  const realtime = snapshot.realtime;
  const polling = snapshot.polling;
  return [
    snapshot.room,
    snapshot.clientId,
    snapshot.instanceId,
    realtime.enabled ? '1' : '0',
    realtime.mode,
    realtime.state,
    realtime.channel,
    polling.active ? '1' : '0',
    String(polling.intervalMs),
    polling.reason,
    String(snapshot.lastPullAt),
    String(snapshot.lastPushAt),
    String(snapshot.lastRealtimeEventAt),
    snapshot.lastError,
    snapshot.diagEnabled ? '1' : '0',
  ].join('|');
}
