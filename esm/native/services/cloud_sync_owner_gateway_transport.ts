import type {
  CloudSyncFetchLike,
  CloudSyncGatewayReadResult,
  CloudSyncPayload,
  CloudSyncUpsertResult,
} from '../../../types';

import type { SupabaseCfg } from './cloud_sync_config.js';
import { getGatewayRow, writeGatewayRow } from './cloud_sync_gateway.js';
import { mergeCloudSyncPayloads, projectCloudSyncConflictRemotePayload } from './cloud_sync_payload_merge.js';
import type { CloudSyncGetRowFn, CloudSyncUpsertRowFn } from './cloud_sync_owner_gateway_contracts.js';
import type { CloudSyncOwnerCredentialSession } from './cloud_sync_owner_gateway_credential_session.js';
import type { CloudSyncOwnerConflictJournal } from './cloud_sync_owner_gateway_conflict_journal.js';
import type { CloudSyncOwnerRowCache } from './cloud_sync_owner_gateway_row_cache.js';

export type CloudSyncOwnerGatewayTransport = {
  getRow: CloudSyncGetRowFn;
  upsertRow: CloudSyncUpsertRowFn;
  readRowWithCredential: (args: {
    room: string;
    credentialToken: string;
  }) => Promise<CloudSyncGatewayReadResult>;
  writeResolvedRow: (args: {
    room: string;
    credentialToken: string;
    payload: CloudSyncPayload;
    expectedRevision: number;
  }) => Promise<CloudSyncUpsertResult>;
};

export function createCloudSyncOwnerGatewayTransport(args: {
  fetchFn: CloudSyncFetchLike;
  cfg: SupabaseCfg;
  gatewayUrl: string;
  clientId: string;
  credentials: CloudSyncOwnerCredentialSession;
  rowCache: CloudSyncOwnerRowCache;
  conflicts: CloudSyncOwnerConflictJournal;
}): CloudSyncOwnerGatewayTransport {
  const { fetchFn, cfg, gatewayUrl, clientId, credentials, rowCache, conflicts } = args;

  const readRowWithCredential = async (readArgs: {
    room: string;
    credentialToken: string;
  }): Promise<CloudSyncGatewayReadResult> => {
    return getGatewayRow({
      fetchFn,
      gatewayUrl,
      anonKey: cfg.anonKey,
      storeId: cfg.storeId,
      room: readArgs.room,
      roomToken: readArgs.credentialToken,
    });
  };

  const writeResolvedRow = async (writeArgs: {
    room: string;
    credentialToken: string;
    payload: CloudSyncPayload;
    expectedRevision: number;
  }): Promise<CloudSyncUpsertResult> => {
    return writeGatewayRow({
      fetchFn,
      gatewayUrl,
      anonKey: cfg.anonKey,
      storeId: cfg.storeId,
      room: writeArgs.room,
      roomToken: writeArgs.credentialToken,
      payload: writeArgs.payload,
      expectedRevision: writeArgs.expectedRevision,
      clientId,
    });
  };

  const getRow: CloudSyncGetRowFn = async (gatewayUrlIn, anonKeyIn, roomIn) => {
    if (conflicts.reconcile(roomIn)) {
      return {
        ok: false,
        failure: { kind: 'server', status: 409, code: 'conflict_unresolved' },
      };
    }
    const credential = await credentials.resolveRoomCredential(roomIn);
    if (!credential) {
      return { ok: false, failure: credentials.readLastFailure() || credentials.missingCredentialFailure() };
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
      credentials.publishFailure(credential, result.failure);
      return result;
    }
    credentials.publishSuccess(credential);
    rowCache.write(result.row);
    return result;
  };

  const upsertRow: CloudSyncUpsertRowFn = async (gatewayUrlIn, anonKeyIn, roomIn, payloadIn) => {
    if (conflicts.reconcile(roomIn)) {
      const conflict = conflicts.readActive();
      if (!conflict) {
        return {
          ok: false,
          failure: { kind: 'server', status: 409, code: 'conflict_unresolved' },
        };
      }
      const remoteRow = rowCache.read(roomIn) || {
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

    const credential = await credentials.resolveRoomCredential(roomIn);
    if (!credential) {
      return { ok: false, failure: credentials.readLastFailure() || credentials.missingCredentialFailure() };
    }
    const baseRow = rowCache.read(roomIn);
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
      credentials.publishSuccess(credential);
      rowCache.write(first.row);
      conflicts.finalize(roomIn);
      return first;
    }
    if (first.conflict !== true) {
      credentials.publishFailure(credential, first.failure);
      return first;
    }

    const merged = mergeCloudSyncPayloads({
      base: baseRow?.payload || {},
      local: payloadIn,
      remote: first.row.payload,
    });
    if (merged.ok === false) {
      rowCache.write(first.row);
      if (conflicts.isMainCollectionsRoom(roomIn)) {
        conflicts.publishConflict({
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
      rowCache.write(retry.row);
      credentials.publishSuccess(credential);
      conflicts.finalize(roomIn);
    } else if (retry.conflict === true) {
      const conflictKeys = retry.conflictKeys?.length ? retry.conflictKeys : ['revision'];
      rowCache.write(retry.row);
      if (conflicts.isMainCollectionsRoom(roomIn)) {
        conflicts.publishConflict({
          room: roomIn,
          row: retry.row,
          keys: conflictKeys,
          base: first.row.payload || {},
          local: merged.payload,
        });
      }
      return { ...retry, conflictKeys };
    } else {
      credentials.publishFailure(credential, retry.failure);
    }
    return retry;
  };

  return { getRow, upsertRow, readRowWithCredential, writeResolvedRow };
}
