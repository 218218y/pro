import type {
  CloudSyncPanelSnapshot,
  CloudSyncRuntimeStatus,
  CloudSyncSite2TabsGateSnapshot,
  UnknownRecord,
} from '../../../types';

import { cloneCloudSyncSite2TabsGateSnapshot } from './cloud_sync_tabs_gate_support.js';

export function asCloudSyncPublicRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

export function cloneCloudSyncPanelSnapshot(snapshot: CloudSyncPanelSnapshot): CloudSyncPanelSnapshot {
  return {
    room: snapshot.room || '',
    isPublic: typeof snapshot.isPublic === 'boolean' ? snapshot.isPublic : null,
    status: snapshot.status || 'offline',
    credentialState: snapshot.credentialState || 'missing',
    credentialExpiresAt: snapshot.credentialExpiresAt || '',
    retryAt: Number(snapshot.retryAt) || 0,
    failureKind: snapshot.failureKind || '',
    floatingSync: !!snapshot.floatingSync,
  };
}

export function getUnavailableCloudSyncPanelSnapshot(): CloudSyncPanelSnapshot {
  return {
    room: '',
    isPublic: null,
    status: 'offline',
    credentialState: 'offline',
    credentialExpiresAt: '',
    retryAt: 0,
    failureKind: 'network',
    floatingSync: false,
  };
}

export function cloneCloudSyncPublicPanelSnapshot(snapshot: unknown): CloudSyncPanelSnapshot {
  const rec = asCloudSyncPublicRecord(snapshot);
  if (!rec) return getUnavailableCloudSyncPanelSnapshot();
  return cloneCloudSyncPanelSnapshot({
    room: typeof rec.room === 'string' ? rec.room : '',
    isPublic: typeof rec.isPublic === 'boolean' ? rec.isPublic : null,
    status: typeof rec.status === 'string' && rec.status ? rec.status : 'offline',
    credentialState:
      rec.credentialState === 'public' ||
      rec.credentialState === 'active' ||
      rec.credentialState === 'expiring' ||
      rec.credentialState === 'expired' ||
      rec.credentialState === 'missing' ||
      rec.credentialState === 'rate-limited' ||
      rec.credentialState === 'offline' ||
      rec.credentialState === 'error'
        ? rec.credentialState
        : 'missing',
    credentialExpiresAt: typeof rec.credentialExpiresAt === 'string' ? rec.credentialExpiresAt : '',
    retryAt: Number(rec.retryAt) || 0,
    failureKind:
      rec.failureKind === 'auth-expired' ||
      rec.failureKind === 'auth-invalid' ||
      rec.failureKind === 'rate-limit' ||
      rec.failureKind === 'network' ||
      rec.failureKind === 'server'
        ? rec.failureKind
        : '',
    floatingSync: !!rec.floatingSync,
  });
}

export function getUnavailableCloudSyncSite2TabsGateSnapshot(): CloudSyncSite2TabsGateSnapshot {
  return {
    open: false,
    until: 0,
    minutesLeft: 0,
  };
}

export function cloneCloudSyncPublicSite2TabsGateSnapshot(snapshot: unknown): CloudSyncSite2TabsGateSnapshot {
  const rec = asCloudSyncPublicRecord(snapshot);
  if (!rec) return getUnavailableCloudSyncSite2TabsGateSnapshot();
  return cloneCloudSyncSite2TabsGateSnapshot({
    open: !!rec.open,
    until: Number(rec.until) || 0,
    minutesLeft: Number(rec.minutesLeft) || 0,
  });
}

export function getUnavailableCloudSyncRuntimeStatus(): CloudSyncRuntimeStatus {
  return {
    room: '',
    clientId: '',
    instanceId: '',
    realtime: {
      enabled: false,
      mode: 'broadcast',
      state: 'unavailable',
      channel: '',
    },
    polling: {
      active: false,
      intervalMs: 0,
      reason: 'unavailable',
    },
    lastPullAt: 0,
    lastPushAt: 0,
    lastRealtimeEventAt: 0,
    lastError: 'unavailable',
    credential: {
      state: 'offline',
      expiresAt: '',
      retryAt: 0,
      failureKind: 'network',
    },
    diagEnabled: false,
  };
}
