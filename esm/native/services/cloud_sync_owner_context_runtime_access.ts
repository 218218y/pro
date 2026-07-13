import type {
  AppContainer,
  CloudSyncPayload,
  CloudSyncRoomCredential,
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
  writeGatewayRow,
} from './cloud_sync_gateway.js';
import type { CloudSyncOwnerRooms } from './cloud_sync_owner_context_rooms.js';
import { mergeCloudSyncPayloads } from './cloud_sync_payload_merge.js';
import { isCloudSyncStorageLike, type StorageLike } from './cloud_sync_owner_context_runtime_shared.js';

export type CloudSyncGetRowFn = (
  gatewayUrlIn: string,
  anonKeyIn: string,
  roomIn: string
) => Promise<CloudSyncStateRow | null>;

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
}): {
  getRow: CloudSyncGetRowFn;
  upsertRow: CloudSyncUpsertRowFn;
  issuePrivateRoom: CloudSyncIssuePrivateRoomFn;
} | null {
  const { App, cfg, gatewayUrl, rooms, clientId } = args;
  const fetchFn = getBrowserFetchMaybe(App);
  if (!fetchFn) return null;
  const rowCache = new Map<string, CloudSyncStateRow>();
  let publicCredential: CloudSyncRoomCredential | null = null;
  let publicCredentialPromise: Promise<CloudSyncRoomCredential | null> | null = null;

  const isCredentialUsable = (credential: CloudSyncRoomCredential | null): boolean => {
    const expiresAt = credential ? Date.parse(credential.expiresAt) : Number.NaN;
    return !!credential?.token && Number.isFinite(expiresAt) && expiresAt > Date.now() + 60_000;
  };

  const resolveRoomToken = async (room: string): Promise<string> => {
    const baseRoom = rooms.currentRoom();
    if (!baseRoom || (room !== baseRoom && !room.startsWith(`${baseRoom}::`))) return '';
    if (baseRoom !== cfg.publicRoom) return rooms.currentRoomToken();
    if (isCredentialUsable(publicCredential)) return publicCredential?.token || '';
    if (!publicCredentialPromise) {
      publicCredentialPromise = issuePublicRoomCredential({
        fetchFn,
        gatewayUrl,
        anonKey: cfg.anonKey,
        storeId: cfg.storeId,
      });
    }
    const pending = publicCredentialPromise;
    const credential = await pending;
    if (publicCredentialPromise === pending) publicCredentialPromise = null;
    publicCredential = isCredentialUsable(credential) ? credential : null;
    return publicCredential?.token || '';
  };

  const cacheRow = (row: CloudSyncStateRow | null | undefined): void => {
    if (row) rowCache.set(row.room, row);
  };

  return {
    getRow: async (gatewayUrlIn: string, anonKeyIn: string, roomIn: string) => {
      const roomToken = await resolveRoomToken(roomIn);
      if (!roomToken) return null;
      const row = await getGatewayRow({
        fetchFn,
        gatewayUrl: gatewayUrlIn,
        anonKey: anonKeyIn,
        storeId: cfg.storeId,
        room: roomIn,
        roomToken,
      });
      cacheRow(row);
      return row;
    },
    upsertRow: async (
      gatewayUrlIn: string,
      anonKeyIn: string,
      roomIn: string,
      payloadIn: CloudSyncPayload
    ) => {
      const roomToken = await resolveRoomToken(roomIn);
      if (!roomToken) return { ok: false };
      const baseRow = rowCache.get(roomIn) || null;
      const first = await writeGatewayRow({
        fetchFn,
        gatewayUrl: gatewayUrlIn,
        anonKey: anonKeyIn,
        storeId: cfg.storeId,
        room: roomIn,
        roomToken,
        payload: payloadIn,
        expectedRevision: baseRow?.revision || 0,
        clientId,
      });
      if (first.ok) {
        cacheRow(first.row);
        return first;
      }
      if (!first.conflict || !first.row) return first;

      const merged = mergeCloudSyncPayloads({
        base: baseRow?.payload || {},
        local: payloadIn,
        remote: first.row.payload,
      });
      if (merged.ok === false) {
        return { ...first, conflictKeys: merged.conflictKeys };
      }

      const retry = await writeGatewayRow({
        fetchFn,
        gatewayUrl: gatewayUrlIn,
        anonKey: anonKeyIn,
        storeId: cfg.storeId,
        room: roomIn,
        roomToken,
        payload: merged.payload,
        expectedRevision: first.row.revision,
        clientId,
      });
      if (retry.ok) cacheRow(retry.row);
      return retry;
    },
    issuePrivateRoom: () =>
      createPrivateRoomCredential({
        fetchFn,
        gatewayUrl,
        anonKey: cfg.anonKey,
        storeId: cfg.storeId,
      }),
  };
}

export function resolveCloudSyncOwnerStorage(App: AppContainer): StorageLike | null {
  const storage0 = getStorageServiceMaybe(App);
  return isCloudSyncStorageLike(storage0) ? storage0 : null;
}
