import type { AppContainer } from '../../../types';

import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import type { CloudSyncTabsGateTimeoutApi } from './cloud_sync_tabs_gate_shared.js';
import type { CloudSyncTabsGateLocalMutableState } from './cloud_sync_tabs_gate_local_shared.js';

export function clearTabsGateExpiryTimer(args: {
  App: AppContainer;
  state: CloudSyncTabsGateLocalMutableState;
  clearTimeoutFn: CloudSyncTabsGateTimeoutApi['clearTimeoutFn'];
}): void {
  const { App, state, clearTimeoutFn } = args;
  try {
    if (!state.tabsGateExpiryTimer) return;
    clearTimeoutFn(state.tabsGateExpiryTimer);
    state.tabsGateExpiryTimer = null;
    state.tabsGateExpiryDueAt = 0;
  } catch (error) {
    _cloudSyncReportNonFatal(App, 'site2TabsGate.scheduleExpiry.clearTimer', error, { throttleMs: 8000 });
    state.tabsGateExpiryTimer = null;
    state.tabsGateExpiryDueAt = 0;
  }
}

export function scheduleTabsGateExpiry(args: {
  App: AppContainer;
  state: CloudSyncTabsGateLocalMutableState;
  until: number;
  setTimeoutFn: CloudSyncTabsGateTimeoutApi['setTimeoutFn'];
  clearTimeoutFn: CloudSyncTabsGateTimeoutApi['clearTimeoutFn'];
  onExpire: (until: number) => void;
}): void {
  const { App, state, until, setTimeoutFn, clearTimeoutFn, onExpire } = args;
  const nextUntil = Number(until) || 0;
  if (!nextUntil) {
    clearTabsGateExpiryTimer({ App, state, clearTimeoutFn });
    return;
  }

  const now = Date.now();
  if (nextUntil <= now) {
    clearTabsGateExpiryTimer({ App, state, clearTimeoutFn });
    return;
  }

  const dueAt = nextUntil + 50;
  if (state.tabsGateExpiryTimer && state.tabsGateExpiryDueAt === dueAt) return;

  clearTabsGateExpiryTimer({ App, state, clearTimeoutFn });
  const delay = Math.max(0, Math.min(dueAt - now, 0x7fffffff));
  state.tabsGateExpiryDueAt = dueAt;
  state.tabsGateExpiryTimer = setTimeoutFn(() => {
    state.tabsGateExpiryTimer = null;
    state.tabsGateExpiryDueAt = 0;
    state.tabsGateOpenCached = false;
    state.tabsGateUntilCached = nextUntil;
    onExpire(nextUntil);
  }, delay);
}
