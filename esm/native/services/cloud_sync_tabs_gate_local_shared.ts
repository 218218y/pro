import type { AppContainer, TimeoutHandleLike } from '../../../types';

import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import {
  SITE2_TABS_LOCAL_OPEN_KEY,
  SITE2_TABS_LOCAL_UNTIL_KEY,
  type CloudSyncTabsGateStorageLike,
} from './cloud_sync_tabs_gate_shared.js';

export type CloudSyncTabsGateLocalMutableState = {
  tabsGateOpenCached: boolean;
  tabsGateUntilCached: number;
  tabsGateExpiryTimer: TimeoutHandleLike | null;
  tabsGateExpiryDueAt: number;
};

export type CloudSyncTabsGateLocalState = {
  isTabsGateController: boolean;
  site2TabsTtlMs: number;
  getSite2TabsRoom: () => string;
  tabsGateOpenRef: { value: boolean };
  tabsGateUntilRef: { value: number };
  getSnapshot: () => import('../../../types').CloudSyncSite2TabsGateSnapshot;
  subscribeSnapshot: (
    fn: (snapshot: import('../../../types').CloudSyncSite2TabsGateSnapshot) => void
  ) => () => void;
  writeSite2TabsGateLocal: (open: boolean, until: number) => void;
  patchSite2TabsGateUi: (open: boolean, until: number, by: string) => void;
  dispose: () => void;
};

export function createCloudSyncTabsGateLocalMutableState(): CloudSyncTabsGateLocalMutableState {
  return {
    tabsGateOpenCached: false,
    tabsGateUntilCached: 0,
    tabsGateExpiryTimer: null,
    tabsGateExpiryDueAt: 0,
  };
}

export function writeSite2TabsGateLocal(args: {
  App: AppContainer;
  storage: CloudSyncTabsGateStorageLike;
  isTabsGateController: boolean;
  open: boolean;
  until: number;
}): void {
  const { App, storage, isTabsGateController, open, until } = args;
  if (!isTabsGateController) return;
  try {
    if (typeof storage.setString === 'function')
      storage.setString(SITE2_TABS_LOCAL_OPEN_KEY, open ? '1' : '0');
  } catch (error) {
    _cloudSyncReportNonFatal(App, 'site2TabsGate.writeLocal.open', error, { throttleMs: 8000 });
  }
  try {
    if (typeof storage.setString === 'function') {
      storage.setString(SITE2_TABS_LOCAL_UNTIL_KEY, String(until || 0));
    }
  } catch (error) {
    _cloudSyncReportNonFatal(App, 'site2TabsGate.writeLocal.until', error, { throttleMs: 8000 });
  }
}
