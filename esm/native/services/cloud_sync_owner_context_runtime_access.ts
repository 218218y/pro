import type {
  AppContainer,
  CloudSyncConflictRecord,
  CloudSyncConflictResolution,
  CloudSyncConflictResolutionResult,
  CloudSyncConflictStatus,
  CloudSyncCredentialIssueResult,
  CloudSyncGatewayFailure,
  CloudSyncGatewayReadResult,
  CloudSyncPayload,
  CloudSyncRemoteAdoptionResult,
  CloudSyncRoomCredential,
  CloudSyncRuntimeStatus,
  CloudSyncStateRow,
  CloudSyncUpsertResult,
  IntervalHandleLike,
  TimeoutHandleLike,
} from '../../../types';

import { getBrowserFetchMaybe, getBrowserTimers, getNavigatorMaybe } from '../runtime/api.js';
import { getStorageServiceMaybe } from '../runtime/storage_access.js';
import type { SupabaseCfg } from './cloud_sync_config.js';
import { createCloudSyncConflictStore } from './cloud_sync_conflict_store.js';
import { createCloudCollectionsWebLock } from './cloud_collections_mutation_lock.js';
import {
  createInProcessCloudCollectionsMutationLock,
  createUnavailableCloudCollectionsMutationLock,
} from './cloud_sync_collections_repository.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support_feedback.js';
import {
  createPrivateRoomCredential,
  getGatewayRow,
  issuePublicRoomCredential,
  renewPrivateRoomCredential,
  writeGatewayRow,
} from './cloud_sync_gateway.js';
import type { CloudSyncOwnerRooms } from './cloud_sync_owner_context_rooms.js';
import {
  buildCloudSyncConflictFields,
  mergeCloudSyncPayloads,
  projectCloudSyncConflictRemotePayload,
  rebaseCloudSyncKeepLocal,
} from './cloud_sync_payload_merge.js';
import {
  buildCloudSyncCredentialStatus,
  classifyCloudSyncCredential,
} from './cloud_sync_room_credentials.js';
import { isCloudSyncStorageLike, type StorageLike } from './cloud_sync_owner_context_runtime_shared.js';
import { stableSerializeCloudSyncValue } from './cloud_sync_support_serialize.js';

export type CloudSyncConflictLocalSnapshot = {
  payload: CloudSyncPayload;
  revision: number;
};

export type CloudSyncGetRowFn = (
  gatewayUrlIn: string,
  anonKeyIn: string,
  roomIn: string
) => Promise<CloudSyncGatewayReadResult>;

export type CloudSyncUpsertRowFn = (
  gatewayUrlIn: string,
  anonKeyIn: string,
  roomIn: string,
  payloadIn: CloudSyncPayload
) => Promise<CloudSyncUpsertResult>;

export type CloudSyncIssuePrivateRoomFn = () => Promise<CloudSyncCredentialIssueResult>;
export type CloudSyncResolveConflictFn = (
  room: string,
  resolution: CloudSyncConflictResolution,
  adoptRemote: (
    row: CloudSyncStateRow,
    expectedLocalRevision: number
  ) => Promise<CloudSyncRemoteAdoptionResult>,
  readLocalSnapshot: () => CloudSyncConflictLocalSnapshot,
  expectedConflictId?: string
) => Promise<CloudSyncConflictResolutionResult>;

const processConflictResolutionLock = createInProcessCloudCollectionsMutationLock();

export function createCloudSyncOwnerTimers(App: AppContainer): {
  setTimeoutFn: (handler: () => void, ms: number) => TimeoutHandleLike;
  clearTimeoutFn: (id: TimeoutHandleLike | null | undefined) => void;
  setIntervalFn: (handler: () => void, ms: number) => IntervalHandleLike;
  clearIntervalFn: (id: IntervalHandleLike | null | undefined) => void;
} {
  const timers = getBrowserTimers(App);
  return {
    setTimeoutFn: (handler: () => void, ms: number): TimeoutHandleLike => timers.setTimeout(handler, ms),
    clearTimeoutFn: (id: TimeoutHandleLike | null | undefined): void => {
      if (id == null) return;
      timers.clearTimeout(id);
    },
    setIntervalFn: (handler: () => void, ms: number): IntervalHandleLike => timers.setInterval(handler, ms),
    clearIntervalFn: (id: IntervalHandleLike | null | undefined): void => {
      if (id == null) return;
      timers.clearInterval(id);
    },
  };
}

export function createCloudSyncOwnerGatewayIo(args: {
  App: AppContainer;
  cfg: SupabaseCfg;
  gatewayUrl: string;
  rooms: CloudSyncOwnerRooms;
  clientId: string;
  runtimeStatus: CloudSyncRuntimeStatus;
  publishStatus: () => void;
  storage?: StorageLike;
}): {
  getRow: CloudSyncGetRowFn;
  upsertRow: CloudSyncUpsertRowFn;
  issuePrivateRoom: CloudSyncIssuePrivateRoomFn;
  resolveConflict: CloudSyncResolveConflictFn;
} | null {
  const { App, cfg, gatewayUrl, rooms, clientId, runtimeStatus, publishStatus } = args;
  const fetchFn = getBrowserFetchMaybe(App);
  if (!fetchFn) return null;
  const rowCache = new Map<string, CloudSyncStateRow>();
  let publicCredential: CloudSyncRoomCredential | null = null;
  let publicCredentialPromise: Promise<CloudSyncRoomCredential | null> | null = null;
  let privateCredentialPromise: Promise<CloudSyncRoomCredential | null> | null = null;
  let privateCredentialMemory: CloudSyncRoomCredential | null = null;
  let lastCredentialFailure: CloudSyncGatewayFailure | null = null;
  const conflictStore = args.storage
    ? createCloudSyncConflictStore({ storage: args.storage, storeId: cfg.storeId })
    : null;
  const navigatorValue = getNavigatorMaybe(App);
  const conflictResolutionLock = navigatorValue
    ? 'locks' in navigatorValue
      ? createCloudCollectionsWebLock(navigatorValue.locks)
      : createUnavailableCloudCollectionsMutationLock()
    : processConflictResolutionLock;
  const conflictResolutionLockName = `wardrobe-pro:cloud-conflict:${cfg.storeId}`;
  const storedConflict = conflictStore?.read(rooms.currentRoom()) || { kind: 'missing' as const };
  let activeConflict = storedConflict.kind === 'record' ? storedConflict.conflict : null;
  let activeConflictBase: CloudSyncPayload | null = null;
  let activeConflictStoreObserved = storedConflict.kind === 'record' || storedConflict.kind === 'corrupt';
  const corruptConflictKey = 'conflict-record-corrupt';
  if (storedConflict.kind === 'corrupt') {
    activeConflict = {
      conflictId: `${clientId}:corrupt:${Date.now()}`,
      generation: 1,
      room: rooms.currentRoom(),
      keys: [corruptConflictKey],
      remoteRevision: 0,
      detectedAt: Date.now(),
      state: 'awaiting-resolution',
      fields: {},
      projectionAvailable: false,
    };
  }

  const toConflictStatus = (conflict: CloudSyncConflictRecord): CloudSyncConflictStatus => ({
    conflictId: conflict.conflictId,
    generation: conflict.generation,
    room: conflict.room,
    keys: conflict.keys.slice(),
    remoteRevision: conflict.remoteRevision,
    detectedAt: conflict.detectedAt,
    state: conflict.state,
  });

  if (activeConflict) {
    runtimeStatus.conflict = toConflictStatus(activeConflict);
    runtimeStatus.lastError = `conflict:${activeConflict.keys.join(',') || 'revision'}`;
  }

  const reportConflictPersistenceFailure = (op: 'write' | 'clear'): void => {
    _cloudSyncReportNonFatal(
      App,
      `conflict.persistence.${op}`,
      new Error(`Cloud Sync conflict persistence ${op} failed`),
      { throttleMs: 8000 }
    );
  };

  const persistConflict = (conflict: CloudSyncConflictRecord): boolean => {
    const persisted = !conflictStore || conflictStore.write(conflict);
    if (!persisted) reportConflictPersistenceFailure('write');
    return persisted;
  };

  const isCorruptStoredConflict = (conflict: CloudSyncConflictRecord): boolean =>
    conflict.keys.includes(corruptConflictKey);

  const missingCredentialFailure = (): CloudSyncGatewayFailure => ({
    kind: 'auth-invalid',
    status: 403,
    code: 'credential_missing',
  });

  const publishCredentialStatus = (
    credential: CloudSyncRoomCredential | null,
    failure: CloudSyncGatewayFailure | null = null
  ): void => {
    lastCredentialFailure = failure;
    runtimeStatus.credential = buildCloudSyncCredentialStatus({
      isPublic: rooms.currentRoom() === cfg.publicRoom,
      credential,
      failure,
    });
    if (failure) runtimeStatus.lastError = `credential:${failure.kind}`;
    else if (runtimeStatus.lastError.startsWith('credential:')) runtimeStatus.lastError = '';
    publishStatus();
  };

  const isCredentialUsable = (credential: CloudSyncRoomCredential | null): boolean => {
    const expiresAt = credential ? Date.parse(credential.expiresAt) : Number.NaN;
    return !!credential?.token && Number.isFinite(expiresAt) && expiresAt > Date.now() + 60_000;
  };

  const readActiveRateLimitFailure = (): CloudSyncGatewayFailure | null => {
    const status = runtimeStatus.credential;
    const retryAt = Number(status?.retryAt) || 0;
    const remainingMs = retryAt - Date.now();
    if (status?.state !== 'rate-limited' || remainingMs <= 0) return null;
    return {
      kind: 'rate-limit',
      status: 429,
      code: 'rate_limit',
      retryAfterMs: remainingMs,
    };
  };

  const resolvePublicCredential = async (): Promise<CloudSyncRoomCredential | null> => {
    if (isCredentialUsable(publicCredential)) return publicCredential;
    if (!publicCredentialPromise) {
      publicCredentialPromise = issuePublicRoomCredential({
        fetchFn,
        gatewayUrl,
        anonKey: cfg.anonKey,
        storeId: cfg.storeId,
      }).then(result => {
        if (result.ok === false) {
          publishCredentialStatus(null, result.failure);
          return null;
        }
        return result.credential;
      });
    }
    const pending = publicCredentialPromise;
    const credential = await pending;
    if (publicCredentialPromise === pending) publicCredentialPromise = null;
    publicCredential = isCredentialUsable(credential) ? credential : null;
    if (publicCredential) publishCredentialStatus(publicCredential);
    return publicCredential;
  };

  const renewPrivateCredential = async (
    credential: CloudSyncRoomCredential
  ): Promise<CloudSyncRoomCredential | null> => {
    if (!privateCredentialPromise) {
      privateCredentialPromise = renewPrivateRoomCredential({
        fetchFn,
        gatewayUrl,
        anonKey: cfg.anonKey,
        storeId: cfg.storeId,
        room: credential.room,
        roomToken: credential.token,
      }).then(result => {
        if (result.ok === false) {
          publishCredentialStatus(credential, result.failure);
          return null;
        }
        privateCredentialMemory = result.credential;
        rooms.setPrivateRoomCredential(result.credential);
        publishCredentialStatus(result.credential);
        return result.credential;
      });
    }
    const pending = privateCredentialPromise;
    const renewed = await pending;
    if (privateCredentialPromise === pending) privateCredentialPromise = null;
    return renewed;
  };

  const resolveRoomCredential = async (room: string): Promise<CloudSyncRoomCredential | null> => {
    const rateLimitFailure = readActiveRateLimitFailure();
    if (rateLimitFailure) {
      lastCredentialFailure = rateLimitFailure;
      return null;
    }
    const baseRoom = rooms.currentRoom();
    if (!baseRoom || (room !== baseRoom && !room.startsWith(`${baseRoom}::`))) {
      publishCredentialStatus(null, missingCredentialFailure());
      return null;
    }
    if (baseRoom === cfg.publicRoom) return resolvePublicCredential();
    const storedCredential = rooms.currentRoomCredential();
    const memoryExpiry = Date.parse(privateCredentialMemory?.expiresAt || '');
    const storedExpiry = Date.parse(storedCredential?.expiresAt || '');
    const memoryExpiresAt = Number.isFinite(memoryExpiry) ? memoryExpiry : Number.NEGATIVE_INFINITY;
    const storedExpiresAt = Number.isFinite(storedExpiry) ? storedExpiry : Number.NEGATIVE_INFINITY;
    const credential =
      privateCredentialMemory?.room === baseRoom && memoryExpiresAt > storedExpiresAt
        ? privateCredentialMemory
        : storedCredential;
    const state = classifyCloudSyncCredential(credential);
    if (!credential || state === 'missing' || state === 'expired') {
      publishCredentialStatus(
        credential,
        state === 'expired'
          ? { kind: 'auth-expired', status: 403, code: 'room_token_expired' }
          : missingCredentialFailure()
      );
      return null;
    }
    if (state === 'expiring') return renewPrivateCredential(credential);
    publishCredentialStatus(credential);
    return credential;
  };

  const cacheRow = (row: CloudSyncStateRow | null | undefined): void => {
    if (row) rowCache.set(row.room, row);
  };

  const clonePayload = (payload: CloudSyncPayload): CloudSyncPayload => {
    const source = payload && typeof payload === 'object' ? payload : {};
    try {
      return JSON.parse(JSON.stringify(source)) as CloudSyncPayload;
    } catch {
      return { ...source };
    }
  };

  const payloadDifferenceKeys = (left: CloudSyncPayload, right: CloudSyncPayload): string[] => {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    return Array.from(keys)
      .sort()
      .filter(key => {
        const leftHasKey = Object.prototype.hasOwnProperty.call(left, key);
        const rightHasKey = Object.prototype.hasOwnProperty.call(right, key);
        if (leftHasKey !== rightHasKey) return true;
        return stableSerializeCloudSyncValue(left[key]) !== stableSerializeCloudSyncValue(right[key]);
      });
  };

  const isConflictOpen = (room: string): boolean => {
    const conflict = activeConflict;
    return !!(
      conflict &&
      conflict.room === room &&
      (conflict.state === 'awaiting-resolution' || conflict.state === 'resolving')
    );
  };

  const isMainCollectionsRoom = (room: string): boolean => room === rooms.currentRoom();

  const clearConflictStatus = (room: string, expectedConflictId?: string): void => {
    const conflict = activeConflict;
    if (!conflict || conflict.room !== room) return;
    if (expectedConflictId && conflict.conflictId !== expectedConflictId) return;
    const cleared = !conflictStore || conflictStore.clear(room, conflict);
    if (!cleared) {
      reportConflictPersistenceFailure('clear');
    }
    activeConflict = null;
    activeConflictBase = null;
    activeConflictStoreObserved = false;
    delete runtimeStatus.conflict;
    if (!cleared) runtimeStatus.lastError = 'conflict:persistence-clear';
    else if (runtimeStatus.lastError.startsWith('conflict:')) runtimeStatus.lastError = '';
    publishStatus();
  };

  const publishConflictStatus = (args: {
    room: string;
    row: CloudSyncStateRow;
    keys: string[];
    base: CloudSyncPayload;
    local: CloudSyncPayload;
  }): CloudSyncConflictRecord => {
    const { room, row, keys, base, local } = args;
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
      fields: buildCloudSyncConflictFields({
        conflictKeys: normalizedKeys,
        base,
        local,
        remote: row.payload || {},
      }),
      projectionAvailable: true,
    };
    activeConflict = conflict;
    activeConflictBase = clonePayload(base);
    const persisted = persistConflict(conflict);
    if (persisted) activeConflictStoreObserved = true;
    runtimeStatus.conflict = toConflictStatus(conflict);
    runtimeStatus.lastError = persisted
      ? `conflict:${normalizedKeys.join(',') || 'revision'}`
      : 'conflict:persistence-write';
    publishStatus();
    return conflict;
  };

  const publishConflictState = (
    conflict: CloudSyncConflictRecord,
    state: CloudSyncConflictRecord['state']
  ): void => {
    conflict.state = state;
    activeConflict = conflict;
    const persisted = persistConflict(conflict);
    if (persisted) activeConflictStoreObserved = true;
    runtimeStatus.conflict = toConflictStatus(conflict);
    runtimeStatus.lastError = persisted
      ? `conflict:${conflict.keys.join(',') || 'revision'}`
      : 'conflict:persistence-write';
    publishStatus();
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
        activeConflict = {
          conflictId: `${clientId}:corrupt:${Date.now()}`,
          generation: 1,
          room,
          keys: [corruptConflictKey],
          remoteRevision: 0,
          detectedAt: Date.now(),
          state: 'awaiting-resolution',
          fields: {},
          projectionAvailable: false,
        };
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
    getRow: async (gatewayUrlIn: string, anonKeyIn: string, roomIn: string) => {
      if (reconcileStoredConflict(roomIn)) {
        return {
          ok: false,
          failure: { kind: 'server', status: 409, code: 'conflict_unresolved' },
        };
      }
      const credential = await resolveRoomCredential(roomIn);
      if (!credential) {
        return { ok: false, failure: lastCredentialFailure || missingCredentialFailure() };
      }
      const result = await getGatewayRow({
        fetchFn,
        gatewayUrl: gatewayUrlIn,
        anonKey: anonKeyIn,
        storeId: cfg.storeId,
        room: roomIn,
        roomToken: credential.token,
      });
      if (result.ok === false) {
        publishCredentialStatus(credential, result.failure);
        return result;
      }
      publishCredentialStatus(credential);
      const row = result.row;
      cacheRow(row);
      return result;
    },
    upsertRow: async (
      gatewayUrlIn: string,
      anonKeyIn: string,
      roomIn: string,
      payloadIn: CloudSyncPayload
    ) => {
      if (reconcileStoredConflict(roomIn)) {
        const conflict = activeConflict as CloudSyncConflictRecord;
        const remoteRow = rowCache.get(roomIn) || {
          room: roomIn,
          payload: projectCloudSyncConflictRemotePayload(conflict),
          revision: conflict.remoteRevision,
          updated_at: '',
          updated_by: '',
        };
        return {
          ok: false,
          conflict: true,
          row: remoteRow,
          conflictKeys: conflict.keys.slice(),
        };
      }
      const credential = await resolveRoomCredential(roomIn);
      if (!credential) {
        return { ok: false, failure: lastCredentialFailure || missingCredentialFailure() };
      }
      const baseRow = rowCache.get(roomIn) || null;
      const first = await writeGatewayRow({
        fetchFn,
        gatewayUrl: gatewayUrlIn,
        anonKey: anonKeyIn,
        storeId: cfg.storeId,
        room: roomIn,
        roomToken: credential.token,
        payload: payloadIn,
        expectedRevision: baseRow?.revision || 0,
        clientId,
      });
      if (first.ok === true) {
        publishCredentialStatus(credential);
        cacheRow(first.row);
        clearConflictStatus(roomIn);
        return first;
      }
      if (first.conflict !== true) {
        publishCredentialStatus(credential, first.failure);
        return first;
      }

      const merged = mergeCloudSyncPayloads({
        base: baseRow?.payload || {},
        local: payloadIn,
        remote: first.row.payload,
      });
      if (merged.ok === false) {
        cacheRow(first.row);
        if (isMainCollectionsRoom(roomIn)) {
          publishConflictStatus({
            room: roomIn,
            row: first.row,
            keys: merged.conflictKeys,
            base: baseRow?.payload || {},
            local: payloadIn,
          });
        }
        return { ...first, conflictKeys: merged.conflictKeys };
      }

      const retry = await writeGatewayRow({
        fetchFn,
        gatewayUrl: gatewayUrlIn,
        anonKey: anonKeyIn,
        storeId: cfg.storeId,
        room: roomIn,
        roomToken: credential.token,
        payload: merged.payload,
        expectedRevision: first.row.revision,
        clientId,
      });
      if (retry.ok === true) {
        cacheRow(retry.row);
        publishCredentialStatus(credential);
        clearConflictStatus(roomIn);
      } else if (retry.conflict === true) {
        const conflictKeys = retry.conflictKeys?.length ? retry.conflictKeys : ['revision'];
        cacheRow(retry.row);
        if (isMainCollectionsRoom(roomIn)) {
          publishConflictStatus({
            room: roomIn,
            row: retry.row,
            keys: conflictKeys,
            base: first.row.payload || {},
            local: merged.payload,
          });
        }
        return { ...retry, conflictKeys };
      } else {
        publishCredentialStatus(credential, retry.failure);
      }
      return retry;
    },
    resolveConflict: async (roomIn, resolution, adoptRemote, readLocalSnapshot, expectedConflictId) => {
      try {
        return await conflictResolutionLock.runExclusive(
          `${conflictResolutionLockName}:${roomIn}`,
          async () => {
            reconcileStoredConflict(roomIn, true);
            const conflict = activeConflict;
            if (!conflict || conflict.room !== roomIn || conflict.state === 'resolved') {
              return { ok: false, resolution, reason: 'missing-conflict' };
            }
            const requestedConflictId = String(expectedConflictId || '').trim();
            if (requestedConflictId && conflict.conflictId !== requestedConflictId) {
              return { ok: false, resolution, reason: 'missing-conflict' };
            }
            if (conflict.state === 'resolving') {
              return { ok: false, resolution, reason: 'busy' };
            }
            if (resolution === 'keep-local' && isCorruptStoredConflict(conflict)) {
              return {
                ok: false,
                resolution,
                reason: 'read',
                failure: { kind: 'server', status: 409, code: 'conflict_record_corrupt' },
                conflict: toConflictStatus(conflict),
              };
            }

            const readSnapshot = (): CloudSyncConflictLocalSnapshot => {
              const snapshot = readLocalSnapshot();
              if (
                !snapshot ||
                !snapshot.payload ||
                typeof snapshot.payload !== 'object' ||
                Array.isArray(snapshot.payload) ||
                !Number.isInteger(snapshot.revision) ||
                snapshot.revision < 0
              ) {
                throw new Error('Cloud Sync conflict resolution requires a valid local snapshot');
              }
              return {
                payload: clonePayload(snapshot.payload),
                revision: snapshot.revision,
              };
            };
            const callbackFailure = (stage: 'read-local' | 'adopt-remote', error: unknown): void => {
              _cloudSyncReportNonFatal(App, `conflict.resolve.${stage}`, error, { throttleMs: 8000 });
            };
            const adoptionFailure = (reason: 'commit' | 'revision-mismatch'): CloudSyncGatewayFailure =>
              reason === 'revision-mismatch'
                ? { kind: 'server', status: 409, code: 'local_revision_changed_during_resolution' }
                : { kind: 'server', status: 500, code: 'local_conflict_adoption_failed' };

            let initialLocal: CloudSyncConflictLocalSnapshot;
            try {
              initialLocal = readSnapshot();
            } catch (error) {
              callbackFailure('read-local', error);
              return {
                ok: false,
                resolution,
                reason: 'read',
                failure: { kind: 'server', status: 500, code: 'local_conflict_snapshot_failed' },
                conflict: toConflictStatus(conflict),
              };
            }

            publishConflictState(conflict, 'resolving');
            const credential = await resolveRoomCredential(roomIn);
            if (!credential) {
              publishConflictState(conflict, 'awaiting-resolution');
              return {
                ok: false,
                resolution,
                reason: resolution === 'keep-local' ? 'write' : 'read',
                failure: lastCredentialFailure || missingCredentialFailure(),
                conflict: toConflictStatus(conflict),
              };
            }

            const latest = await getGatewayRow({
              fetchFn,
              gatewayUrl,
              anonKey: cfg.anonKey,
              storeId: cfg.storeId,
              room: roomIn,
              roomToken: credential.token,
            });
            if (latest.ok === false) {
              publishCredentialStatus(credential, latest.failure);
              publishConflictState(conflict, 'awaiting-resolution');
              return {
                ok: false,
                resolution,
                reason: 'read',
                failure: latest.failure,
                conflict: toConflictStatus(conflict),
              };
            }
            if (!latest.row) {
              const failure: CloudSyncGatewayFailure = {
                kind: 'server',
                status: 404,
                code: 'conflict_row_missing',
              };
              publishConflictState(conflict, 'awaiting-resolution');
              return {
                ok: false,
                resolution,
                reason: 'read',
                failure,
                conflict: toConflictStatus(conflict),
              };
            }
            cacheRow(latest.row);

            const adoptAtRevision = async (
              row: CloudSyncStateRow,
              expectedLocalRevision: number
            ): Promise<CloudSyncRemoteAdoptionResult> => {
              try {
                return await adoptRemote(row, expectedLocalRevision);
              } catch (error) {
                callbackFailure('adopt-remote', error);
                return { ok: false, uiRefreshWarning: false, reason: 'commit' };
              }
            };
            const completeResolution = (
              row: CloudSyncStateRow,
              adoption: Extract<CloudSyncRemoteAdoptionResult, { ok: true }>
            ): CloudSyncConflictResolutionResult => {
              publishCredentialStatus(credential);
              publishConflictState(conflict, 'resolved');
              clearConflictStatus(roomIn, conflict.conflictId);
              return {
                ok: true,
                resolution,
                row,
                ...(adoption.uiRefreshWarning ? { uiRefreshWarning: true } : {}),
              };
            };

            if (resolution === 'use-remote') {
              let adoption = await adoptAtRevision(latest.row, initialLocal.revision);
              if (adoption.ok === false) {
                if (adoption.reason === 'revision-mismatch') {
                  try {
                    let mismatchBase = initialLocal.payload;
                    let currentLocal = readSnapshot();
                    if (!payloadDifferenceKeys(latest.row.payload || {}, currentLocal.payload).length) {
                      mismatchBase = latest.row.payload || {};
                      adoption = await adoptAtRevision(latest.row, currentLocal.revision);
                      if (adoption.ok === true) return completeResolution(latest.row, adoption);
                      if (adoption.reason === 'revision-mismatch') currentLocal = readSnapshot();
                    }
                    if (adoption.reason === 'revision-mismatch') {
                      const keys = payloadDifferenceKeys(mismatchBase, currentLocal.payload);
                      const nextConflict = publishConflictStatus({
                        room: roomIn,
                        row: latest.row,
                        keys: keys.length ? keys : ['revision'],
                        base: mismatchBase,
                        local: currentLocal.payload,
                      });
                      return {
                        ok: false,
                        resolution,
                        reason: 'adoption',
                        failure: adoptionFailure(adoption.reason),
                        conflict: toConflictStatus(nextConflict),
                      };
                    }
                  } catch (error) {
                    callbackFailure('read-local', error);
                  }
                }
                const refreshedConflict = publishConflictStatus({
                  room: roomIn,
                  row: latest.row,
                  keys: conflict.keys,
                  base: latest.row.payload || {},
                  local: initialLocal.payload,
                });
                return {
                  ok: false,
                  resolution,
                  reason: 'adoption',
                  failure: adoptionFailure(adoption.ok === false ? adoption.reason : 'commit'),
                  conflict: toConflictStatus(refreshedConflict),
                };
              }
              return completeResolution(latest.row, adoption);
            }

            let currentLocal: CloudSyncConflictLocalSnapshot;
            try {
              currentLocal = readSnapshot();
            } catch (error) {
              callbackFailure('read-local', error);
              publishConflictState(conflict, 'awaiting-resolution');
              return {
                ok: false,
                resolution,
                reason: 'read',
                failure: { kind: 'server', status: 500, code: 'local_conflict_snapshot_failed' },
                conflict: toConflictStatus(conflict),
              };
            }
            const rebased = rebaseCloudSyncKeepLocal({
              conflict,
              currentLocal: currentLocal.payload,
              latestRemote: latest.row.payload || {},
              transientBase: activeConflictBase,
            });
            if (rebased.ok === false) {
              const nextConflict = publishConflictStatus({
                room: roomIn,
                row: latest.row,
                keys: [...new Set([...conflict.keys, ...rebased.conflictKeys])],
                base: latest.row.payload || {},
                local: currentLocal.payload,
              });
              return {
                ok: false,
                resolution,
                reason: 'write',
                conflict: toConflictStatus(nextConflict),
              };
            }
            const resolvedPayload = rebased.payload;
            const written = await writeGatewayRow({
              fetchFn,
              gatewayUrl,
              anonKey: cfg.anonKey,
              storeId: cfg.storeId,
              room: roomIn,
              roomToken: credential.token,
              payload: resolvedPayload,
              expectedRevision: latest.row.revision,
              clientId,
            });
            if (written.ok === false) {
              if (written.conflict === true) {
                cacheRow(written.row);
                const nextConflict = publishConflictStatus({
                  room: roomIn,
                  row: written.row,
                  keys: conflict.keys.length ? conflict.keys : ['revision'],
                  base: latest.row.payload || {},
                  local: resolvedPayload,
                });
                return {
                  ok: false,
                  resolution,
                  reason: 'write',
                  conflict: toConflictStatus(nextConflict),
                };
              }
              publishCredentialStatus(credential, written.failure);
              publishConflictState(conflict, 'awaiting-resolution');
              return {
                ok: false,
                resolution,
                reason: 'write',
                failure: written.failure,
                conflict: toConflictStatus(conflict),
              };
            }

            cacheRow(written.row);
            let adoption = await adoptAtRevision(written.row, currentLocal.revision);
            if (adoption.ok === false) {
              if (adoption.reason === 'revision-mismatch') {
                try {
                  let mismatchBase = currentLocal.payload;
                  let latestLocal = readSnapshot();
                  if (!payloadDifferenceKeys(written.row.payload || {}, latestLocal.payload).length) {
                    mismatchBase = written.row.payload || {};
                    adoption = await adoptAtRevision(written.row, latestLocal.revision);
                    if (adoption.ok === true) return completeResolution(written.row, adoption);
                    if (adoption.reason === 'revision-mismatch') latestLocal = readSnapshot();
                  }
                  if (adoption.reason === 'revision-mismatch') {
                    const keys = payloadDifferenceKeys(mismatchBase, latestLocal.payload);
                    const nextConflict = publishConflictStatus({
                      room: roomIn,
                      row: written.row,
                      keys: keys.length ? keys : ['revision'],
                      base: mismatchBase,
                      local: latestLocal.payload,
                    });
                    return {
                      ok: false,
                      resolution,
                      reason: 'adoption',
                      failure: adoptionFailure(adoption.reason),
                      conflict: toConflictStatus(nextConflict),
                    };
                  }
                } catch (error) {
                  callbackFailure('read-local', error);
                }
              }
              const refreshedConflict = publishConflictStatus({
                room: roomIn,
                row: written.row,
                keys: conflict.keys,
                base: written.row.payload || {},
                local: currentLocal.payload,
              });
              return {
                ok: false,
                resolution,
                reason: 'adoption',
                failure: adoptionFailure(adoption.ok === false ? adoption.reason : 'commit'),
                conflict: toConflictStatus(refreshedConflict),
              };
            }
            return completeResolution(written.row, adoption);
          }
        );
      } catch (error) {
        _cloudSyncReportNonFatal(App, 'conflict.resolve.lock', error, { throttleMs: 8000 });
        return { ok: false, resolution, reason: 'busy' };
      }
    },
    issuePrivateRoom: async () => {
      const result = await createPrivateRoomCredential({
        fetchFn,
        gatewayUrl,
        anonKey: cfg.anonKey,
        storeId: cfg.storeId,
      });
      if (result.ok === false) {
        publishCredentialStatus(null, result.failure);
        return result;
      }
      publishCredentialStatus(result.credential);
      return result;
    },
  };
}

export function resolveCloudSyncOwnerStorage(App: AppContainer): StorageLike | null {
  const storage0 = getStorageServiceMaybe(App);
  return isCloudSyncStorageLike(storage0) ? storage0 : null;
}
