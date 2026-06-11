import type { CloudSyncPanelApiDeps } from '../../../types';

import { getBrowserTimers } from '../runtime/api.js';
import { buildCloudSyncPanelApiOp } from './cloud_sync_panel_api_support.js';
import { createCloudSyncPanelSnapshotReaders } from './cloud_sync_panel_api_snapshots_reads.js';
import {
  createCloudSyncPanelSnapshotMutableState,
  type CloudSyncPanelSnapshotController,
} from './cloud_sync_panel_api_snapshots_shared.js';
import { createCloudSyncPanelSnapshotPublishers } from './cloud_sync_panel_api_snapshots_publish_runtime.js';
import {
  createCloudSyncPanelSnapshotRuntimeContext,
  type CloudSyncPanelSnapshotRuntimeDeps,
} from './cloud_sync_panel_api_snapshots_runtime_shared.js';
import {
  createCloudSyncPanelSnapshotSubscriptions,
  readCloudSyncPanelSnapshotPublicReaders,
} from './cloud_sync_panel_api_snapshots_subscription_runtime.js';

export function createCloudSyncPanelSnapshotController(
  deps: CloudSyncPanelApiDeps
): CloudSyncPanelSnapshotController {
  const timers = getBrowserTimers(deps.App);
  const runtimeDeps: CloudSyncPanelSnapshotRuntimeDeps = {
    App: deps.App,
    reportNonFatal: deps.reportNonFatal,
    subscribeFloatingSketchSyncEnabledState: deps.subscribeFloatingSketchSyncEnabledState,
    subscribeSite2TabsGateSnapshot: deps.subscribeSite2TabsGateSnapshot,
    now: deps.now,
    setTimeoutFn: typeof deps.setTimeoutFn === 'function' ? deps.setTimeoutFn : timers.setTimeout,
    clearTimeoutFn: typeof deps.clearTimeoutFn === 'function' ? deps.clearTimeoutFn : timers.clearTimeout,
  };
  const panelApiOp = (name: string): string => buildCloudSyncPanelApiOp(name);
  const { readPanelSnapshot, readSite2TabsGateSnapshot } = createCloudSyncPanelSnapshotReaders(deps);
  const state = createCloudSyncPanelSnapshotMutableState(readPanelSnapshot, readSite2TabsGateSnapshot);
  const context = createCloudSyncPanelSnapshotRuntimeContext({
    deps: runtimeDeps,
    state,
    panelApiOp,
    readPanelSnapshot,
    readSite2TabsGateSnapshot,
  });
  const { publishPanelSnapshot, publishSite2TabsGateSnapshot } =
    createCloudSyncPanelSnapshotPublishers(context);
  context.publishPanelSnapshot = publishPanelSnapshot;
  context.publishSite2TabsGateSnapshot = publishSite2TabsGateSnapshot;
  return {
    ...readCloudSyncPanelSnapshotPublicReaders(context),
    ...createCloudSyncPanelSnapshotSubscriptions(context),
    publishPanelSnapshot,
    publishSite2TabsGateSnapshot,
  };
}
