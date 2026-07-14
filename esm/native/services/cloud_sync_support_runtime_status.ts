import type {
  CloudSyncCredentialStatus,
  CloudSyncPollingStatus,
  CloudSyncRealtimeStatus,
  CloudSyncRuntimeStatus,
} from '../../../types';

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
  const credential: CloudSyncCredentialStatus | null = status.credential
    ? {
        state: status.credential.state,
        expiresAt: String(status.credential.expiresAt || ''),
        retryAt: Number(status.credential.retryAt) || 0,
        failureKind: status.credential.failureKind || '',
      }
    : null;
  const conflict = status.conflict
    ? {
        room: String(status.conflict.room || ''),
        keys: Array.isArray(status.conflict.keys) ? status.conflict.keys.map(key => String(key)) : [],
        remoteRevision: Number(status.conflict.remoteRevision) || 0,
        detectedAt: Number(status.conflict.detectedAt) || 0,
        state: status.conflict.state,
      }
    : null;
  return {
    room: String(status.room || ''),
    clientId: String(status.clientId || ''),
    instanceId: String(status.instanceId || ''),
    realtime,
    polling,
    lastPullAttemptAt: Number(status.lastPullAttemptAt) || 0,
    lastPullSuccessAt: Number(status.lastPullSuccessAt) || 0,
    lastPullFailureAt: Number(status.lastPullFailureAt) || 0,
    lastPushAt: Number(status.lastPushAt) || 0,
    lastRealtimeEventAt: Number(status.lastRealtimeEventAt) || 0,
    lastError: String(status.lastError || ''),
    ...(credential ? { credential } : {}),
    ...(conflict ? { conflict } : {}),
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
    String(snapshot.lastPullAttemptAt),
    String(snapshot.lastPullSuccessAt),
    String(snapshot.lastPullFailureAt),
    String(snapshot.lastPushAt),
    String(snapshot.lastRealtimeEventAt),
    snapshot.lastError,
    snapshot.credential?.state || '',
    snapshot.credential?.expiresAt || '',
    String(snapshot.credential?.retryAt || 0),
    snapshot.credential?.failureKind || '',
    snapshot.conflict?.room || '',
    (snapshot.conflict?.keys || []).join(','),
    String(snapshot.conflict?.remoteRevision || 0),
    String(snapshot.conflict?.detectedAt || 0),
    snapshot.conflict?.state || '',
    snapshot.diagEnabled ? '1' : '0',
  ].join('|');
}
