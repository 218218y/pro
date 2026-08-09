import type {
  AppContainer,
  CloudCollectionsMutationLockLike,
  CloudSyncRuntimeStatus,
  IntervalHandleLike,
  TimeoutHandleLike,
} from '../../../types';

import { getBrowserFetchMaybe, getBrowserTimers, getNavigatorMaybe } from '../runtime/api.js';
import { getStorageServiceMaybe } from '../runtime/storage_access.js';
import { createCloudCollectionsWebLock } from './cloud_collections_mutation_lock.js';
import {
  createInProcessCloudCollectionsMutationLock,
  createUnavailableCloudCollectionsMutationLock,
} from './cloud_sync_collections_repository.js';
import type { SupabaseCfg } from './cloud_sync_config.js';
import type { CloudSyncOwnerRooms } from './cloud_sync_owner_context_rooms.js';
import { isCloudSyncStorageLike, type StorageLike } from './cloud_sync_owner_context_runtime_shared.js';
import type { CloudSyncOwnerGatewayIo } from './cloud_sync_owner_gateway_contracts.js';
import { createCloudSyncOwnerGatewayRuntime } from './cloud_sync_owner_gateway_runtime.js';

const processConflictResolutionLock = createInProcessCloudCollectionsMutationLock();

export type {
  CloudSyncConflictLocalSnapshot,
  CloudSyncGetRowFn,
  CloudSyncIssuePrivateRoomFn,
  CloudSyncResolveConflictFn,
  CloudSyncUpsertRowFn,
} from './cloud_sync_owner_gateway_contracts.js';

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
}): CloudSyncOwnerGatewayIo | null {
  const fetchFn = getBrowserFetchMaybe(args.App);
  if (!fetchFn) return null;
  const navigatorValue = getNavigatorMaybe(args.App);
  const conflictResolutionLock: CloudCollectionsMutationLockLike = navigatorValue
    ? 'locks' in navigatorValue
      ? createCloudCollectionsWebLock(navigatorValue.locks)
      : createUnavailableCloudCollectionsMutationLock()
    : processConflictResolutionLock;
  return createCloudSyncOwnerGatewayRuntime({
    ...args,
    fetchFn,
    conflictResolutionLock,
  });
}

export function resolveCloudSyncOwnerStorage(App: AppContainer): StorageLike | null {
  const storage0 = getStorageServiceMaybe(App);
  return isCloudSyncStorageLike(storage0) ? storage0 : null;
}
