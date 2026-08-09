import type {
  AppContainer,
  CloudCollectionsMutationLockLike,
  CloudSyncFetchLike,
  CloudSyncRuntimeStatus,
} from '../../../types';

import type { SupabaseCfg } from './cloud_sync_config.js';
import type { CloudSyncOwnerRooms } from './cloud_sync_owner_context_rooms.js';
import type { StorageLike } from './cloud_sync_owner_context_runtime_shared.js';
import type { CloudSyncOwnerGatewayIo } from './cloud_sync_owner_gateway_contracts.js';
import { createCloudSyncOwnerCredentialSession } from './cloud_sync_owner_gateway_credential_session.js';
import { createCloudSyncOwnerConflictJournal } from './cloud_sync_owner_gateway_conflict_journal.js';
import { createCloudSyncOwnerConflictResolutionMachine } from './cloud_sync_owner_gateway_conflict_resolution.js';
import { createCloudSyncOwnerRowCache } from './cloud_sync_owner_gateway_row_cache.js';
import { createCloudSyncOwnerGatewayTransport } from './cloud_sync_owner_gateway_transport.js';

export function createCloudSyncOwnerGatewayRuntime(args: {
  App: AppContainer;
  cfg: SupabaseCfg;
  gatewayUrl: string;
  rooms: CloudSyncOwnerRooms;
  clientId: string;
  runtimeStatus: CloudSyncRuntimeStatus;
  publishStatus: () => void;
  fetchFn: CloudSyncFetchLike;
  conflictResolutionLock: CloudCollectionsMutationLockLike;
  storage?: StorageLike;
}): CloudSyncOwnerGatewayIo {
  const { App, cfg, gatewayUrl, rooms, clientId, runtimeStatus, publishStatus, fetchFn } = args;
  const rowCache = createCloudSyncOwnerRowCache();
  const credentials = createCloudSyncOwnerCredentialSession({
    App,
    cfg,
    gatewayUrl,
    rooms,
    runtimeStatus,
    publishStatus,
    fetchFn,
  });
  const conflicts = createCloudSyncOwnerConflictJournal({
    App,
    cfg,
    rooms,
    clientId,
    runtimeStatus,
    publishStatus,
    ...(args.storage ? { storage: args.storage } : {}),
  });
  const transport = createCloudSyncOwnerGatewayTransport({
    fetchFn,
    cfg,
    gatewayUrl,
    clientId,
    credentials,
    rowCache,
    conflicts,
  });
  const resolveConflict = createCloudSyncOwnerConflictResolutionMachine({
    App,
    cfg,
    credentials,
    conflicts,
    rowCache,
    transport,
    conflictResolutionLock: args.conflictResolutionLock,
  });

  return {
    getRow: transport.getRow,
    upsertRow: transport.upsertRow,
    issuePrivateRoom: credentials.issuePrivateRoom,
    resolveConflict,
  };
}
