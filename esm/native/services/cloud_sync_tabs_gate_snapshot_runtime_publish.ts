import type { CloudSyncSite2TabsGateSnapshot } from '../../../types';

import {
  cloneCloudSyncSite2TabsGateSnapshot,
  equalCloudSyncSite2TabsGateSnapshots,
  readCloudSyncSite2TabsGateSnapshot,
} from './cloud_sync_tabs_gate_snapshot_shared.js';
import {
  clearCloudSyncTabsGateSnapshotTimer,
  type CloudSyncTabsGateSnapshotRuntimeArgs,
} from './cloud_sync_tabs_gate_snapshot_runtime_shared.js';

export function scheduleCloudSyncTabsGateSnapshotTick(
  args: CloudSyncTabsGateSnapshotRuntimeArgs & {
    publishSnapshot: () => CloudSyncSite2TabsGateSnapshot;
  },
  nextSnapshot: CloudSyncSite2TabsGateSnapshot
): void {
  const { App, reportNonFatal, setTimeoutFn, clearTimeoutFn, state, publishSnapshot } = args;

  if (!state.listeners.size || !nextSnapshot.open || !nextSnapshot.until) {
    clearCloudSyncTabsGateSnapshotTimer({ App, reportNonFatal, clearTimeoutFn, state });
    return;
  }

  const now = Date.now();
  const remainingMs = nextSnapshot.until - now;
  if (remainingMs <= 0) {
    clearCloudSyncTabsGateSnapshotTimer({ App, reportNonFatal, clearTimeoutFn, state });
    return;
  }

  const minutesLeft = nextSnapshot.minutesLeft > 0 ? nextSnapshot.minutesLeft : 1;
  const nextBoundaryMs = minutesLeft > 1 ? remainingMs - (minutesLeft - 1) * 60000 : remainingMs;
  const delay = Math.max(50, Math.min(Math.ceil(nextBoundaryMs) + 50, 0x7fffffff));
  const dueAt = now + delay;
  if (state.snapshotTimer && state.snapshotTimerDueAt === dueAt) return;

  clearCloudSyncTabsGateSnapshotTimer({ App, reportNonFatal, clearTimeoutFn, state });
  state.snapshotTimerDueAt = dueAt;
  state.snapshotTimer = setTimeoutFn(() => {
    state.snapshotTimer = null;
    state.snapshotTimerDueAt = 0;
    publishSnapshot();
  }, delay);
}

export function publishCloudSyncTabsGateSnapshot(
  args: CloudSyncTabsGateSnapshotRuntimeArgs & {
    publishNextTick: (nextSnapshot: CloudSyncSite2TabsGateSnapshot) => void;
  }
): CloudSyncSite2TabsGateSnapshot {
  const { App, reportNonFatal, readOpen, readUntil, state, publishNextTick } = args;
  const nextSnapshot = readCloudSyncSite2TabsGateSnapshot(readOpen(), readUntil());
  const changed = !equalCloudSyncSite2TabsGateSnapshots(state.snapshot, nextSnapshot);
  state.snapshot = nextSnapshot;
  publishNextTick(state.snapshot);
  if (changed) {
    state.listeners.forEach(listener => {
      try {
        listener(cloneCloudSyncSite2TabsGateSnapshot(state.snapshot));
      } catch (error) {
        reportNonFatal(App, 'site2TabsGate.snapshotListener', error, { throttleMs: 8000 });
      }
    });
  }
  return cloneCloudSyncSite2TabsGateSnapshot(state.snapshot);
}
