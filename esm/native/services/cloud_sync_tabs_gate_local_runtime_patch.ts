import type { AppContainer } from '../../../types';

import { _cloudSyncReportNonFatal, applyCloudSyncUiPatch, buildUiOnlyMeta } from './cloud_sync_support.js';
import type { CloudSyncTabsGateTimeoutApi } from './cloud_sync_tabs_gate_shared.js';
import type {
  CloudSyncTabsGateLocalMutableState,
  CloudSyncTabsGateLocalState,
} from './cloud_sync_tabs_gate_local_shared.js';
import { clearTabsGateExpiryTimer, scheduleTabsGateExpiry } from './cloud_sync_tabs_gate_local_timers.js';

export type CloudSyncTabsGateSnapshotControllerPatchLike = Pick<
  ReturnType<typeof import('./cloud_sync_tabs_gate_snapshot.js').createCloudSyncTabsGateSnapshotController>,
  'publishSnapshot' | 'clearSnapshotTimer' | 'disposeSnapshotController'
>;

export type CloudSyncTabsGateLocalPatchController = Pick<
  CloudSyncTabsGateLocalState,
  'patchSite2TabsGateUi' | 'dispose'
>;

export function createCloudSyncTabsGateLocalPatchController(args: {
  App: AppContainer;
  state: CloudSyncTabsGateLocalMutableState;
  setTimeoutFn: CloudSyncTabsGateTimeoutApi['setTimeoutFn'];
  clearTimeoutFn: CloudSyncTabsGateTimeoutApi['clearTimeoutFn'];
  snapshotController: CloudSyncTabsGateSnapshotControllerPatchLike;
}): CloudSyncTabsGateLocalPatchController {
  const { App, state, setTimeoutFn, clearTimeoutFn, snapshotController } = args;

  const patchSite2TabsGateUi = (open: boolean, until: number, by: string): void => {
    state.tabsGateOpenCached = !!open;
    state.tabsGateUntilCached = Number(until) || 0;

    if (state.tabsGateOpenCached && state.tabsGateUntilCached) {
      scheduleTabsGateExpiry({
        App,
        state,
        until: state.tabsGateUntilCached,
        setTimeoutFn,
        clearTimeoutFn,
        onExpire: nextUntil => patchSite2TabsGateUi(false, nextUntil, 'ttl'),
      });
    } else {
      scheduleTabsGateExpiry({
        App,
        state,
        until: 0,
        setTimeoutFn,
        clearTimeoutFn,
        onExpire: () => undefined,
      });
    }

    try {
      applyCloudSyncUiPatch(
        App,
        {
          site2TabsGateOpen: !!open,
          site2TabsGateUntil: Number(until) || 0,
          site2TabsGateBy: String(by || ''),
        },
        buildUiOnlyMeta(App, 'cloudSync:site2:tabsGate')
      );
    } catch (error) {
      _cloudSyncReportNonFatal(App, 'site2TabsGate.patchUi', error, { throttleMs: 6000 });
    }

    snapshotController.publishSnapshot();
  };

  return {
    patchSite2TabsGateUi,
    dispose: (): void => {
      try {
        clearTabsGateExpiryTimer({ App, state, clearTimeoutFn });
        snapshotController.clearSnapshotTimer();
        snapshotController.disposeSnapshotController();
      } catch (error) {
        _cloudSyncReportNonFatal(App, 'site2TabsGate.dispose', error, { throttleMs: 8000 });
      }
    },
  };
}
