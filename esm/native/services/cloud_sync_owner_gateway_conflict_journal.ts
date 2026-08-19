import type {
  AppContainer,
  CloudSyncConflictRecord,
  CloudSyncConflictStatus,
  CloudSyncPayload,
  CloudSyncRuntimeStatus,
  CloudSyncStateRow,
} from '../../../types';

import type { SupabaseCfg } from './cloud_sync_config.js';
import { createCloudSyncConflictStore } from './cloud_sync_conflict_store.js';
import type { CloudSyncOwnerRooms } from './cloud_sync_owner_context_rooms.js';
import { buildCloudSyncConflictFields } from './cloud_sync_payload_merge.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support_feedback.js';
import { stableSerializeCloudSyncValue } from './cloud_sync_support_serialize.js';
import type { StorageLike } from './cloud_sync_owner_context_runtime_shared.js';
import { cloneCloudSyncGatewayPayload } from './cloud_sync_owner_gateway_payload.js';

export type CloudSyncOwnerConflictJournal = {
  toStatus: (conflict: CloudSyncConflictRecord) => CloudSyncConflictStatus;
  readActive: () => CloudSyncConflictRecord | null;
  readTransientBase: () => CloudSyncPayload | null;
  isMainCollectionsRoom: (room: string) => boolean;
  reconcile: (room: string, forceLockedReread?: boolean) => boolean;
  publishConflict: (args: {
    room: string;
    row: CloudSyncStateRow;
    keys: string[];
    base: CloudSyncPayload;
    local: CloudSyncPayload;
  }) => CloudSyncConflictRecord;
  publishState: (conflict: CloudSyncConflictRecord, state: CloudSyncConflictRecord['state']) => boolean;
  finalize: (room: string, expectedConflictId?: string) => boolean;
};

export function createCloudSyncOwnerConflictJournal(args: {
  App: AppContainer;
  cfg: SupabaseCfg;
  rooms: CloudSyncOwnerRooms;
  clientId: string;
  runtimeStatus: CloudSyncRuntimeStatus;
  publishStatus: () => void;
  storage?: StorageLike;
}): CloudSyncOwnerConflictJournal {
  const { App, cfg, rooms, clientId, runtimeStatus, publishStatus } = args;
  const conflictStore = args.storage
    ? createCloudSyncConflictStore({
        storage: args.storage,
        storeId: cfg.storeId,
        reportFailure: failure => {
          _cloudSyncReportNonFatal(App, `conflict.store.${failure.operation}`, failure.error, {
            throttleMs: 8000,
          });
        },
      })
    : null;

  const corruptConflictKey = 'conflict-record-corrupt';
  const storedConflict = conflictStore?.read(rooms.currentRoom()) || { kind: 'missing' as const };
  let activeConflict = storedConflict.kind === 'record' ? storedConflict.conflict : null;
  let activeConflictBase: CloudSyncPayload | null = null;
  let activeConflictStoreObserved = storedConflict.kind === 'record' || storedConflict.kind === 'corrupt';

  const toConflictStatus = (conflict: CloudSyncConflictRecord): CloudSyncConflictStatus => ({
    conflictId: conflict.conflictId,
    generation: conflict.generation,
    room: conflict.room,
    keys: conflict.keys.slice(),
    remoteRevision: conflict.remoteRevision,
    detectedAt: conflict.detectedAt,
    state: conflict.state,
    canKeepLocal: conflict.canKeepLocal,
    canUseRemote: conflict.canUseRemote,
    ...(conflict.limitationReason ? { limitationReason: conflict.limitationReason } : {}),
  });

  const buildCorruptConflict = (room: string): CloudSyncConflictRecord => ({
    conflictId: `${clientId}:corrupt:${Date.now()}`,
    generation: 1,
    room,
    keys: [corruptConflictKey],
    remoteRevision: 0,
    detectedAt: Date.now(),
    state: 'awaiting-resolution',
    canKeepLocal: false,
    canUseRemote: true,
    limitationReason: 'projection-corrupt',
    fields: {},
    projectionAvailable: false,
  });

  if (storedConflict.kind === 'corrupt') activeConflict = buildCorruptConflict(rooms.currentRoom());
  if (activeConflict) {
    runtimeStatus.conflict = toConflictStatus(activeConflict);
    runtimeStatus.lastError = `conflict:${activeConflict.keys.join(',') || 'revision'}`;
  }

  const persistConflict = (conflict: CloudSyncConflictRecord): boolean => {
    const persisted = !conflictStore || conflictStore.write(conflict);
    if (persisted && conflictStore && conflict.projectionAvailable) {
      const stored = conflictStore.read(conflict.room);
      if (stored.kind === 'record' && !stored.conflict.projectionAvailable) {
        conflict.fields = {};
        conflict.projectionAvailable = false;
        conflict.canKeepLocal = false;
        conflict.canUseRemote = stored.conflict.canUseRemote;
        if (stored.conflict.limitationReason) conflict.limitationReason = stored.conflict.limitationReason;
        else delete conflict.limitationReason;
      }
    }
    return persisted;
  };

  const isCorruptStoredConflict = (conflict: CloudSyncConflictRecord): boolean =>
    conflict.keys.includes(corruptConflictKey);

  const isConflictOpen = (room: string): boolean => {
    const conflict = activeConflict;
    return !!(
      conflict &&
      conflict.room === room &&
      (conflict.state === 'awaiting-resolution' || conflict.state === 'resolving')
    );
  };

  const isMainCollectionsRoom = (room: string): boolean => room === rooms.currentRoom();

  const clearConflictStatus = (
    room: string,
    expectedConflictId?: string,
    durableResolutionRecorded = false
  ): boolean => {
    const conflict = activeConflict;
    if (!conflict || conflict.room !== room) return true;
    if (expectedConflictId && conflict.conflictId !== expectedConflictId) return false;
    const cleared = !conflictStore || conflictStore.clear(room, conflict);
    if (!durableResolutionRecorded && !cleared) {
      conflict.state = 'awaiting-resolution';
      activeConflict = conflict;
      runtimeStatus.conflict = toConflictStatus(conflict);
      runtimeStatus.lastError = 'conflict:persistence-finalize';
      publishStatus();
      return false;
    }
    activeConflict = null;
    activeConflictBase = null;
    activeConflictStoreObserved = false;
    delete runtimeStatus.conflict;
    if (runtimeStatus.lastError.startsWith('conflict:')) runtimeStatus.lastError = '';
    publishStatus();
    return true;
  };

  const publishConflictState = (
    conflict: CloudSyncConflictRecord,
    state: CloudSyncConflictRecord['state']
  ): boolean => {
    conflict.state = state;
    activeConflict = conflict;
    const persisted = persistConflict(conflict);
    if (persisted) activeConflictStoreObserved = true;
    runtimeStatus.conflict = toConflictStatus(conflict);
    runtimeStatus.lastError = persisted
      ? `conflict:${conflict.keys.join(',') || 'revision'}`
      : 'conflict:persistence-write';
    publishStatus();
    return persisted;
  };

  const finalizeConflictStatus = (room: string, expectedConflictId?: string): boolean => {
    const conflict = activeConflict;
    if (!conflict || conflict.room !== room) return true;
    if (expectedConflictId && conflict.conflictId !== expectedConflictId) return false;
    const resolvedPersisted = publishConflictState(conflict, 'resolved');
    return clearConflictStatus(room, expectedConflictId, resolvedPersisted);
  };

  const publishConflictStatus = (publishArgs: {
    room: string;
    row: CloudSyncStateRow;
    keys: string[];
    base: CloudSyncPayload;
    local: CloudSyncPayload;
  }): CloudSyncConflictRecord => {
    const { room, row, keys, base, local } = publishArgs;
    const normalizedKeys = [...new Set(keys.map(key => String(key).trim()).filter(Boolean))];
    const generation = (activeConflict?.room === room ? activeConflict.generation : 0) + 1;
    const conflict: CloudSyncConflictRecord = {
      conflictId: `${clientId}:${Date.now()}:${generation}`,
      generation,
      room,
      keys: normalizedKeys,
      remoteRevision: row.revision,
      detectedAt: Date.now(),
      state: 'awaiting-resolution',
      canKeepLocal: true,
      canUseRemote: true,
      fields: buildCloudSyncConflictFields({
        conflictKeys: normalizedKeys,
        base,
        local,
        remote: row.payload || {},
      }),
      projectionAvailable: true,
    };
    activeConflict = conflict;
    activeConflictBase = cloneCloudSyncGatewayPayload(base);
    const persisted = persistConflict(conflict);
    if (persisted) activeConflictStoreObserved = true;
    runtimeStatus.conflict = toConflictStatus(conflict);
    runtimeStatus.lastError = persisted
      ? `conflict:${normalizedKeys.join(',') || 'revision'}`
      : 'conflict:persistence-write';
    publishStatus();
    return conflict;
  };

  const reconcileStoredConflict = (room: string, forceLockedReread = false): boolean => {
    if (!conflictStore || !isMainCollectionsRoom(room)) return isConflictOpen(room);
    if (!forceLockedReread && activeConflict?.room === room && activeConflict.state === 'resolving') {
      return true;
    }

    const stored = conflictStore.read(room);
    if (stored.kind === 'record') {
      const changed =
        !activeConflict ||
        activeConflict.room !== room ||
        stableSerializeCloudSyncValue(activeConflict) !== stableSerializeCloudSyncValue(stored.conflict);
      if (changed) {
        activeConflict = stored.conflict;
        activeConflictBase = null;
      }
      activeConflictStoreObserved = true;
      if (changed) {
        runtimeStatus.conflict = toConflictStatus(stored.conflict);
        runtimeStatus.lastError = `conflict:${stored.conflict.keys.join(',') || 'revision'}`;
        publishStatus();
      }
      return true;
    }

    if (stored.kind === 'corrupt') {
      if (!activeConflict || !isCorruptStoredConflict(activeConflict)) {
        activeConflict = buildCorruptConflict(room);
        activeConflictBase = null;
        activeConflictStoreObserved = true;
        runtimeStatus.conflict = toConflictStatus(activeConflict);
        runtimeStatus.lastError = `conflict:${corruptConflictKey}`;
        publishStatus();
      }
      return true;
    }

    if (activeConflict?.room === room) {
      if (!activeConflictStoreObserved) {
        const persisted = persistConflict(activeConflict);
        if (persisted) {
          activeConflictStoreObserved = true;
          runtimeStatus.conflict = toConflictStatus(activeConflict);
          runtimeStatus.lastError = `conflict:${activeConflict.keys.join(',') || 'revision'}`;
          publishStatus();
        }
        return true;
      }
      activeConflict = null;
      activeConflictBase = null;
      activeConflictStoreObserved = false;
      delete runtimeStatus.conflict;
      if (runtimeStatus.lastError.startsWith('conflict:')) runtimeStatus.lastError = '';
      publishStatus();
    }
    return isConflictOpen(room);
  };

  return {
    toStatus: toConflictStatus,
    readActive: () => activeConflict,
    readTransientBase: () => activeConflictBase,
    isMainCollectionsRoom,
    reconcile: reconcileStoredConflict,
    publishConflict: publishConflictStatus,
    publishState: publishConflictState,
    finalize: finalizeConflictStatus,
  };
}
