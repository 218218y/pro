import { readCloudSyncRowWithPullActivity } from './cloud_sync_remote_read_support.js';
import { parseFloatingSyncPayload, resolveFloatingSketchSyncRoom } from './cloud_sync_sketch_ops_shared.js';
import {
  applyFloatingSketchSyncPinnedInPlace,
  type CloudSyncFloatingSketchSyncMutableState,
  type CreateCloudSyncFloatingSketchSyncOpsDeps,
} from './cloud_sync_sketch_ops_floating_state.js';

export function createCloudSyncFloatingSketchSyncPullOnce(
  deps: CreateCloudSyncFloatingSketchSyncOpsDeps,
  state: CloudSyncFloatingSketchSyncMutableState
): (isInitial: boolean) => Promise<void> {
  const { App, cfg, storage, getGateBaseRoom, restUrl, getRow, runtimeStatus, publishStatus } = deps;

  return async (isInitial: boolean): Promise<void> => {
    const roomNow = resolveFloatingSketchSyncRoom({
      App,
      cfg,
      storage,
      getGateBaseRoom,
      currentRoom: () => '',
    });
    if (!roomNow) return;

    const row = await readCloudSyncRowWithPullActivity({
      restUrl,
      anonKey: cfg.anonKey,
      room: roomNow,
      getRow,
      runtimeStatus,
      publishStatus,
    });
    if (!row || !row.updated_at) {
      if (isInitial) {
        applyFloatingSketchSyncPinnedInPlace(
          state,
          { App, storage },
          state.floatingSketchSyncEnabled,
          'local'
        );
      }
      return;
    }

    if (isInitial || !state.lastFloatingSyncUpdatedAt || row.updated_at !== state.lastFloatingSyncUpdatedAt) {
      state.lastFloatingSyncUpdatedAt = row.updated_at;
      const parsed = parseFloatingSyncPayload(row.payload);
      applyFloatingSketchSyncPinnedInPlace(state, { App, storage }, parsed.enabled, parsed.by || 'cloud');
    }
  };
}
