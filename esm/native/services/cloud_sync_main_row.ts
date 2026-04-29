// Cloud Sync main-row sync/persistence helpers.
// Owns the local<->cloud main collections flow so the owner stays focused on wiring.

import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import { createCloudSyncMainRowLocalState } from './cloud_sync_main_row_local.js';
import { createCloudSyncMainRowRemoteOps } from './cloud_sync_main_row_remote.js';
import {
  createCloudSyncMainRowMutableState,
  type CloudSyncMainRowOps,
  type CreateCloudSyncMainRowOpsArgs,
} from './cloud_sync_main_row_shared.js';
import { createCloudSyncMainRowPullFlow } from './cloud_sync_main_row_pull.js';
import { createCloudSyncMainRowPushFlow, type CloudSyncMainRowPushFlow } from './cloud_sync_main_row_push.js';

export type { CloudSyncMainRowOps, CreateCloudSyncMainRowOpsArgs } from './cloud_sync_main_row_shared.js';

export function createCloudSyncMainRowOps(args: CreateCloudSyncMainRowOpsArgs): CloudSyncMainRowOps {
  const state = createCloudSyncMainRowMutableState(args);
  const localState = createCloudSyncMainRowLocalState({
    App: args.App,
    cfg: args.cfg,
    restUrl: args.restUrl,
    room: args.room,
    storage: args.storage,
    keyModels: args.keyModels,
    keyColors: args.keyColors,
    keyColorOrder: args.keyColorOrder,
    keyPresetOrder: args.keyPresetOrder,
    keyHiddenPresets: args.keyHiddenPresets,
    getRow: args.getRow,
    upsertRow: args.upsertRow,
    suppressRef: args.suppressRef,
    getSendRealtimeHint: args.getSendRealtimeHint,
    state,
  });

  let remoteOpsRef: ReturnType<typeof createCloudSyncMainRowRemoteOps> | null = null;
  let pushFlowRef: CloudSyncMainRowPushFlow | null = null;
  const pullFlow = createCloudSyncMainRowPullFlow({
    setTimeoutFn: args.setTimeoutFn,
    clearTimeoutFn: args.clearTimeoutFn,
    suppressRef: args.suppressRef,
    diag: args.diag,
    isPushInFlight: state.isPushInFlight,
    hasPendingPushWork: () => pushFlowRef?.hasPendingPushWork() ?? false,
    runPullRemote: isInitial => remoteOpsRef?.pullOnce(isInitial) ?? Promise.resolve(),
  });

  remoteOpsRef = createCloudSyncMainRowRemoteOps({
    App: args.App,
    cfg: args.cfg,
    restUrl: args.restUrl,
    room: args.room,
    getRow: args.getRow,
    upsertRow: args.upsertRow,
    runtimeStatus: args.runtimeStatus,
    publishStatus: args.publishStatus,
    suppressRef: args.suppressRef,
    getSendRealtimeHint: args.getSendRealtimeHint,
    localState,
    state,
    schedulePullSoon: pullFlow.schedulePullSoon,
  });

  const pushFlow = createCloudSyncMainRowPushFlow({
    App: args.App,
    setTimeoutFn: args.setTimeoutFn,
    clearTimeoutFn: args.clearTimeoutFn,
    suppressRef: args.suppressRef,
    isPushInFlight: state.isPushInFlight,
    runPushRemote: () => remoteOpsRef?.pushNow() ?? Promise.resolve(),
    flushPendingPullAfterFlights: pullFlow.flushPendingPullAfterFlights,
  });
  pushFlowRef = pushFlow;

  const dispose = (): void => {
    try {
      pullFlow.dispose();
      pushFlow.dispose();
    } catch (err) {
      _cloudSyncReportNonFatal(args.App, 'cloudSyncMainRow.dispose', err, { throttleMs: 8000 });
    }
  };

  return {
    schedulePullSoon: pullFlow.schedulePullSoon,
    schedulePush: pushFlow.schedulePush,
    pushNow: pushFlow.pushNow,
    pullOnce: pullFlow.pullOnce,
    subscribePushSettled: pushFlow.subscribePushSettled,
    clearPendingPush: pushFlow.clearPendingPush,
    isPushInFlight: state.isPushInFlight,
    runMainWriteFlight: state.runMainWriteFlight,
    setLastSeenUpdatedAt: state.setLastSeenUpdatedAt,
    setLastHash: state.setLastHash,
    dispose,
  };
}
