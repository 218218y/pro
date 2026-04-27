import type { CloudSyncSite2TabsGateSnapshot } from '../../../types';

import type { CloudSyncTabsGateSnapshotControllerArgs } from './cloud_sync_tabs_gate_snapshot_runtime_types.js';
import { cloneCloudSyncSite2TabsGateSnapshot } from './cloud_sync_tabs_gate_snapshot_shared.js';
import {
  createCloudSyncTabsGateSnapshotMutableState,
  clearCloudSyncTabsGateSnapshotTimer,
  type CloudSyncTabsGateSnapshotRuntimeArgs,
} from './cloud_sync_tabs_gate_snapshot_runtime_shared.js';
import {
  publishCloudSyncTabsGateSnapshot,
  scheduleCloudSyncTabsGateSnapshotTick,
} from './cloud_sync_tabs_gate_snapshot_runtime_publish.js';
import {
  disposeCloudSyncTabsGateSnapshotController,
  subscribeCloudSyncTabsGateSnapshot,
} from './cloud_sync_tabs_gate_snapshot_runtime_subscription.js';

export type {
  CloudSyncTabsGateSnapshotControllerArgs,
  CloudSyncReportNonFatal,
} from './cloud_sync_tabs_gate_snapshot_runtime_types.js';

export function createCloudSyncTabsGateSnapshotController(args: CloudSyncTabsGateSnapshotControllerArgs) {
  const state = createCloudSyncTabsGateSnapshotMutableState(args);
  const runtimeArgs: CloudSyncTabsGateSnapshotRuntimeArgs = { ...args, state };

  const clearSnapshotTimer = (): void =>
    clearCloudSyncTabsGateSnapshotTimer({
      App: args.App,
      reportNonFatal: args.reportNonFatal,
      clearTimeoutFn: args.clearTimeoutFn,
      state,
    });

  const publishSnapshot = (): CloudSyncSite2TabsGateSnapshot =>
    publishCloudSyncTabsGateSnapshot({
      ...runtimeArgs,
      publishNextTick: nextSnapshot =>
        scheduleCloudSyncTabsGateSnapshotTick({ ...runtimeArgs, publishSnapshot }, nextSnapshot),
    });

  return {
    publishSnapshot,
    readSnapshot: (): CloudSyncSite2TabsGateSnapshot => cloneCloudSyncSite2TabsGateSnapshot(state.snapshot),
    subscribeSnapshot: (fn: (snapshot: CloudSyncSite2TabsGateSnapshot) => void): (() => void) =>
      subscribeCloudSyncTabsGateSnapshot(
        {
          App: args.App,
          reportNonFatal: args.reportNonFatal,
          state,
          scheduleNextTick: nextSnapshot =>
            scheduleCloudSyncTabsGateSnapshotTick({ ...runtimeArgs, publishSnapshot }, nextSnapshot),
          clearSnapshotTimer,
        },
        fn
      ),
    clearSnapshotTimer,
    disposeSnapshotController: (): void =>
      disposeCloudSyncTabsGateSnapshotController({
        state,
        clearSnapshotTimer,
      }),
  };
}
