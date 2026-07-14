import type { CloudSyncPayload } from '../../../types';

import { writeCloudSyncMainRowPayload } from './cloud_sync_main_row_write_support.js';
import { applyRemote, computeHash } from './cloud_sync_support.js';
import { createCloudCollectionsRepository } from './cloud_sync_collections_repository.js';
import type { DeleteTempArgs } from './cloud_sync_delete_temp_shared.js';

export async function writeDeleteTempPayloadAndApplyLocally(args: {
  owner: DeleteTempArgs;
  room: string;
  nextPayload: CloudSyncPayload;
}): Promise<boolean> {
  const { owner, room, nextPayload } = args;
  const writeResult = await writeCloudSyncMainRowPayload({
    cfg: owner.cfg,
    gatewayUrl: owner.gatewayUrl,
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

  const applied = applyRemote(
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
  if (!applied) return false;
  const local = createCloudCollectionsRepository({
    storage: owner.storage,
    keys: {
      models: owner.keyModels,
      colors: owner.keyColors,
      colorOrder: owner.keyColorOrder,
      presetOrder: owner.keyPresetOrder,
      hiddenPresets: owner.keyHiddenPresets,
    },
  }).read();
  owner.setLastHash(computeHash(local.m, local.c, local.o, local.p, local.h));
  return true;
}
