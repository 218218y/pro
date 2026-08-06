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
import { reportServiceNonFatal } from './service_error_observability.js';

import type { AppContainer, AutosaveSuspensionLike } from '../../../types';

const DEFAULT_AUTOSAVE_DELAY_MS = 4000;

function reportAutosaveScheduleNonFatal(App: AppContainer, op: string, error: unknown): void {
  reportServiceNonFatal(
    App,
    error,
    { where: 'native/services/autosave_schedule', op },
    { consoleOutput: false }
  );
}

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

function scheduleAutosaveAfter(App: AppContainer, delayMs: number): void {
  if (!canAutosaveRun(App)) return;

  const state = ensureAutosaveScheduleState(App);
  if (state.timer || state.idlePending) return;

  const timers = getBrowserTimers(App);
  state.clearTimer = handle => {
    try {
      timers.clearTimeout(handle || undefined);
    } catch (error) {
      reportAutosaveScheduleNonFatal(App, 'clearTimer.browser', error);
    }
  };
  state.clearIdleTimeoutTimer = handle => {
    try {
      timers.clearTimeout(handle || undefined);
    } catch (error) {
      reportAutosaveScheduleNonFatal(App, 'clearIdleTimeoutTimer.browser', error);
    }
  };

  const safeDelayMs = Math.max(0, Math.floor(Number(delayMs) || 0));
  state.timerDueAt = Date.now() + safeDelayMs;

  const onTimer = () => {
    state.timer = null;
    state.timerDueAt = null;
    refreshAutosaveScheduleStateRegistration(state);

    const token = nextAutosaveIdleToken(state);
    const run = () => {
      if (!isAutosaveIdleTokenLive(state, token)) return false;
      try {
        return commitAutosaveNow(App);
      } catch (error) {
        reportAutosaveScheduleNonFatal(App, 'commitAutosaveNow', error);
        return false;
      } finally {
        if (Number(state.idleToken || 0) === token) state.idlePending = false;
        state.idleTimeoutTimer = null;
        refreshAutosaveScheduleStateRegistration(state);
      }
    };

    if (idleViaPlatform(App, run, 1500)) return;

    try {
      const idleTimeoutHandle = timers.setTimeout(() => {
        if (state.idleTimeoutTimer === idleTimeoutHandle) state.idleTimeoutTimer = null;
        run();
      }, 0);
      state.idleTimeoutTimer = idleTimeoutHandle;
      refreshAutosaveScheduleStateRegistration(state);
    } catch (error) {
      reportAutosaveScheduleNonFatal(App, 'scheduleIdleSecondary.timer', error);
      run();
    }
  };

  try {
    state.timer = timers.setTimeout(onTimer, safeDelayMs);
    refreshAutosaveScheduleStateRegistration(state);
  } catch (error) {
    state.timer = null;
    state.timerDueAt = null;
    refreshAutosaveScheduleStateRegistration(state);
    reportAutosaveScheduleNonFatal(App, 'schedule.timer', error);
  }
}

export function scheduleAutosave(App: AppContainer): void {
  scheduleAutosaveAfter(App, DEFAULT_AUTOSAVE_DELAY_MS);
}

export function suspendAutosaveSchedule(App: AppContainer): AutosaveSuspensionLike {
  const state = ensureAutosaveScheduleState(App);
  const hadPending = !!(state.timer || state.idlePending || state.idleTimeoutTimer);
  const remainingDelayMs = state.timer ? Math.max(0, Number(state.timerDueAt || Date.now()) - Date.now()) : 0;
  cancelAutosaveScheduleState(state);

  let active = true;
  return {
    commit(): void {
      active = false;
    },
    resume(): void {
      if (!active) return;
      active = false;
      if (hadPending) scheduleAutosaveAfter(App, remainingDelayMs);
    },
  };
}
