import type { AppContainer } from '../../../../types';

import { getBrowserTimers } from '../../services/api.js';

export type SidebarBackgroundExitTimeoutHandle = ReturnType<
  ReturnType<typeof getBrowserTimers>['setTimeout']
>;

export type SidebarBackgroundExitState = {
  token: number;
  timeoutHandle: SidebarBackgroundExitTimeoutHandle | null;
};

export function createSidebarBackgroundExitState(): SidebarBackgroundExitState {
  return {
    token: 0,
    timeoutHandle: null,
  };
}

export function clearSidebarBackgroundExit(App: AppContainer, state: SidebarBackgroundExitState): void {
  state.token += 1;
  const handle = state.timeoutHandle;
  state.timeoutHandle = null;
  if (handle == null) return;
  try {
    getBrowserTimers(App).clearTimeout(handle);
  } catch {
    // ignore
  }
}

export function scheduleSidebarBackgroundExit(args: {
  App: AppContainer;
  state: SidebarBackgroundExitState;
  exitPrimaryMode: () => void;
}): void {
  const { App, state, exitPrimaryMode } = args;

  clearSidebarBackgroundExit(App, state);

  const token = state.token;
  const timers = getBrowserTimers(App);
  const runExit = () => {
    if (state.token !== token) return;
    state.timeoutHandle = null;
    exitPrimaryMode();
  };

  if (typeof timers.queueMicrotask === 'function') {
    timers.queueMicrotask(runExit);
    return;
  }

  const timeoutHandle = timers.setTimeout(() => {
    if (state.token !== token || state.timeoutHandle !== timeoutHandle) return;
    runExit();
  }, 0);
  state.timeoutHandle = timeoutHandle;
}
