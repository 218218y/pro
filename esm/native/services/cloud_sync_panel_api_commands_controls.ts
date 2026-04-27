import type { CloudSyncPanelApiDeps } from '../../../types';

import type { CloudSyncPanelSnapshotController } from './cloud_sync_panel_api_snapshots.js';
import { createCloudSyncPanelApiControlReadCommands } from './cloud_sync_panel_api_commands_controls_reads.js';
import { createCloudSyncPanelApiControlMutationCommands } from './cloud_sync_panel_api_commands_controls_mutations.js';

export type { CloudSyncPanelApiControlCommands } from './cloud_sync_panel_api_commands_controls_shared.js';

export function createCloudSyncPanelApiControlCommands(
  deps: CloudSyncPanelApiDeps,
  snapshots: CloudSyncPanelSnapshotController
) {
  return {
    ...createCloudSyncPanelApiControlReadCommands(deps, snapshots),
    ...createCloudSyncPanelApiControlMutationCommands(deps, snapshots),
  };
}
