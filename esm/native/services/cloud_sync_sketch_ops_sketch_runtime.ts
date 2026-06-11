import { createCloudSyncSketchPullOnce } from './cloud_sync_sketch_ops_sketch_pull.js';
import { createCloudSyncSketchSyncNow } from './cloud_sync_sketch_ops_sketch_push.js';
import {
  type CloudSyncSketchRoomOps,
  type CreateCloudSyncSketchRoomOpsDeps,
  createCloudSyncSketchRoomMutableState,
} from './cloud_sync_sketch_ops_sketch_state.js';

export function createCloudSyncSketchRoomOps(deps: CreateCloudSyncSketchRoomOpsDeps): CloudSyncSketchRoomOps {
  const state = createCloudSyncSketchRoomMutableState();
  return {
    syncSketchNow: createCloudSyncSketchSyncNow(deps, state),
    pullSketchOnce: createCloudSyncSketchPullOnce(deps, state),
  };
}
