import type {
  CloudSyncPanelSnapshot,
  CloudSyncSite2TabsGateSnapshot,
  TimeoutHandleLike,
} from '../../../types';

export interface CloudSyncPanelSnapshotController {
  getPanelSnapshot: () => CloudSyncPanelSnapshot;
  subscribePanelSnapshot: (fn: (snapshot: CloudSyncPanelSnapshot) => void) => () => void;
  publishPanelSnapshot: (roomOverride?: string | null, force?: boolean) => CloudSyncPanelSnapshot;
  getSite2TabsGateSnapshot: () => CloudSyncSite2TabsGateSnapshot;
  subscribeSite2TabsGateSnapshot: (fn: (snapshot: CloudSyncSite2TabsGateSnapshot) => void) => () => void;
  publishSite2TabsGateSnapshot: () => CloudSyncSite2TabsGateSnapshot;
}

export interface CloudSyncPanelSnapshotMutableState {
  panelSnapshot: CloudSyncPanelSnapshot;
  panelSnapshotListeners: Set<(snapshot: CloudSyncPanelSnapshot) => void>;
  site2TabsGateSnapshot: CloudSyncSite2TabsGateSnapshot;
  site2TabsGateSnapshotListeners: Set<(snapshot: CloudSyncSite2TabsGateSnapshot) => void>;
  site2TabsGateFallbackTimer: TimeoutHandleLike | null;
  site2TabsGateFallbackScheduleKey: string;
  disposeFloatingPanelSource: null | (() => void);
  disposeSite2TabsGateSource: null | (() => void);
}

export function createCloudSyncPanelSnapshotMutableState(
  readPanelSnapshot: (roomOverride?: string | null) => CloudSyncPanelSnapshot,
  readSite2TabsGateSnapshot: () => CloudSyncSite2TabsGateSnapshot
): CloudSyncPanelSnapshotMutableState {
  return {
    panelSnapshot: readPanelSnapshot(),
    panelSnapshotListeners: new Set<(snapshot: CloudSyncPanelSnapshot) => void>(),
    site2TabsGateSnapshot: readSite2TabsGateSnapshot(),
    site2TabsGateSnapshotListeners: new Set<(snapshot: CloudSyncSite2TabsGateSnapshot) => void>(),
    site2TabsGateFallbackTimer: null,
    site2TabsGateFallbackScheduleKey: '',
    disposeFloatingPanelSource: null,
    disposeSite2TabsGateSource: null,
  };
}

export function buildSite2TabsGateFallbackScheduleKey(snapshot: CloudSyncSite2TabsGateSnapshot): string {
  return `${snapshot.open ? 1 : 0}:${Number(snapshot.until) || 0}:${Number(snapshot.minutesLeft) || 0}`;
}
