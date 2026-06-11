import type { CloudSyncPanelApiDeps } from '../../../types';

import type { CloudSyncPanelSnapshotController } from './cloud_sync_panel_api_snapshots.js';
import {
  buildCloudSyncPanelApiControlOp,
  type CloudSyncPanelApiControlCommands,
} from './cloud_sync_panel_api_commands_controls_shared.js';

export function createCloudSyncPanelApiControlReadCommands(
  deps: CloudSyncPanelApiDeps,
  snapshots: CloudSyncPanelSnapshotController
): Pick<
  CloudSyncPanelApiControlCommands,
  | 'isSite2TabsGateEnabled'
  | 'getSite2TabsGateSnapshot'
  | 'subscribeSite2TabsGateSnapshot'
  | 'getSite2TabsGateOpen'
  | 'getSite2TabsGateUntil'
> {
  const { App, tabsGateOpenRef, tabsGateUntilRef, isTabsGateController, reportNonFatal } = deps;

  return {
    isSite2TabsGateEnabled: (): boolean => {
      try {
        return !!isTabsGateController;
      } catch (err) {
        reportNonFatal(App, buildCloudSyncPanelApiControlOp('isSite2TabsGateEnabled'), err, {
          throttleMs: 4000,
        });
        return false;
      }
    },

    getSite2TabsGateSnapshot: snapshots.getSite2TabsGateSnapshot,
    subscribeSite2TabsGateSnapshot: snapshots.subscribeSite2TabsGateSnapshot,

    getSite2TabsGateOpen: (): boolean => {
      try {
        return !!tabsGateOpenRef.value;
      } catch (err) {
        reportNonFatal(App, buildCloudSyncPanelApiControlOp('getSite2TabsGateOpen'), err, {
          throttleMs: 4000,
        });
        return false;
      }
    },

    getSite2TabsGateUntil: (): number => {
      try {
        return Number(tabsGateUntilRef.value) || 0;
      } catch (err) {
        reportNonFatal(App, buildCloudSyncPanelApiControlOp('getSite2TabsGateUntil'), err, {
          throttleMs: 4000,
        });
        return 0;
      }
    },
  };
}
