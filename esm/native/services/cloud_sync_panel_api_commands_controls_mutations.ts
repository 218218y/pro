import type { CloudSyncPanelApiDeps } from '../../../types';

import type { CloudSyncPanelSnapshotController } from './cloud_sync_panel_api_snapshots.js';
import {
  buildCloudSyncPanelApiControlOp,
  buildSite2TabsGateCommandDeps,
  readSite2TabsGateCommandFailure,
  type CloudSyncPanelApiControlCommands,
} from './cloud_sync_panel_api_commands_controls_shared.js';
import { runSite2TabsGateCommand, toggleSite2TabsGateCommand } from './cloud_sync_tabs_gate_command.js';

export function createCloudSyncPanelApiControlMutationCommands(
  deps: CloudSyncPanelApiDeps,
  snapshots: CloudSyncPanelSnapshotController
): Pick<CloudSyncPanelApiControlCommands, 'setSite2TabsGateOpen' | 'toggleSite2TabsGateOpen'> {
  const { App, reportNonFatal } = deps;
  const commandDeps = buildSite2TabsGateCommandDeps(deps);

  return {
    setSite2TabsGateOpen: async open => {
      try {
        const result = await runSite2TabsGateCommand(commandDeps, !!open);
        snapshots.publishSite2TabsGateSnapshot();
        return result;
      } catch (err) {
        reportNonFatal(App, buildCloudSyncPanelApiControlOp('setSite2TabsGateOpen'), err, {
          throttleMs: 4000,
        });
        snapshots.publishSite2TabsGateSnapshot();
        return readSite2TabsGateCommandFailure(err);
      }
    },

    toggleSite2TabsGateOpen: async () => {
      try {
        const result = await toggleSite2TabsGateCommand(commandDeps);
        snapshots.publishSite2TabsGateSnapshot();
        return result;
      } catch (err) {
        reportNonFatal(App, buildCloudSyncPanelApiControlOp('toggleSite2TabsGateOpen'), err, {
          throttleMs: 4000,
        });
        snapshots.publishSite2TabsGateSnapshot();
        return readSite2TabsGateCommandFailure(err);
      }
    },
  };
}
