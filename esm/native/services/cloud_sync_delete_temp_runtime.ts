import type { CloudSyncDeleteTempResult } from '../../../types';

import { readCloudSyncRowWithPullActivity } from './cloud_sync_remote_read_support.js';
import {
  type DeleteTempArgs,
  type DeleteTempKind,
  buildDeleteTempErrorResult,
  readDeleteTempCollections,
  resolveDeleteTempPayload,
} from './cloud_sync_delete_temp_shared.js';
import { writeDeleteTempPayloadAndApplyLocally } from './cloud_sync_delete_temp_write.js';

function readDeleteTempErrorFallback(kind: DeleteTempKind): string {
  return kind === 'models' ? 'מחיקת דגמים זמניים נכשלה' : 'מחיקת צבעים זמניים נכשלה';
}

function deleteTemporaryItemsInCloud(
  args: DeleteTempArgs,
  kind: DeleteTempKind
): Promise<CloudSyncDeleteTempResult> {
  return args.runMainWriteFlight(
    `delete:${kind}`,
    async () => {
      args.clearPendingPush();

      const roomNow = args.currentRoom();
      if (!roomNow) return { ok: false, removed: 0, reason: 'room' };

      let collections;
      try {
        const row = await readCloudSyncRowWithPullActivity({
          restUrl: args.restUrl,
          anonKey: args.cfg.anonKey,
          room: roomNow,
          getRow: args.getRow,
          runtimeStatus: args.runtimeStatus,
          publishStatus: args.publishStatus,
        });
        collections = readDeleteTempCollections((row && row.payload) || null);
      } catch (err) {
        return buildDeleteTempErrorResult(args, kind, err, readDeleteTempErrorFallback(kind));
      }

      const { nextPayload, removed } = resolveDeleteTempPayload({ kind, collections });
      if (removed <= 0 || !nextPayload) return { ok: true, removed: 0 };

      try {
        const ok = await writeDeleteTempPayloadAndApplyLocally({
          owner: args,
          room: roomNow,
          nextPayload,
        });
        return ok ? { ok: true, removed } : { ok: false, removed: 0, reason: 'write' };
      } catch (err) {
        return buildDeleteTempErrorResult(args, kind, err, readDeleteTempErrorFallback(kind));
      }
    },
    () => ({ ok: false, removed: 0, reason: 'busy' })
  );
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
