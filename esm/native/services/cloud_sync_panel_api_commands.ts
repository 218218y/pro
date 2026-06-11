import type { CloudSyncPanelApiDeps, CloudSyncServiceLike } from '../../../types';

import { createCloudSyncPanelApiControlCommands } from './cloud_sync_panel_api_commands_controls.js';
import { createCloudSyncPanelApiRuntimeCommands } from './cloud_sync_panel_api_commands_runtime.js';
import { createCloudSyncPanelApiStaticCommands } from './cloud_sync_panel_api_commands_shared.js';
import { createCloudSyncPanelApiSingleFlightCommands } from './cloud_sync_panel_api_commands_singleflight.js';
import type { CloudSyncPanelSnapshotController } from './cloud_sync_panel_api_snapshots.js';

export function createCloudSyncPanelApiCommands(
  deps: CloudSyncPanelApiDeps,
  snapshots: CloudSyncPanelSnapshotController
): CloudSyncServiceLike {
  const runtime = createCloudSyncPanelApiRuntimeCommands(deps, snapshots);
  const controls = createCloudSyncPanelApiControlCommands(deps, snapshots);
  return {
    ...createCloudSyncPanelApiStaticCommands({ runtime, controls, snapshots }),
    ...createCloudSyncPanelApiSingleFlightCommands({ deps, runtime, controls }),
  };
}
