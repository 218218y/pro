import type { CloudSyncConflictRecord, CloudSyncPayload } from '../../../types';

import type { StorageLike } from './cloud_sync_owner_context_runtime_shared.js';

const CONFLICT_SCHEMA_VERSION = 1 as const;

type StoredConflictRecord = CloudSyncConflictRecord & {
  schemaVersion: typeof CONFLICT_SCHEMA_VERSION;
};

function conflictStorageKey(storeId: string, room: string): string {
  return `wp_cloud_sync_conflict:v1:${encodeURIComponent(storeId)}:${encodeURIComponent(room)}`;
}

function clonePayload(value: CloudSyncPayload): CloudSyncPayload {
  try {
    return JSON.parse(JSON.stringify(value)) as CloudSyncPayload;
  } catch {
    return { ...value };
  }
}

function isPayload(value: unknown): value is CloudSyncPayload {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeStoredConflict(value: unknown, room: string): CloudSyncConflictRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== CONFLICT_SCHEMA_VERSION || record.room !== room) return null;
  if (
    !Array.isArray(record.keys) ||
    !Number.isInteger(Number(record.remoteRevision)) ||
    Number(record.remoteRevision) < 0 ||
    !Number.isFinite(Number(record.detectedAt)) ||
    Number(record.detectedAt) <= 0 ||
    !isPayload(record.base) ||
    !isPayload(record.local) ||
    !isPayload(record.remote)
  ) {
    return null;
  }
  if (record.state !== 'awaiting-resolution' && record.state !== 'resolving' && record.state !== 'resolved') {
    return null;
  }
  if (record.state === 'resolved') return null;
  const keys = [...new Set(record.keys.map(key => String(key).trim()).filter(Boolean))];
  if (!keys.length) return null;
  return {
    room,
    keys,
    remoteRevision: Number(record.remoteRevision),
    detectedAt: Number(record.detectedAt),
    state: 'awaiting-resolution',
    base: clonePayload(record.base),
    local: clonePayload(record.local),
    remote: clonePayload(record.remote),
  };
}

function writeConflict(storage: StorageLike, key: string, conflict: CloudSyncConflictRecord): boolean {
  try {
    const stored: StoredConflictRecord = {
      schemaVersion: CONFLICT_SCHEMA_VERSION,
      ...conflict,
      base: clonePayload(conflict.base),
      local: clonePayload(conflict.local),
      remote: clonePayload(conflict.remote),
    };
    if (typeof storage.setString === 'function') {
      return storage.setString(key, JSON.stringify(stored));
    }
    return typeof storage.setJSON === 'function' ? storage.setJSON(key, stored) : false;
  } catch {
    return false;
  }
}

export interface CloudSyncConflictStore {
  read(
    room: string
  ): { kind: 'missing' } | { kind: 'record'; conflict: CloudSyncConflictRecord } | { kind: 'corrupt' };
  write(conflict: CloudSyncConflictRecord): boolean;
  clear(room: string, conflict: CloudSyncConflictRecord): boolean;
}

export function createCloudSyncConflictStore(args: {
  storage: StorageLike;
  storeId: string;
}): CloudSyncConflictStore {
  const { storage, storeId } = args;
  return {
    read(
      room: string
    ): { kind: 'missing' } | { kind: 'record'; conflict: CloudSyncConflictRecord } | { kind: 'corrupt' } {
      const key = conflictStorageKey(storeId, room);
      let value: unknown = null;
      try {
        if (typeof storage.getString === 'function') {
          const raw = storage.getString(key);
          if (!raw) return { kind: 'missing' };
          value = JSON.parse(raw);
        } else if (typeof storage.getJSON === 'function') {
          value = storage.getJSON(key, null);
          if (value == null) return { kind: 'missing' };
        }
      } catch {
        return { kind: 'corrupt' };
      }
      const conflict = normalizeStoredConflict(value, room);
      if (conflict) return { kind: 'record', conflict };
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        (value as Record<string, unknown>).schemaVersion === CONFLICT_SCHEMA_VERSION &&
        (value as Record<string, unknown>).room === room &&
        (value as Record<string, unknown>).state === 'resolved'
      ) {
        return { kind: 'missing' };
      }
      return { kind: 'corrupt' };
    },
    write(conflict: CloudSyncConflictRecord): boolean {
      return writeConflict(storage, conflictStorageKey(storeId, conflict.room), conflict);
    },
    clear(room: string, conflict: CloudSyncConflictRecord): boolean {
      const key = conflictStorageKey(storeId, room);
      try {
        if (typeof storage.remove === 'function' && storage.remove(key)) return true;
      } catch {
        // Fall through to a resolved tombstone so this conflict cannot resurrect on reload.
      }
      return writeConflict(storage, key, { ...conflict, state: 'resolved' });
    },
  };
}
