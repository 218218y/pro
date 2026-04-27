import type { CloudSyncPayload } from '../../../types';

import { writeCloudSyncMainRowPayload } from './cloud_sync_main_row_write_support.js';
import { applyRemote, computeHash, readLocal } from './cloud_sync_support.js';
import type { DeleteTempArgs } from './cloud_sync_delete_temp_shared.js';

export async function writeDeleteTempPayloadAndApplyLocally(args: {
  owner: DeleteTempArgs;
  room: string;
  nextPayload: CloudSyncPayload;
}): Promise<boolean> {
  const { owner, room, nextPayload } = args;
  const writeResult = await writeCloudSyncMainRowPayload({
    cfg: owner.cfg,
    restUrl: owner.restUrl,
    room,
    payload: nextPayload,
    getRow: owner.getRow,
    upsertRow: owner.upsertRow,
    getSendRealtimeHint: owner.getSendRealtimeHint,
    runtimeStatus: owner.runtimeStatus,
    publishStatus: owner.publishStatus,
    setLastSeenUpdatedAt: value => {
      owner.setLastSeenUpdatedAt(value);
    },
  });
  if (!writeResult.ok) return false;

  applyRemote(
    owner.App,
    owner.storage,
    owner.keyModels,
    owner.keyColors,
    owner.keyColorOrder,
    owner.keyPresetOrder,
    owner.keyHiddenPresets,
    writeResult.payload,
    owner.suppress
  );
  const local = readLocal(
    owner.storage,
    owner.keyModels,
    owner.keyColors,
    owner.keyColorOrder,
    owner.keyPresetOrder,
    owner.keyHiddenPresets
  );
  owner.setLastHash(computeHash(local.m, local.c, local.o, local.p, local.h));
  return true;
}
