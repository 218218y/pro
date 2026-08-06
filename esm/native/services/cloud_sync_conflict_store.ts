import type {
  CloudSyncConflictFieldProjection,
  CloudSyncConflictRecord,
  CloudSyncConflictValue,
} from '../../../types';

import type { StorageLike } from './cloud_sync_owner_context_runtime_shared.js';

const CONFLICT_SCHEMA_VERSION = 3 as const;
export const CLOUD_SYNC_CONFLICT_PERSISTENCE_MAX_BYTES = 256 * 1024;

export type CloudSyncConflictStoreFailureOperation = 'read' | 'write' | 'clear-remove' | 'clear-tombstone';

export type CloudSyncConflictStoreFailure = {
  operation: CloudSyncConflictStoreFailureOperation;
  room: string;
  error: unknown;
};

export type CloudSyncConflictStoreFailureReporter = (failure: CloudSyncConflictStoreFailure) => void;

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
  if (
    candidate.kind !== 'entities' ||
    !Array.isArray(candidate.entities) ||
    !Array.isArray(candidate.localBaseline)
  ) {
    return false;
  }
  const baselineIds = new Set<string>();
  const validBaseline = candidate.localBaseline.every(entry => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
    const baseline = entry as Record<string, unknown>;
    const id = typeof baseline.id === 'string' ? baseline.id.trim() : '';
    const fingerprint = typeof baseline.fingerprint === 'string' ? baseline.fingerprint.trim() : '';
    if (!id || !fingerprint || baselineIds.has(id)) return false;
    baselineIds.add(id);
    return true;
  });
  if (!validBaseline) return false;
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
    typeof record.canKeepLocal !== 'boolean' ||
    typeof record.canUseRemote !== 'boolean' ||
    !record.fields ||
    typeof record.fields !== 'object' ||
    Array.isArray(record.fields)
  ) {
    return null;
  }
  const keys = [...new Set(record.keys.map(key => String(key).trim()).filter(Boolean))];
  if (!keys.length) return null;
  const limitationReason =
    record.limitationReason === 'projection-too-large' || record.limitationReason === 'projection-corrupt'
      ? record.limitationReason
      : undefined;
  if (
    record.canUseRemote !== true ||
    (record.projectionAvailable && (record.canKeepLocal !== true || limitationReason)) ||
    (!record.projectionAvailable && (record.canKeepLocal !== false || !limitationReason))
  ) {
    return null;
  }
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
    canKeepLocal: record.canKeepLocal,
    canUseRemote: record.canUseRemote,
    ...(limitationReason ? { limitationReason } : {}),
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

function reportConflictStoreFailure(
  reportFailure: CloudSyncConflictStoreFailureReporter | undefined,
  operation: CloudSyncConflictStoreFailureOperation,
  room: string,
  error: unknown
): void {
  if (typeof reportFailure !== 'function') return;
  try {
    reportFailure({ operation, room, error });
  } catch {
    return;
  }
}

function writeConflict(
  storage: StorageLike,
  key: string,
  conflict: CloudSyncConflictRecord,
  reportFailure?: CloudSyncConflictStoreFailureReporter
): boolean {
  try {
    const stored: StoredConflictRecord = {
      schemaVersion: CONFLICT_SCHEMA_VERSION,
      ...cloneJson(conflict),
    };
    const serialized = serializeWithinBudget(stored);
    if (serialized) {
      const persisted = persistString(storage, key, serialized, stored);
      if (!persisted) {
        reportConflictStoreFailure(
          reportFailure,
          'write',
          conflict.room,
          new Error(`Cloud Sync conflict write was rejected for ${conflict.room}`)
        );
      }
      return persisted;
    }

    const blocked: StoredConflictRecord = {
      schemaVersion: CONFLICT_SCHEMA_VERSION,
      ...conflict,
      fields: {},
      projectionAvailable: false,
      canKeepLocal: false,
      canUseRemote: true,
      limitationReason: 'projection-too-large',
    };
    const blockedSerialized = serializeWithinBudget(blocked);
    const persisted = !!blockedSerialized && persistString(storage, key, blockedSerialized, blocked);
    if (!persisted) {
      reportConflictStoreFailure(
        reportFailure,
        'write',
        conflict.room,
        new Error(`Cloud Sync bounded conflict write was rejected for ${conflict.room}`)
      );
    }
    return persisted;
  } catch (error) {
    reportConflictStoreFailure(reportFailure, 'write', conflict.room, error);
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
  reportFailure?: CloudSyncConflictStoreFailureReporter;
}): CloudSyncConflictStore {
  const { storage, storeId, reportFailure } = args;
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
      } catch (error) {
        reportConflictStoreFailure(reportFailure, 'read', room, error);
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
      return writeConflict(storage, conflictStorageKey(storeId, conflict.room), conflict, reportFailure);
    },
    clear(room, conflict) {
      const key = conflictStorageKey(storeId, room);
      try {
        if (typeof storage.remove === 'function' && storage.remove(key)) return true;
      } catch (error) {
        reportConflictStoreFailure(reportFailure, 'clear-remove', room, error);
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
        const persisted = persistString(storage, key, serialized, tombstone);
        if (!persisted) {
          reportConflictStoreFailure(
            reportFailure,
            'clear-tombstone',
            room,
            new Error(`Cloud Sync conflict tombstone write was rejected for ${room}`)
          );
        }
        return persisted;
      } catch (error) {
        reportConflictStoreFailure(reportFailure, 'clear-tombstone', room, error);
        return false;
      }
    },
  };
}
