import type { CloudSyncPanelSnapshot, CloudSyncSite2TabsGateSnapshot } from '../../../types';

import {
  clearSite2TabsGateFallbackTimer,
  disposeFloatingPanelSourceSubscription,
  disposeSite2TabsGateSourceSubscription,
  ensureFloatingPanelSourceSubscription,
  ensureSite2TabsGateSourceSubscription,
  scheduleSite2TabsGateFallbackTick,
} from './cloud_sync_panel_api_snapshots_sources.js';
import { cloneCloudSyncPanelSnapshot } from './cloud_sync_panel_api_public_support.js';
import { cloneCloudSyncSite2TabsGateSnapshot } from './cloud_sync_tabs_gate_support.js';
import type { CloudSyncPanelSnapshotRuntimeContext } from './cloud_sync_panel_api_snapshots_runtime_shared.js';

export function createCloudSyncPanelSnapshotSubscriptions(context: CloudSyncPanelSnapshotRuntimeContext): {
  subscribePanelSnapshot: (fn: (snapshot: CloudSyncPanelSnapshot) => void) => () => void;
  subscribeSite2TabsGateSnapshot: (fn: (snapshot: CloudSyncSite2TabsGateSnapshot) => void) => () => void;
} {
  return {
    subscribePanelSnapshot: fn => {
      context.state.panelSnapshotListeners.add(fn);
      ensureFloatingPanelSourceSubscription(context);
      return (): void => {
        context.state.panelSnapshotListeners.delete(fn);
        if (!context.state.panelSnapshotListeners.size) disposeFloatingPanelSourceSubscription(context);
      };
    },
    subscribeSite2TabsGateSnapshot: fn => {
      context.state.site2TabsGateSnapshotListeners.add(fn);
      if (context.hasSite2TabsGateSource) ensureSite2TabsGateSourceSubscription(context);
      else scheduleSite2TabsGateFallbackTick(context, context.state.site2TabsGateSnapshot);
      return (): void => {
        context.state.site2TabsGateSnapshotListeners.delete(fn);
        if (!context.state.site2TabsGateSnapshotListeners.size) {
          disposeSite2TabsGateSourceSubscription(context);
          clearSite2TabsGateFallbackTimer(context);
        }
      };
    },
  };
}

export function readCloudSyncPanelSnapshotPublicReaders(context: CloudSyncPanelSnapshotRuntimeContext): {
  getPanelSnapshot: () => CloudSyncPanelSnapshot;
  getSite2TabsGateSnapshot: () => CloudSyncSite2TabsGateSnapshot;
} {
  return {
    getPanelSnapshot: () => cloneCloudSyncPanelSnapshot(context.state.panelSnapshot),
    getSite2TabsGateSnapshot: () => cloneCloudSyncSite2TabsGateSnapshot(context.state.site2TabsGateSnapshot),
  };
}
