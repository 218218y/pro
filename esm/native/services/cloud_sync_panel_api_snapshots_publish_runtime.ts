import type { CloudSyncPanelSnapshot, CloudSyncSite2TabsGateSnapshot } from '../../../types';

import {
  areCloudSyncPanelSnapshotsEqual,
  areCloudSyncSite2TabsGateSnapshotsEqual,
} from './cloud_sync_panel_api_support.js';
import { cloneCloudSyncSite2TabsGateSnapshot } from './cloud_sync_tabs_gate_support.js';
import { cloneCloudSyncPanelSnapshot } from './cloud_sync_panel_api_public_support.js';
import { scheduleSite2TabsGateFallbackTick } from './cloud_sync_panel_api_snapshots_sources.js';
import type { CloudSyncPanelSnapshotRuntimeContext } from './cloud_sync_panel_api_snapshots_runtime_shared.js';

export function createCloudSyncPanelSnapshotPublishers(context: CloudSyncPanelSnapshotRuntimeContext): {
  publishPanelSnapshot: (roomOverride?: string | null, force?: boolean) => CloudSyncPanelSnapshot;
  publishSite2TabsGateSnapshot: () => CloudSyncSite2TabsGateSnapshot;
} {
  const publishPanelSnapshot = (roomOverride?: string | null, force = false): CloudSyncPanelSnapshot => {
    const nextSnapshot = context.readPanelSnapshot(roomOverride);
    if (!force && areCloudSyncPanelSnapshotsEqual(context.state.panelSnapshot, nextSnapshot)) {
      return cloneCloudSyncPanelSnapshot(context.state.panelSnapshot);
    }
    context.state.panelSnapshot = nextSnapshot;
    const next = cloneCloudSyncPanelSnapshot(context.state.panelSnapshot);
    context.state.panelSnapshotListeners.forEach(listener => {
      try {
        listener(cloneCloudSyncPanelSnapshot(next));
      } catch (__wpErr) {
        context.deps.reportNonFatal(context.deps.App, context.panelApiOp('panelSnapshotListener'), __wpErr, {
          throttleMs: 4000,
        });
      }
    });
    return next;
  };

  const publishSite2TabsGateSnapshot = (): CloudSyncSite2TabsGateSnapshot => {
    const nextSnapshot = context.readSite2TabsGateSnapshot();
    scheduleSite2TabsGateFallbackTick(context, nextSnapshot);
    if (areCloudSyncSite2TabsGateSnapshotsEqual(context.state.site2TabsGateSnapshot, nextSnapshot)) {
      return cloneCloudSyncSite2TabsGateSnapshot(context.state.site2TabsGateSnapshot);
    }
    context.state.site2TabsGateSnapshot = nextSnapshot;
    const next = cloneCloudSyncSite2TabsGateSnapshot(context.state.site2TabsGateSnapshot);
    context.state.site2TabsGateSnapshotListeners.forEach(listener => {
      try {
        listener(cloneCloudSyncSite2TabsGateSnapshot(next));
      } catch (__wpErr) {
        context.deps.reportNonFatal(
          context.deps.App,
          context.panelApiOp('tabsGateSnapshotListener'),
          __wpErr,
          {
            throttleMs: 4000,
          }
        );
      }
    });
    return next;
  };

  return { publishPanelSnapshot, publishSite2TabsGateSnapshot };
}
