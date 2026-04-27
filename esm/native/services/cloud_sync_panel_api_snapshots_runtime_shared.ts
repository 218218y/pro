import type {
  CloudSyncPanelApiDeps,
  CloudSyncPanelSnapshot,
  CloudSyncSite2TabsGateSnapshot,
  TimeoutHandleLike,
} from '../../../types';

import type { CloudSyncPanelSnapshotMutableState } from './cloud_sync_panel_api_snapshots_shared.js';

export type CloudSyncPanelSnapshotRuntimeDeps = Pick<
  CloudSyncPanelApiDeps,
  | 'App'
  | 'reportNonFatal'
  | 'subscribeFloatingSketchSyncEnabledState'
  | 'subscribeSite2TabsGateSnapshot'
  | 'now'
> & {
  setTimeoutFn: (handler: () => void, ms: number) => TimeoutHandleLike;
  clearTimeoutFn: (id: TimeoutHandleLike) => void;
};

export interface CloudSyncPanelSnapshotRuntimeContext {
  deps: CloudSyncPanelSnapshotRuntimeDeps;
  state: CloudSyncPanelSnapshotMutableState;
  panelApiOp: (name: string) => string;
  readPanelSnapshot: (roomOverride?: string | null) => CloudSyncPanelSnapshot;
  readSite2TabsGateSnapshot: () => CloudSyncSite2TabsGateSnapshot;
  publishPanelSnapshot: (roomOverride?: string | null, force?: boolean) => CloudSyncPanelSnapshot;
  publishSite2TabsGateSnapshot: () => CloudSyncSite2TabsGateSnapshot;
  hasSite2TabsGateSource: boolean;
}

export function createCloudSyncPanelSnapshotRuntimeContext(args: {
  deps: CloudSyncPanelSnapshotRuntimeDeps;
  state: CloudSyncPanelSnapshotMutableState;
  panelApiOp: (name: string) => string;
  readPanelSnapshot: (roomOverride?: string | null) => CloudSyncPanelSnapshot;
  readSite2TabsGateSnapshot: () => CloudSyncSite2TabsGateSnapshot;
}): CloudSyncPanelSnapshotRuntimeContext {
  const { deps, state, panelApiOp, readPanelSnapshot, readSite2TabsGateSnapshot } = args;
  return {
    deps,
    state,
    panelApiOp,
    readPanelSnapshot,
    readSite2TabsGateSnapshot,
    publishPanelSnapshot: () => state.panelSnapshot,
    publishSite2TabsGateSnapshot: () => state.site2TabsGateSnapshot,
    hasSite2TabsGateSource: typeof deps.subscribeSite2TabsGateSnapshot === 'function',
  };
}
