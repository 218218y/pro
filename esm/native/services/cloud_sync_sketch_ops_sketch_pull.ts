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
  const {
    App,
    cfg,
    storage,
    getGateBaseRoom,
    gatewayUrl,
    currentRoom,
    getRow,
    runtimeStatus,
    publishStatus,
  } = deps;

  return async (isInitial: boolean): Promise<void> => {
    try {
      const sketchRoom = resolveCloudSyncSketchRoom(
        { App, cfg, storage, getGateBaseRoom, currentRoom },
        'pull'
      );
      if (!sketchRoom) return;

      const readResult = await readCloudSyncRowWithPullActivity({
        gatewayUrl,
        anonKey: cfg.anonKey,
        room: sketchRoom,
        getRow,
        runtimeStatus,
        publishStatus,
      });
      if (readResult.ok === false) return;
      const row = readResult.row;
      const rowUpdatedAt = (row && row.updated_at) || '';

      if (isInitial) {
        state.sketchBaselineDone = true;
        if (!row) return;

        const settled = await runInitialCloudSketchCatchup(
          deps,
          state,
          rowUpdatedAt,
          parseSketchPayload(row.payload),
          parsed => tryLoadEligibleRemoteSketch(deps, state, parsed)
        );
        if (settled) state.lastSketchPullUpdatedAt = rowUpdatedAt;
        return;
      }

      if (!state.sketchBaselineDone) state.sketchBaselineDone = true;
      if (!row || !rowUpdatedAt) return;
      if (rowUpdatedAt === state.lastSketchPullUpdatedAt) return;
      const decision = tryLoadEligibleRemoteSketch(deps, state, parseSketchPayload(row.payload));
      if (decision.kind === 'pending') return;
      if (decision.kind === 'settled') {
        state.lastSketchPullUpdatedAt = rowUpdatedAt;
        return;
      }
      if (await finishPulledSketchLoad(deps, state, decision.loaded)) {
        state.lastSketchPullUpdatedAt = rowUpdatedAt;
      }
    } catch (e) {
      _cloudSyncReportNonFatal(App, 'cloudSketch.pull', e, { throttleMs: 4000 });
    }
  };
}
