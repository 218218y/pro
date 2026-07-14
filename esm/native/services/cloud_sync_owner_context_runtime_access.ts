import type {
  AppContainer,
  CloudSyncGatewayFailure,
  CloudSyncGatewayReadResult,
  CloudSyncPayload,
  CloudSyncRoomCredential,
  CloudSyncRuntimeStatus,
  CloudSyncStateRow,
  CloudSyncUpsertResult,
  IntervalHandleLike,
  TimeoutHandleLike,
} from '../../../types';

import { getBrowserFetchMaybe, getBrowserTimers } from '../runtime/api.js';
import { getStorageServiceMaybe } from '../runtime/storage_access.js';
import type { SupabaseCfg } from './cloud_sync_config.js';
import {
  createPrivateRoomCredential,
  getGatewayRow,
  issuePublicRoomCredential,
  renewPrivateRoomCredential,
  writeGatewayRow,
} from './cloud_sync_gateway.js';
import type { CloudSyncOwnerRooms } from './cloud_sync_owner_context_rooms.js';
import { mergeCloudSyncPayloads } from './cloud_sync_payload_merge.js';
import {
  buildCloudSyncCredentialStatus,
  classifyCloudSyncCredential,
} from './cloud_sync_room_credentials.js';
import { isCloudSyncStorageLike, type StorageLike } from './cloud_sync_owner_context_runtime_shared.js';

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

export type CloudSyncIssuePrivateRoomFn = () => Promise<CloudSyncRoomCredential | null>;

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
}): {
  getRow: CloudSyncGetRowFn;
  upsertRow: CloudSyncUpsertRowFn;
  issuePrivateRoom: CloudSyncIssuePrivateRoomFn;
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

  const clearConflictStatus = (room: string): void => {
    if (runtimeStatus.conflict?.room !== room) return;
    delete runtimeStatus.conflict;
    if (runtimeStatus.lastError.startsWith('conflict:')) runtimeStatus.lastError = '';
    publishStatus();
  };

  const publishConflictStatus = (room: string, row: CloudSyncStateRow, keys: string[]): void => {
    const normalizedKeys = [...new Set(keys.map(key => String(key).trim()).filter(Boolean))];
    runtimeStatus.conflict = {
      room,
      keys: normalizedKeys,
      remoteRevision: row.revision,
      detectedAt: Date.now(),
    };
    runtimeStatus.lastError = `conflict:${normalizedKeys.join(',') || 'revision'}`;
    publishStatus();
  };

  return {
    getRow: async (gatewayUrlIn: string, anonKeyIn: string, roomIn: string) => {
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
        publishConflictStatus(roomIn, first.row, merged.conflictKeys);
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
        publishConflictStatus(roomIn, retry.row, conflictKeys);
        return { ...retry, conflictKeys };
      } else {
        publishCredentialStatus(credential, retry.failure);
      }
      return retry;
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
        return null;
      }
      publishCredentialStatus(result.credential);
      return result.credential;
    },
  };
}

export function resolveCloudSyncOwnerStorage(App: AppContainer): StorageLike | null {
  const storage0 = getStorageServiceMaybe(App);
  return isCloudSyncStorageLike(storage0) ? storage0 : null;
}
