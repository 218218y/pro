import type { CloudSyncPayload } from '../../../types';

import { writeCloudSyncMainRowPayload } from './cloud_sync_main_row_write_support.js';
import { applyRemote, computeHash } from './cloud_sync_support.js';
import { createCloudCollectionsRepository } from './cloud_sync_collections_repository.js';
import type { DeleteTempArgs } from './cloud_sync_delete_temp_shared.js';

export type CloudSyncDeleteTempWriteResult =
  { ok: true; settled: boolean } | { ok: false; reason: 'write' | 'commit' | 'revision-mismatch' };

export async function writeDeleteTempPayloadAndApplyLocally(args: {
  owner: DeleteTempArgs;
  room: string;
  nextPayload: CloudSyncPayload;
  expectedLocalRevision: number;
}): Promise<CloudSyncDeleteTempWriteResult> {
  const { owner, room, nextPayload, expectedLocalRevision } = args;
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
  });
  if (!writeResult.ok) return { ok: false, reason: 'write' };

  const applied = await applyRemote(
    owner.App,
    owner.storage,
    owner.keyModels,
    owner.keyColors,
    owner.keyColorOrder,
    owner.keyPresetOrder,
    owner.keyHiddenPresets,
    writeResult.payload,
    expectedLocalRevision
  );
  if (applied.ok === false) return { ok: false, reason: applied.reason };
  if (writeResult.row?.updated_at) owner.setLastSeenUpdatedAt(writeResult.row.updated_at);
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
  return { ok: true, settled: writeResult.settled };
}
