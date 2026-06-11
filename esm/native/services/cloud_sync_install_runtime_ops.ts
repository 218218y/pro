import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import { createCloudSyncTabsGateOps } from './cloud_sync_tabs_gate.js';
import { createCloudSyncSketchOps } from './cloud_sync_sketch_ops.js';
import { createCloudSyncDeleteTempOps } from './cloud_sync_delete_temp.js';
import { createCloudSyncMainRowOps } from './cloud_sync_main_row.js';
import {
  createCloudSyncRealtimeHintEmitter,
  type CloudSyncInstallRuntime,
  type CloudSyncInstallRuntimeArgs,
} from './cloud_sync_install_runtime_shared.js';

export function createCloudSyncInstallRuntimeOps(args: CloudSyncInstallRuntimeArgs): CloudSyncInstallRuntime {
  const { App, ownerContext, suppressRef, getSendRealtimeHint } = args;
  const {
    cfg,
    restUrl,
    setTimeoutFn,
    clearTimeoutFn,
    getRow,
    upsertRow,
    storage,
    keyModels,
    keyColors,
    keyColorOrder,
    keyPresetOrder,
    keyHiddenPresets,
    room,
    currentRoom,
    getGateBaseRoom,
    clientId,
    runtimeStatus,
    publishStatus,
    diag,
  } = ownerContext;

  const emitRealtimeHint = createCloudSyncRealtimeHintEmitter(getSendRealtimeHint);

  const cloudSyncTabsGate = createCloudSyncTabsGateOps({
    App,
    cfg,
    storage,
    getGateBaseRoom,
    restUrl,
    clientId,
    getRow,
    upsertRow,
    setTimeoutFn,
    clearTimeoutFn,
    emitRealtimeHint,
    runtimeStatus,
    publishStatus,
  });

  const cloudSyncSketch = createCloudSyncSketchOps({
    App,
    cfg,
    storage,
    getGateBaseRoom,
    restUrl,
    clientId,
    currentRoom,
    getRow,
    upsertRow,
    emitRealtimeHint,
    runtimeStatus,
    publishStatus,
    diag,
  });

  const cloudSyncMainRow = createCloudSyncMainRowOps({
    App,
    cfg,
    restUrl,
    room,
    storage,
    keyModels,
    keyColors,
    keyColorOrder,
    keyPresetOrder,
    keyHiddenPresets,
    getRow,
    upsertRow,
    setTimeoutFn,
    clearTimeoutFn,
    runtimeStatus,
    publishStatus,
    diag,
    suppressRef,
    getSendRealtimeHint,
  });

  const { deleteTemporaryModelsInCloud, deleteTemporaryColorsInCloud } = createCloudSyncDeleteTempOps({
    App,
    cfg,
    restUrl,
    storage,
    keyModels,
    keyColors,
    keyColorOrder,
    keyPresetOrder,
    keyHiddenPresets,
    currentRoom,
    getRow,
    upsertRow,
    getSendRealtimeHint,
    runtimeStatus,
    publishStatus,
    runMainWriteFlight: (key, run, onBusy) => cloudSyncMainRow.runMainWriteFlight(key, run, onBusy),
    clearPendingPush: () => {
      cloudSyncMainRow.clearPendingPush();
    },
    setLastSeenUpdatedAt: (value: string) => {
      cloudSyncMainRow.setLastSeenUpdatedAt(value);
    },
    setLastHash: (value: string) => {
      cloudSyncMainRow.setLastHash(value);
    },
    suppress: suppressRef,
    reportNonFatal: _cloudSyncReportNonFatal,
  });

  return {
    cloudSyncTabsGate,
    cloudSyncSketch,
    cloudSyncMainRow,
    deleteTemporaryModelsInCloud,
    deleteTemporaryColorsInCloud,
  };
}
