import type { CloudSyncPanelApiDeps } from '../../../types';

import {
  createCloudSyncPanelApiRuntimeShared,
  type CloudSyncPanelApiRuntimeCommands,
} from './cloud_sync_panel_api_commands_runtime_shared.js';
import { createCloudSyncPanelApiRoomCommands } from './cloud_sync_panel_api_commands_runtime_room.js';
import { createCloudSyncPanelApiMutationCommands } from './cloud_sync_panel_api_commands_runtime_mutations.js';
import type { CloudSyncPanelSnapshotController } from './cloud_sync_panel_api_snapshots.js';

export type { CloudSyncPanelApiRuntimeCommands };

export function createCloudSyncPanelApiRuntimeCommands(
  deps: CloudSyncPanelApiDeps,
  snapshots: CloudSyncPanelSnapshotController
): CloudSyncPanelApiRuntimeCommands {
  const shared = createCloudSyncPanelApiRuntimeShared(deps);
  return {
    ...createCloudSyncPanelApiRoomCommands(deps, snapshots, shared),
    ...createCloudSyncPanelApiMutationCommands(deps, snapshots, shared),
  };
}
