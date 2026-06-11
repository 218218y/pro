// Cloud sync panel/service API builder.
//
// Keeps cloud_sync.ts as the canonical installer/orchestrator while moving the
// React-facing snapshot state and command surface into focused helper modules.

import type { CloudSyncPanelApiDeps, CloudSyncServiceLike } from '../../../types';

import { createCloudSyncPanelApiCommands } from './cloud_sync_panel_api_commands.js';
import { createCloudSyncPanelSnapshotController } from './cloud_sync_panel_api_snapshots.js';

export function createCloudSyncPanelApi(deps: CloudSyncPanelApiDeps): CloudSyncServiceLike {
  const snapshots = createCloudSyncPanelSnapshotController(deps);
  return createCloudSyncPanelApiCommands(deps, snapshots);
}
