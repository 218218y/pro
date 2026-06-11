import type { AppContainer, CloudSyncDiagFn, CloudSyncRuntimeStatus } from '../../../types';

import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import { randomRoomId, type SupabaseCfg } from './cloud_sync_config.js';
import {
  CLOUD_SYNC_DIAG_LS_KEY,
  type CloudSyncReportNonFatal,
} from './cloud_sync_owner_context_runtime_shared.js';
import { createCloudSyncOwnerDiagRuntime } from './cloud_sync_owner_context_diag_runtime.js';
import { createCloudSyncOwnerStatusPublisher } from './cloud_sync_owner_context_status_publication_runtime.js';

export function createCloudSyncOwnerStatusRuntime(args: {
  App: AppContainer;
  cfg: SupabaseCfg;
  room: string;
  clientId: string;
  publicationEpoch: number;
  reportNonFatal?: CloudSyncReportNonFatal;
}): {
  instanceId: string;
  diagStorageKey: string;
  runtimeStatus: CloudSyncRuntimeStatus;
  diagEnabledRef: { value: boolean };
  updateDiagEnabled: () => void;
  publishStatus: () => void;
  diag: CloudSyncDiagFn;
} {
  const { App, cfg, room, clientId, publicationEpoch } = args;
  const reportNonFatal = args.reportNonFatal || _cloudSyncReportNonFatal;

  const runtimeStatus: CloudSyncRuntimeStatus = {
    room,
    clientId,
    instanceId: `cloudSync_${Date.now()}_${String(room || 'room')}_${randomRoomId()}`,
    realtime: {
      enabled: !!cfg.realtime,
      mode: cfg.realtimeMode,
      state: cfg.realtime ? 'init' : 'disabled',
      channel: cfg.realtime ? `${cfg.realtimeChannelPrefix}:${room}` : '',
    },
    polling: { active: false, intervalMs: Math.max(1500, Number(cfg.pollMs) || 2000), reason: '' },
    lastPullAt: 0,
    lastPushAt: 0,
    lastRealtimeEventAt: 0,
    lastError: '',
  };

  const diagRuntime = createCloudSyncOwnerDiagRuntime({
    App,
    cfg,
    runtimeStatus,
    reportNonFatal,
  });
  const statusPublisher = createCloudSyncOwnerStatusPublisher({
    App,
    runtimeStatus,
    publicationEpoch,
    reportNonFatal,
  });

  return {
    instanceId: runtimeStatus.instanceId,
    diagStorageKey: CLOUD_SYNC_DIAG_LS_KEY,
    runtimeStatus,
    diagEnabledRef: diagRuntime.diagEnabledRef,
    updateDiagEnabled: diagRuntime.updateDiagEnabled,
    publishStatus: statusPublisher.publishStatus,
    diag: diagRuntime.diag,
  };
}
