import { readCloudSyncRowWithPullActivity } from './cloud_sync_remote_read_support.js';
import { parseSketchPayload, resolveCloudSyncSketchRoom } from './cloud_sync_sketch_ops_shared.js';
import type {
  CloudSyncSketchRoomMutableState,
  CreateCloudSyncSketchRoomOpsDeps,
} from './cloud_sync_sketch_ops_sketch_state.js';
import {
  finishPulledSketchLoad,
  runInitialCloudSketchCatchup,
  tryLoadEligibleRemoteSketch,
} from './cloud_sync_sketch_ops_sketch_load.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';

export function createCloudSyncSketchPullOnce(
  deps: CreateCloudSyncSketchRoomOpsDeps,
  state: CloudSyncSketchRoomMutableState
): (isInitial: boolean) => Promise<void> {
  const { App, cfg, storage, getGateBaseRoom, restUrl, currentRoom, getRow, runtimeStatus, publishStatus } =
    deps;

  return async (isInitial: boolean): Promise<void> => {
    try {
      const sketchRoom = resolveCloudSyncSketchRoom(
        { App, cfg, storage, getGateBaseRoom, currentRoom },
        'pull'
      );
      if (!sketchRoom) return;

      const row = await readCloudSyncRowWithPullActivity({
        restUrl,
        anonKey: cfg.anonKey,
        room: sketchRoom,
        getRow,
        runtimeStatus,
        publishStatus,
      });
      const rowUpdatedAt = (row && row.updated_at) || '';

      if (isInitial) {
        state.sketchBaselineDone = true;
        state.lastSketchPullUpdatedAt = rowUpdatedAt;
        if (!row) return;

        runInitialCloudSketchCatchup(deps, state, rowUpdatedAt, parseSketchPayload(row.payload), parsed =>
          tryLoadEligibleRemoteSketch(deps, state, parsed)
        );
        return;
      }

      if (!state.sketchBaselineDone) state.sketchBaselineDone = true;
      if (!row || !rowUpdatedAt) return;
      if (rowUpdatedAt === state.lastSketchPullUpdatedAt) return;
      state.lastSketchPullUpdatedAt = rowUpdatedAt;

      const loaded = tryLoadEligibleRemoteSketch(deps, state, parseSketchPayload(row.payload));
      if (!loaded) return;
      finishPulledSketchLoad(deps, state, loaded);
    } catch (e) {
      _cloudSyncReportNonFatal(App, 'cloudSketch.pull', e, { throttleMs: 4000 });
    }
  };
}
