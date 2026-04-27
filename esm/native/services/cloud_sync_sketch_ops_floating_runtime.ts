import {
  createCloudSyncFloatingSketchSyncMutableState,
  disposeFloatingSketchSyncMutableState,
  setFloatingSketchSyncEnabledStateInPlace,
  subscribeFloatingSketchSyncEnabledStateInPlace,
  type CloudSyncFloatingSketchSyncOps,
  type CreateCloudSyncFloatingSketchSyncOpsDeps,
} from './cloud_sync_sketch_ops_floating_state.js';
import { createCloudSyncFloatingSketchSyncPushNow } from './cloud_sync_sketch_ops_floating_push.js';
import { createCloudSyncFloatingSketchSyncPullOnce } from './cloud_sync_sketch_ops_floating_pull.js';

export function createCloudSyncFloatingSketchSyncOps(
  deps: CreateCloudSyncFloatingSketchSyncOpsDeps
): CloudSyncFloatingSketchSyncOps {
  const state = createCloudSyncFloatingSketchSyncMutableState(deps);
  const pushFloatingSketchSyncPinnedNow = createCloudSyncFloatingSketchSyncPushNow(deps, state);
  const pullFloatingSketchSyncPinnedOnce = createCloudSyncFloatingSketchSyncPullOnce(deps, state);

  return {
    pushFloatingSketchSyncPinnedNow,
    pullFloatingSketchSyncPinnedOnce,
    getFloatingSketchSyncEnabled: () => state.floatingSketchSyncEnabled,
    setFloatingSketchSyncEnabledState: (enabled: boolean) =>
      setFloatingSketchSyncEnabledStateInPlace(state, deps, enabled),
    subscribeFloatingSketchSyncEnabledState: fn =>
      subscribeFloatingSketchSyncEnabledStateInPlace(state, deps.App, fn),
    dispose: () => {
      disposeFloatingSketchSyncMutableState(state);
    },
  };
}
