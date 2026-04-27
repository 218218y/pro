import type { AppContainer, CloudSyncSite2TabsGateSnapshot, TimeoutHandleLike } from '../../../types';

import { readCloudSyncSite2TabsGateSnapshot } from './cloud_sync_tabs_gate_snapshot_shared.js';
import type {
  CloudSyncReportNonFatal,
  CloudSyncTabsGateSnapshotControllerArgs,
} from './cloud_sync_tabs_gate_snapshot_runtime_types.js';

export type CloudSyncTabsGateSnapshotMutableState = {
  snapshotTimer: TimeoutHandleLike | null;
  snapshotTimerDueAt: number;
  listeners: Set<(snapshot: CloudSyncSite2TabsGateSnapshot) => void>;
  snapshot: CloudSyncSite2TabsGateSnapshot;
};

export type CloudSyncTabsGateSnapshotRuntimeArgs = CloudSyncTabsGateSnapshotControllerArgs & {
  state: CloudSyncTabsGateSnapshotMutableState;
};

export function createCloudSyncTabsGateSnapshotMutableState(args: {
  readOpen: () => boolean;
  readUntil: () => number;
}): CloudSyncTabsGateSnapshotMutableState {
  return {
    snapshotTimer: null,
    snapshotTimerDueAt: 0,
    listeners: new Set<(snapshot: CloudSyncSite2TabsGateSnapshot) => void>(),
    snapshot: readCloudSyncSite2TabsGateSnapshot(args.readOpen(), args.readUntil()),
  };
}

export function clearCloudSyncTabsGateSnapshotTimer(args: {
  App: AppContainer;
  reportNonFatal: CloudSyncReportNonFatal;
  clearTimeoutFn: (id: TimeoutHandleLike) => void;
  state: CloudSyncTabsGateSnapshotMutableState;
}): void {
  const { App, reportNonFatal, clearTimeoutFn, state } = args;
  try {
    if (!state.snapshotTimer) return;
    clearTimeoutFn(state.snapshotTimer);
    state.snapshotTimer = null;
    state.snapshotTimerDueAt = 0;
  } catch (error) {
    reportNonFatal(App, 'site2TabsGate.snapshotTimer.clear', error, { throttleMs: 8000 });
    state.snapshotTimer = null;
    state.snapshotTimerDueAt = 0;
  }
}
