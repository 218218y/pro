import type { AppContainer, CloudSyncPayload, IntervalHandleLike, TimeoutHandleLike } from '../../../types';

import { getBrowserFetchMaybe, getBrowserTimers } from '../runtime/api.js';
import { getStorageServiceMaybe } from '../runtime/storage_access.js';
import { getRow as cloudSyncGetRow, upsertRow as cloudSyncUpsertRow } from './cloud_sync_rest.js';
import { isCloudSyncStorageLike, type StorageLike } from './cloud_sync_owner_context_runtime_shared.js';

export type CloudSyncGetRowFn = (
  restUrlIn: string,
  anonKeyIn: string,
  roomIn: string
) => ReturnType<typeof cloudSyncGetRow>;

export type CloudSyncUpsertRowFn = (
  restUrlIn: string,
  anonKeyIn: string,
  roomIn: string,
  payloadIn: CloudSyncPayload,
  optsIn?: { returnRepresentation?: boolean }
) => ReturnType<typeof cloudSyncUpsertRow>;

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

export function createCloudSyncOwnerRestIo(App: AppContainer): {
  getRow: CloudSyncGetRowFn;
  upsertRow: CloudSyncUpsertRowFn;
} | null {
  const fetchFn = getBrowserFetchMaybe(App);
  if (!fetchFn) return null;
  return {
    getRow: (restUrlIn: string, anonKeyIn: string, roomIn: string) =>
      cloudSyncGetRow(fetchFn, restUrlIn, anonKeyIn, roomIn),
    upsertRow: (
      restUrlIn: string,
      anonKeyIn: string,
      roomIn: string,
      payloadIn: CloudSyncPayload,
      optsIn?: { returnRepresentation?: boolean }
    ) => cloudSyncUpsertRow(fetchFn, restUrlIn, anonKeyIn, roomIn, payloadIn, optsIn),
  };
}

export function resolveCloudSyncOwnerStorage(App: AppContainer): StorageLike | null {
  const storage0 = getStorageServiceMaybe(App);
  return isCloudSyncStorageLike(storage0) ? storage0 : null;
}
