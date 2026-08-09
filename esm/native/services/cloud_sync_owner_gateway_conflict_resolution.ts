import type {
  AppContainer,
  CloudCollectionsMutationLockLike,
  CloudSyncConflictResolutionResult,
  CloudSyncGatewayFailure,
  CloudSyncRemoteAdoptionResult,
  CloudSyncStateRow,
} from '../../../types';

import type { SupabaseCfg } from './cloud_sync_config.js';
import type {
  CloudSyncConflictLocalSnapshot,
  CloudSyncResolveConflictFn,
} from './cloud_sync_owner_gateway_contracts.js';
import type { CloudSyncOwnerCredentialSession } from './cloud_sync_owner_gateway_credential_session.js';
import type { CloudSyncOwnerConflictJournal } from './cloud_sync_owner_gateway_conflict_journal.js';
import { cloneCloudSyncGatewayPayload } from './cloud_sync_owner_gateway_payload.js';
import { createCloudSyncRemoteAdoptionCoordinator } from './cloud_sync_owner_gateway_remote_adoption.js';
import type { CloudSyncOwnerRowCache } from './cloud_sync_owner_gateway_row_cache.js';
import type { CloudSyncOwnerGatewayTransport } from './cloud_sync_owner_gateway_transport.js';
import { rebaseCloudSyncKeepLocal } from './cloud_sync_payload_merge.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support_feedback.js';

function adoptionFailure(reason: 'commit' | 'revision-mismatch'): CloudSyncGatewayFailure {
  return reason === 'revision-mismatch'
    ? { kind: 'server', status: 409, code: 'local_revision_changed_during_resolution' }
    : { kind: 'server', status: 500, code: 'local_conflict_adoption_failed' };
}

export function createCloudSyncOwnerConflictResolutionMachine(args: {
  App: AppContainer;
  cfg: SupabaseCfg;
  credentials: CloudSyncOwnerCredentialSession;
  conflicts: CloudSyncOwnerConflictJournal;
  rowCache: CloudSyncOwnerRowCache;
  transport: CloudSyncOwnerGatewayTransport;
  conflictResolutionLock: CloudCollectionsMutationLockLike;
}): CloudSyncResolveConflictFn {
  const { App, cfg, credentials, conflicts, rowCache, transport, conflictResolutionLock } = args;
  const conflictResolutionLockName = `wardrobe-pro:cloud-conflict:${cfg.storeId}`;
  const adoptionCoordinator = createCloudSyncRemoteAdoptionCoordinator({ App, conflicts });

  return async (
    roomIn,
    resolution,
    adoptRemote,
    readLocalSnapshot,
    expectedConflictId
  ): Promise<CloudSyncConflictResolutionResult> => {
    try {
      return await conflictResolutionLock.runExclusive(
        `${conflictResolutionLockName}:${roomIn}`,
        async () => {
          conflicts.reconcile(roomIn, true);
          const conflict = conflicts.readActive();
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
          if (resolution === 'keep-local' && !conflict.canKeepLocal) {
            return {
              ok: false,
              resolution,
              reason: 'read',
              failure: {
                kind: 'server',
                status: 409,
                code:
                  conflict.limitationReason === 'projection-too-large'
                    ? 'conflict_projection_too_large'
                    : 'conflict_record_corrupt',
              },
              conflict: conflicts.toStatus(conflict),
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
              payload: cloneCloudSyncGatewayPayload(snapshot.payload),
              revision: snapshot.revision,
            };
          };

          let initialLocal: CloudSyncConflictLocalSnapshot;
          try {
            initialLocal = readSnapshot();
          } catch (error) {
            adoptionCoordinator.reportCallbackFailure('read-local', error);
            return {
              ok: false,
              resolution,
              reason: 'read',
              failure: { kind: 'server', status: 500, code: 'local_conflict_snapshot_failed' },
              conflict: conflicts.toStatus(conflict),
            };
          }

          conflicts.publishState(conflict, 'resolving');
          const credential = await credentials.resolveRoomCredential(roomIn);
          if (!credential) {
            conflicts.publishState(conflict, 'awaiting-resolution');
            return {
              ok: false,
              resolution,
              reason: resolution === 'keep-local' ? 'write' : 'read',
              failure: credentials.readLastFailure() || credentials.missingCredentialFailure(),
              conflict: conflicts.toStatus(conflict),
            };
          }

          const latest = await transport.readRowWithCredential({
            room: roomIn,
            credentialToken: credential.token,
          });
          if (latest.ok === false) {
            credentials.publishFailure(credential, latest.failure);
            conflicts.publishState(conflict, 'awaiting-resolution');
            return {
              ok: false,
              resolution,
              reason: 'read',
              failure: latest.failure,
              conflict: conflicts.toStatus(conflict),
            };
          }
          if (!latest.row) {
            const failure: CloudSyncGatewayFailure = {
              kind: 'server',
              status: 404,
              code: 'conflict_row_missing',
            };
            conflicts.publishState(conflict, 'awaiting-resolution');
            return {
              ok: false,
              resolution,
              reason: 'read',
              failure,
              conflict: conflicts.toStatus(conflict),
            };
          }
          rowCache.write(latest.row);

          const completeResolution = (
            row: CloudSyncStateRow,
            adoption: Extract<CloudSyncRemoteAdoptionResult, { ok: true }>
          ): CloudSyncConflictResolutionResult => {
            credentials.publishSuccess(credential);
            if (!conflicts.finalize(roomIn, conflict.conflictId)) {
              return {
                ok: false,
                resolution,
                reason: 'write',
                failure: {
                  kind: 'server',
                  status: 500,
                  code: 'conflict_persistence_finalize_failed',
                },
                conflict: conflicts.toStatus(conflict),
              };
            }
            return {
              ok: true,
              resolution,
              row,
              ...(adoption.uiRefreshWarning ? { uiRefreshWarning: true } : {}),
            };
          };

          if (resolution === 'use-remote') {
            const adoption = await adoptionCoordinator.coordinate({
              room: roomIn,
              row: latest.row,
              expectedLocalRevision: initialLocal.revision,
              mismatchBase: initialLocal.payload,
              fallbackLocal: initialLocal.payload,
              fallbackConflictKeys: conflict.keys,
              adoptRemote,
              readLocalSnapshot: readSnapshot,
            });
            if (adoption.ok === false) {
              return {
                ok: false,
                resolution,
                reason: 'adoption',
                failure: adoptionFailure(adoption.reason),
                conflict: conflicts.toStatus(adoption.conflict),
              };
            }
            return completeResolution(latest.row, adoption.adoption);
          }

          let currentLocal: CloudSyncConflictLocalSnapshot;
          try {
            currentLocal = readSnapshot();
          } catch (error) {
            adoptionCoordinator.reportCallbackFailure('read-local', error);
            conflicts.publishState(conflict, 'awaiting-resolution');
            return {
              ok: false,
              resolution,
              reason: 'read',
              failure: { kind: 'server', status: 500, code: 'local_conflict_snapshot_failed' },
              conflict: conflicts.toStatus(conflict),
            };
          }

          const rebased = rebaseCloudSyncKeepLocal({
            conflict,
            currentLocal: currentLocal.payload,
            latestRemote: latest.row.payload || {},
            transientBase: conflicts.readTransientBase(),
          });
          if (rebased.ok === false) {
            const nextConflict = conflicts.publishConflict({
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
              conflict: conflicts.toStatus(nextConflict),
            };
          }

          const resolvedPayload = rebased.payload;
          const written = await transport.writeResolvedRow({
            room: roomIn,
            credentialToken: credential.token,
            payload: resolvedPayload,
            expectedRevision: latest.row.revision,
          });
          if (written.ok === false) {
            if (written.conflict === true) {
              rowCache.write(written.row);
              const nextConflict = conflicts.publishConflict({
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
                conflict: conflicts.toStatus(nextConflict),
              };
            }
            credentials.publishFailure(credential, written.failure);
            conflicts.publishState(conflict, 'awaiting-resolution');
            return {
              ok: false,
              resolution,
              reason: 'write',
              failure: written.failure,
              conflict: conflicts.toStatus(conflict),
            };
          }

          rowCache.write(written.row);
          const adoption = await adoptionCoordinator.coordinate({
            room: roomIn,
            row: written.row,
            expectedLocalRevision: currentLocal.revision,
            mismatchBase: currentLocal.payload,
            fallbackLocal: currentLocal.payload,
            fallbackConflictKeys: conflict.keys,
            adoptRemote,
            readLocalSnapshot: readSnapshot,
          });
          if (adoption.ok === false) {
            return {
              ok: false,
              resolution,
              reason: 'adoption',
              failure: adoptionFailure(adoption.reason),
              conflict: conflicts.toStatus(adoption.conflict),
            };
          }
          return completeResolution(written.row, adoption.adoption);
        }
      );
    } catch (error) {
      _cloudSyncReportNonFatal(App, 'conflict.resolve.lock', error, { throttleMs: 8000 });
      return { ok: false, resolution, reason: 'busy' };
    }
  };
}
