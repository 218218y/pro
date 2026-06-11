import { readCloudSyncRowWithPullActivity } from './cloud_sync_remote_read_support.js';
import type { CreateCloudSyncMainRowRemoteOpsArgs } from './cloud_sync_main_row_remote_shared.js';

export function createCloudSyncMainRowPullOnce(
  args: CreateCloudSyncMainRowRemoteOpsArgs
): (isInitial: boolean) => Promise<void> {
  const { cfg, restUrl, room, getRow, runtimeStatus, publishStatus, localState, state } = args;

  return async (isInitial: boolean): Promise<void> => {
    const row = await readCloudSyncRowWithPullActivity({
      restUrl,
      anonKey: cfg.anonKey,
      room,
      getRow,
      runtimeStatus,
      publishStatus,
    });

    if (!row) {
      if (isInitial) await localState.seedMissingRowFromLocal();
      return;
    }

    const payload = row.payload || {};
    const updatedAt = String(row.updated_at || '');
    const currentHash = state.getLastHash() || localState.syncHashFromLocal();
    const nextHash = localState.computeAppliedPayloadHash(payload);

    if (!state.getLastSeenUpdatedAt()) {
      state.setLastSeenUpdatedAt(updatedAt);
      if (nextHash === currentHash) {
        state.setLastHash(nextHash);
        return;
      }
      localState.applyRemotePayload(payload);
      return;
    }

    if (updatedAt && updatedAt !== state.getLastSeenUpdatedAt()) {
      state.setLastSeenUpdatedAt(updatedAt);
      if (nextHash === state.getLastHash()) {
        state.setLastHash(nextHash);
        return;
      }
      localState.applyRemotePayload(payload);
    }
  };
}
