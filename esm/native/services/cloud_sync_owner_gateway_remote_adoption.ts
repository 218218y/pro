import type {
  AppContainer,
  CloudSyncConflictRecord,
  CloudSyncPayload,
  CloudSyncRemoteAdoptionResult,
  CloudSyncStateRow,
} from '../../../types';

import type { CloudSyncConflictLocalSnapshot } from './cloud_sync_owner_gateway_contracts.js';
import type { CloudSyncOwnerConflictJournal } from './cloud_sync_owner_gateway_conflict_journal.js';
import { readCloudSyncGatewayPayloadDifferenceKeys } from './cloud_sync_owner_gateway_payload.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support_feedback.js';

export type CloudSyncRemoteAdoptionCoordinatorResult =
  | {
      ok: true;
      adoption: Extract<CloudSyncRemoteAdoptionResult, { ok: true }>;
    }
  | {
      ok: false;
      reason: 'commit' | 'revision-mismatch';
      conflict: CloudSyncConflictRecord;
    };

export function createCloudSyncRemoteAdoptionCoordinator(args: {
  App: AppContainer;
  conflicts: CloudSyncOwnerConflictJournal;
}) {
  const { App, conflicts } = args;

  const reportCallbackFailure = (stage: 'read-local' | 'adopt-remote', error: unknown): void => {
    _cloudSyncReportNonFatal(App, `conflict.resolve.${stage}`, error, { throttleMs: 8000 });
  };

  const adoptAtRevision = async (
    adoptRemote: (
      row: CloudSyncStateRow,
      expectedLocalRevision: number
    ) => Promise<CloudSyncRemoteAdoptionResult>,
    row: CloudSyncStateRow,
    expectedLocalRevision: number
  ): Promise<CloudSyncRemoteAdoptionResult> => {
    try {
      return await adoptRemote(row, expectedLocalRevision);
    } catch (error) {
      reportCallbackFailure('adopt-remote', error);
      return { ok: false, uiRefreshWarning: false, reason: 'commit' };
    }
  };

  const coordinate = async (options: {
    room: string;
    row: CloudSyncStateRow;
    expectedLocalRevision: number;
    mismatchBase: CloudSyncPayload;
    fallbackLocal: CloudSyncPayload;
    fallbackConflictKeys: string[];
    adoptRemote: (
      row: CloudSyncStateRow,
      expectedLocalRevision: number
    ) => Promise<CloudSyncRemoteAdoptionResult>;
    readLocalSnapshot: () => CloudSyncConflictLocalSnapshot;
  }): Promise<CloudSyncRemoteAdoptionCoordinatorResult> => {
    let adoption = await adoptAtRevision(options.adoptRemote, options.row, options.expectedLocalRevision);
    if (adoption.ok === true) return { ok: true, adoption };

    if (adoption.reason === 'revision-mismatch') {
      try {
        let mismatchBase = options.mismatchBase;
        let currentLocal = options.readLocalSnapshot();
        if (
          !readCloudSyncGatewayPayloadDifferenceKeys(options.row.payload || {}, currentLocal.payload).length
        ) {
          mismatchBase = options.row.payload || {};
          adoption = await adoptAtRevision(options.adoptRemote, options.row, currentLocal.revision);
          if (adoption.ok === true) return { ok: true, adoption };
          if (adoption.reason === 'revision-mismatch') currentLocal = options.readLocalSnapshot();
        }
        if (adoption.reason === 'revision-mismatch') {
          const keys = readCloudSyncGatewayPayloadDifferenceKeys(mismatchBase, currentLocal.payload);
          const conflict = conflicts.publishConflict({
            room: options.room,
            row: options.row,
            keys: keys.length ? keys : ['revision'],
            base: mismatchBase,
            local: currentLocal.payload,
          });
          return { ok: false, reason: adoption.reason, conflict };
        }
      } catch (error) {
        reportCallbackFailure('read-local', error);
      }
    }

    const conflict = conflicts.publishConflict({
      room: options.room,
      row: options.row,
      keys: options.fallbackConflictKeys,
      base: options.row.payload || {},
      local: options.fallbackLocal,
    });
    return {
      ok: false,
      reason: adoption.ok === false ? adoption.reason : 'commit',
      conflict,
    };
  };

  return { coordinate, reportCallbackFailure };
}
