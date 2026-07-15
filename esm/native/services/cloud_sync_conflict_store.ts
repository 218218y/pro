import type {
  CloudSyncConflictFieldProjection,
  CloudSyncConflictRecord,
  CloudSyncConflictValue,
} from '../../../types';

import type { StorageLike } from './cloud_sync_owner_context_runtime_shared.js';

const CONFLICT_SCHEMA_VERSION = 2 as const;
export const CLOUD_SYNC_CONFLICT_PERSISTENCE_MAX_BYTES = 256 * 1024;

type StoredConflictRecord = CloudSyncConflictRecord & {
  schemaVersion: typeof CONFLICT_SCHEMA_VERSION;
};

type StoredResolvedConflict = {
  schemaVersion: typeof CONFLICT_SCHEMA_VERSION;
  conflictId: string;
  generation: number;
  room: string;
  state: 'resolved';
  resolvedAt: number;
};

function conflictStorageKey(storeId: string, room: string): string {
  return `wp_cloud_sync_conflict:v1:${encodeURIComponent(storeId)}:${encodeURIComponent(room)}`;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isConflictValue(value: unknown): value is CloudSyncConflictValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.present === false || (candidate.present === true && 'value' in candidate);
}

function isFieldProjection(value: unknown): value is CloudSyncConflictFieldProjection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.kind === 'field') {
    return (
      isConflictValue(candidate.base) && isConflictValue(candidate.local) && isConflictValue(candidate.remote)
    );
  }
  if (candidate.kind !== 'entities' || !Array.isArray(candidate.entities)) return false;
  const ids = new Set<string>();
  return candidate.entities.every(entity => {
    if (!entity || typeof entity !== 'object' || Array.isArray(entity)) return false;
    const entry = entity as Record<string, unknown>;
    const id = typeof entry.id === 'string' ? entry.id.trim() : '';
    if (!id || ids.has(id)) return false;
    ids.add(id);
    return isConflictValue(entry.base) && isConflictValue(entry.local) && isConflictValue(entry.remote);
  });
}

function normalizeStoredConflict(value: unknown, room: string): CloudSyncConflictRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== CONFLICT_SCHEMA_VERSION || record.room !== room) return null;
  const conflictId = typeof record.conflictId === 'string' ? record.conflictId.trim() : '';
  const generation = Number(record.generation);
  if (
    !conflictId ||
    !Number.isInteger(generation) ||
    generation < 1 ||
    !Array.isArray(record.keys) ||
    !Number.isInteger(Number(record.remoteRevision)) ||
    Number(record.remoteRevision) < 0 ||
    !Number.isFinite(Number(record.detectedAt)) ||
    Number(record.detectedAt) <= 0 ||
    (record.state !== 'awaiting-resolution' && record.state !== 'resolving') ||
    typeof record.projectionAvailable !== 'boolean' ||
    !record.fields ||
    typeof record.fields !== 'object' ||
    Array.isArray(record.fields)
  ) {
    return null;
  }
  const keys = [...new Set(record.keys.map(key => String(key).trim()).filter(Boolean))];
  if (!keys.length) return null;
  const rawFields = record.fields as Record<string, unknown>;
  if (record.projectionAvailable && keys.some(key => !isFieldProjection(rawFields[key]))) return null;
  if (Object.values(rawFields).some(field => !isFieldProjection(field))) return null;
  return {
    conflictId,
    generation,
    room,
    keys,
    remoteRevision: Number(record.remoteRevision),
    detectedAt: Number(record.detectedAt),
    state: 'awaiting-resolution',
    fields: cloneJson(rawFields) as Record<string, CloudSyncConflictFieldProjection>,
    projectionAvailable: record.projectionAvailable,
  };
}

function serializeWithinBudget(value: unknown): string | null {
  const serialized = JSON.stringify(value);
  return new TextEncoder().encode(serialized).byteLength <= CLOUD_SYNC_CONFLICT_PERSISTENCE_MAX_BYTES
    ? serialized
    : null;
}

function persistString(storage: StorageLike, key: string, serialized: string, value: unknown): boolean {
  if (typeof storage.setString === 'function') return storage.setString(key, serialized);
  return typeof storage.setJSON === 'function' ? storage.setJSON(key, value) : false;
}

function writeConflict(storage: StorageLike, key: string, conflict: CloudSyncConflictRecord): boolean {
  try {
    const stored: StoredConflictRecord = {
      schemaVersion: CONFLICT_SCHEMA_VERSION,
      ...cloneJson(conflict),
    };
    const serialized = serializeWithinBudget(stored);
    if (serialized) return persistString(storage, key, serialized, stored);

    const blocked: StoredConflictRecord = {
      schemaVersion: CONFLICT_SCHEMA_VERSION,
      ...conflict,
      fields: {},
      projectionAvailable: false,
    };
    const blockedSerialized = serializeWithinBudget(blocked);
    return !!blockedSerialized && persistString(storage, key, blockedSerialized, blocked);
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
    read(room) {
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
    write(conflict) {
      return writeConflict(storage, conflictStorageKey(storeId, conflict.room), conflict);
    },
    clear(room, conflict) {
      const key = conflictStorageKey(storeId, room);
      try {
        if (typeof storage.remove === 'function' && storage.remove(key)) return true;
      } catch {
        // Fall through to a minimal tombstone so the resolved payload cannot consume quota.
      }
      const tombstone: StoredResolvedConflict = {
        schemaVersion: CONFLICT_SCHEMA_VERSION,
        conflictId: conflict.conflictId,
        generation: conflict.generation,
        room,
        state: 'resolved',
        resolvedAt: Date.now(),
      };
      try {
        const serialized = JSON.stringify(tombstone);
        return persistString(storage, key, serialized, tombstone);
      } catch {
        return false;
      }
    },
  };
}
