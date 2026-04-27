import type { CloudSyncSite2TabsGateSnapshot } from '../../../types';

import { cloneCloudSyncSite2TabsGateSnapshot } from './cloud_sync_tabs_gate_snapshot_shared.js';
import type { CloudSyncTabsGateSnapshotMutableState } from './cloud_sync_tabs_gate_snapshot_runtime_shared.js';
import type { CloudSyncTabsGateSnapshotControllerArgs } from './cloud_sync_tabs_gate_snapshot_runtime_types.js';

export function subscribeCloudSyncTabsGateSnapshot(
  args: Pick<CloudSyncTabsGateSnapshotControllerArgs, 'App' | 'reportNonFatal'> & {
    state: CloudSyncTabsGateSnapshotMutableState;
    scheduleNextTick: (nextSnapshot: CloudSyncSite2TabsGateSnapshot) => void;
    clearSnapshotTimer: () => void;
  },
  fn: (snapshot: CloudSyncSite2TabsGateSnapshot) => void
): () => void {
  const { App, reportNonFatal, state, scheduleNextTick, clearSnapshotTimer } = args;
  state.listeners.add(fn);
  scheduleNextTick(state.snapshot);
  try {
    fn(cloneCloudSyncSite2TabsGateSnapshot(state.snapshot));
  } catch (error) {
    reportNonFatal(App, 'site2TabsGate.snapshotSubscribe.immediate', error, { throttleMs: 8000 });
  }
  return (): void => {
    state.listeners.delete(fn);
    if (!state.listeners.size) clearSnapshotTimer();
  };
}

export function disposeCloudSyncTabsGateSnapshotController(args: {
  state: CloudSyncTabsGateSnapshotMutableState;
  clearSnapshotTimer: () => void;
}): void {
  args.clearSnapshotTimer();
  args.state.listeners.clear();
}
