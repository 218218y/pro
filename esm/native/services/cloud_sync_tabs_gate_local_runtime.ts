import type { AppContainer, CloudSyncSite2TabsGateSnapshot } from '../../../types';

import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import { createCloudSyncTabsGateSnapshotController } from './cloud_sync_tabs_gate_snapshot.js';
import {
  createCloudSyncTabsGateLocalMutableState,
  type CloudSyncTabsGateLocalState,
} from './cloud_sync_tabs_gate_local_shared.js';
import {
  type CloudSyncTabsGateConfig,
  type CloudSyncTabsGateStorageLike,
  type CloudSyncTabsGateTimeoutApi,
} from './cloud_sync_tabs_gate_shared.js';
import { createCloudSyncTabsGateLocalBindings } from './cloud_sync_tabs_gate_local_runtime_bindings.js';
import { createCloudSyncTabsGateLocalPatchController } from './cloud_sync_tabs_gate_local_runtime_patch.js';

export type { CloudSyncTabsGateLocalState } from './cloud_sync_tabs_gate_local_shared.js';

export function createCloudSyncTabsGateLocalState(
  args: {
    App: AppContainer;
    cfg: CloudSyncTabsGateConfig;
    storage: CloudSyncTabsGateStorageLike;
    getGateBaseRoom?: () => string;
  } & CloudSyncTabsGateTimeoutApi
): CloudSyncTabsGateLocalState {
  const { App, cfg, storage, getGateBaseRoom, setTimeoutFn, clearTimeoutFn } = args;
  const state = createCloudSyncTabsGateLocalMutableState();

  const snapshotController = createCloudSyncTabsGateSnapshotController({
    App,
    reportNonFatal: _cloudSyncReportNonFatal,
    setTimeoutFn,
    clearTimeoutFn,
    readOpen: () => state.tabsGateOpenCached,
    readUntil: () => state.tabsGateUntilCached,
  });

  const bindings = createCloudSyncTabsGateLocalBindings({
    App,
    cfg,
    storage,
    getGateBaseRoom,
    state,
    snapshotController,
  });

  const patchController = createCloudSyncTabsGateLocalPatchController({
    App,
    state,
    setTimeoutFn,
    clearTimeoutFn,
    snapshotController,
  });

  return {
    ...bindings,
    getSnapshot: (): CloudSyncSite2TabsGateSnapshot => bindings.getSnapshot(),
    subscribeSnapshot: (fn: (snapshot: CloudSyncSite2TabsGateSnapshot) => void): (() => void) =>
      bindings.subscribeSnapshot(fn),
    patchSite2TabsGateUi: patchController.patchSite2TabsGateUi,
    dispose: patchController.dispose,
  };
}
