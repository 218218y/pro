import type { CloudSyncDeleteTempResult } from '../../../types';

import { readCloudSyncRowWithPullActivity } from './cloud_sync_remote_read_support.js';
import { createCloudCollectionsRepository } from './cloud_sync_collections_repository.js';
import {
  type DeleteTempArgs,
  type DeleteTempKind,
  buildDeleteTempErrorResult,
  readDeleteTempCollections,
  resolveDeleteTempPayload,
} from './cloud_sync_delete_temp_shared.js';
import { writeDeleteTempPayloadAndApplyLocally } from './cloud_sync_delete_temp_write.js';

function readDeleteTempDefaultErrorMessage(kind: DeleteTempKind): string {
  return kind === 'models' ? 'מחיקת דגמים זמניים נכשלה' : 'מחיקת צבעים זמניים נכשלה';
}

function deleteTemporaryItemsInCloud(
  args: DeleteTempArgs,
  kind: DeleteTempKind
): Promise<CloudSyncDeleteTempResult> {
  let reconcileLocalAfterFlight = false;
  let settleRemoteAfterFlight = false;
  const flight = args.runMainWriteFlight<CloudSyncDeleteTempResult>(
    `delete:${kind}`,
    async () => {
      args.clearPendingPush();

      const roomNow = args.currentRoom();
      if (!roomNow) return { ok: false, removed: 0, reason: 'room' };

      const expectedLocalRevision = createCloudCollectionsRepository({
        storage: args.storage,
        keys: {
          models: args.keyModels,
          colors: args.keyColors,
          colorOrder: args.keyColorOrder,
          presetOrder: args.keyPresetOrder,
          hiddenPresets: args.keyHiddenPresets,
        },
      }).readEnvelope().revision;

      let collections;
      try {
        const readResult = await readCloudSyncRowWithPullActivity({
          gatewayUrl: args.gatewayUrl,
          anonKey: args.cfg.anonKey,
          room: roomNow,
          getRow: args.getRow,
          runtimeStatus: args.runtimeStatus,
          publishStatus: args.publishStatus,
        });
        if (readResult.ok === false) {
          throw new Error(`Cloud Sync read failed: ${readResult.failure.kind}`);
        }
        const row = readResult.row;
        collections = readDeleteTempCollections((row && row.payload) || null);
      } catch (err) {
        return buildDeleteTempErrorResult(args, kind, err, readDeleteTempDefaultErrorMessage(kind));
      }

      const { nextPayload, removed } = resolveDeleteTempPayload({ kind, collections });
      if (removed <= 0 || !nextPayload) return { ok: true, removed: 0 };

      try {
        const writeResult = await writeDeleteTempPayloadAndApplyLocally({
          owner: args,
          room: roomNow,
          nextPayload,
          expectedLocalRevision,
        });
        if (writeResult.ok === false) {
          if (writeResult.reason === 'revision-mismatch') reconcileLocalAfterFlight = true;
          return { ok: false, removed: 0, reason: 'write' };
        }
        if (!writeResult.settled) settleRemoteAfterFlight = true;
        return { ok: true, removed };
      } catch (err) {
        return buildDeleteTempErrorResult(args, kind, err, readDeleteTempDefaultErrorMessage(kind));
      }
    },
    () => ({ ok: false, removed: 0, reason: 'busy' })
  );
  void flight.then(
    () => {
      if (reconcileLocalAfterFlight) args.schedulePush();
      else if (settleRemoteAfterFlight) args.schedulePullSoon({ reason: 'delete-temp-settle' });
    },
    () => undefined
  );
  return flight;
}

export function createCloudSyncDeleteTempOps(args: DeleteTempArgs): {
  deleteTemporaryModelsInCloud: () => Promise<CloudSyncDeleteTempResult>;
  deleteTemporaryColorsInCloud: () => Promise<CloudSyncDeleteTempResult>;
} {
  return {
    deleteTemporaryModelsInCloud: () => deleteTemporaryItemsInCloud(args, 'models'),
    deleteTemporaryColorsInCloud: () => deleteTemporaryItemsInCloud(args, 'colors'),
  };
}
