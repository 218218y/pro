import { getBrowserTimers } from '../runtime/api.js';
import { idleViaPlatform } from '../runtime/platform_access.js';

import {
  cancelAutosaveScheduleState,
  ensureAutosaveScheduleState,
  getActiveAutosaveScheduleStates,
  getAutosaveScheduleStateMaybe,
  isAutosaveIdleTokenLive,
  nextAutosaveIdleToken,
  refreshAutosaveScheduleStateRegistration,
  canAutosaveRun,
} from './autosave_shared.js';
import { commitAutosaveNow } from './autosave_runtime.js';

import type { AppContainer } from '../../../types';

export function cancelAutosaveTimer(App?: AppContainer): void {
  if (App && typeof App === 'object') {
    const state = getAutosaveScheduleStateMaybe(App);
    if (state) cancelAutosaveScheduleState(state);
    return;
  }

  for (const state of getActiveAutosaveScheduleStates()) cancelAutosaveScheduleState(state);
}

export function flushAutosavePending(App: AppContainer): boolean {
  cancelAutosaveScheduleState(ensureAutosaveScheduleState(App));
  return commitAutosaveNow(App);
}

export function scheduleAutosave(App: AppContainer): void {
  if (!canAutosaveRun(App)) return;

  const state = ensureAutosaveScheduleState(App);
  if (state.timer || state.idlePending) return;

  const timers = getBrowserTimers(App);
  state.clearTimer = handle => {
    try {
      timers.clearTimeout(handle || undefined);
    } catch {
      // ignore
    }
  };
  state.clearIdleFallbackTimer = handle => {
    try {
      timers.clearTimeout(handle || undefined);
    } catch {
      // ignore
    }
  };
  state.timerDueAt = Date.now() + 4000;
  state.timer = timers.setTimeout(() => {
    state.timer = null;
    state.timerDueAt = null;
    refreshAutosaveScheduleStateRegistration(state);

    const token = nextAutosaveIdleToken(state);
    const run = () => {
      if (!isAutosaveIdleTokenLive(state, token)) return false;
      try {
        return commitAutosaveNow(App);
      } finally {
        if (Number(state.idleToken || 0) === token) state.idlePending = false;
        state.idleFallbackTimer = null;
        refreshAutosaveScheduleStateRegistration(state);
      }
    };

    try {
      if (!idleViaPlatform(App, run, 1500)) {
        const fallbackHandle = timers.setTimeout(() => {
          if (state.idleFallbackTimer === fallbackHandle) state.idleFallbackTimer = null;
          run();
        }, 0);
        state.idleFallbackTimer = fallbackHandle;
        refreshAutosaveScheduleStateRegistration(state);
      }
    } catch {
      try {
        run();
      } catch {
        // ignore
      }
    }
  }, 4000);
  refreshAutosaveScheduleStateRegistration(state);
}
