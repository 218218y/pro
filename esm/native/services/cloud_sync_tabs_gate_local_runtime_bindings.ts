import type { AppContainer } from '../../../types';

import {
  SITE2_TABS_TTL_MS,
  isCloudSyncTabsGateController,
  resolveCloudSyncTabsGateBaseRoom,
} from './cloud_sync_tabs_gate_shared.js';
import {
  writeSite2TabsGateLocal as writeSite2TabsGateLocalShared,
  type CloudSyncTabsGateLocalMutableState,
  type CloudSyncTabsGateLocalState,
} from './cloud_sync_tabs_gate_local_shared.js';
import type { CloudSyncTabsGateConfig, CloudSyncTabsGateStorageLike } from './cloud_sync_tabs_gate_shared.js';

export type CloudSyncTabsGateSnapshotControllerLike = Pick<
  ReturnType<typeof import('./cloud_sync_tabs_gate_snapshot.js').createCloudSyncTabsGateSnapshotController>,
  'readSnapshot' | 'subscribeSnapshot'
>;

export type CloudSyncTabsGateLocalBindings = Pick<
  CloudSyncTabsGateLocalState,
  | 'isTabsGateController'
  | 'site2TabsTtlMs'
  | 'getSite2TabsRoom'
  | 'tabsGateOpenRef'
  | 'tabsGateUntilRef'
  | 'getSnapshot'
  | 'subscribeSnapshot'
  | 'writeSite2TabsGateLocal'
>;

export function createCloudSyncTabsGateLocalBindings(args: {
  App: AppContainer;
  cfg: CloudSyncTabsGateConfig;
  storage: CloudSyncTabsGateStorageLike;
  getGateBaseRoom?: () => string;
  state: CloudSyncTabsGateLocalMutableState;
  snapshotController: CloudSyncTabsGateSnapshotControllerLike;
}): CloudSyncTabsGateLocalBindings {
  const { App, cfg, storage, getGateBaseRoom, state, snapshotController } = args;
  const isTabsGateController = isCloudSyncTabsGateController(App);

  return {
    isTabsGateController,
    site2TabsTtlMs: SITE2_TABS_TTL_MS,
    getSite2TabsRoom: (): string =>
      `${resolveCloudSyncTabsGateBaseRoom({ App, cfg, getGateBaseRoom })}::tabsGate`,
    tabsGateOpenRef: {
      get value(): boolean {
        return state.tabsGateOpenCached;
      },
      set value(v: boolean) {
        state.tabsGateOpenCached = !!v;
      },
    },
    tabsGateUntilRef: {
      get value(): number {
        return state.tabsGateUntilCached;
      },
      set value(v: number) {
        state.tabsGateUntilCached = Number(v) || 0;
      },
    },
    getSnapshot: () => snapshotController.readSnapshot(),
    subscribeSnapshot: fn => snapshotController.subscribeSnapshot(fn),
    writeSite2TabsGateLocal: (open: boolean, until: number): void => {
      writeSite2TabsGateLocalShared({ App, storage, isTabsGateController, open, until });
    },
  };
}
