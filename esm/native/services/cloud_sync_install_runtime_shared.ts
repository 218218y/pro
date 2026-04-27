import type { AppContainer } from '../../../types';

import type { CloudSyncRealtimeHintSender } from './cloud_sync_pull_scopes.js';
import type { CloudSyncOwnerContext } from './cloud_sync_owner_context.js';
import { createCloudSyncDeleteTempOps } from './cloud_sync_delete_temp.js';
import { createCloudSyncMainRowOps } from './cloud_sync_main_row.js';
import { createCloudSyncSketchOps } from './cloud_sync_sketch_ops.js';
import { createCloudSyncTabsGateOps } from './cloud_sync_tabs_gate.js';

export type CloudSyncHintSender = CloudSyncRealtimeHintSender | null;

export type CloudSyncInstallRuntimeArgs = {
  App: AppContainer;
  ownerContext: CloudSyncOwnerContext;
  suppressRef: { v: boolean };
  getSendRealtimeHint: () => CloudSyncHintSender;
};

export type CloudSyncInstallRuntime = {
  cloudSyncTabsGate: ReturnType<typeof createCloudSyncTabsGateOps>;
  cloudSyncSketch: ReturnType<typeof createCloudSyncSketchOps>;
  cloudSyncMainRow: ReturnType<typeof createCloudSyncMainRowOps>;
  deleteTemporaryModelsInCloud: ReturnType<
    typeof createCloudSyncDeleteTempOps
  >['deleteTemporaryModelsInCloud'];
  deleteTemporaryColorsInCloud: ReturnType<
    typeof createCloudSyncDeleteTempOps
  >['deleteTemporaryColorsInCloud'];
};

export function createCloudSyncRealtimeHintEmitter(
  getSendRealtimeHint: () => CloudSyncHintSender
): CloudSyncRealtimeHintSender {
  return (scope, rowName): void => {
    const sendRealtimeHint = getSendRealtimeHint();
    if (sendRealtimeHint) sendRealtimeHint(scope, rowName);
  };
}
