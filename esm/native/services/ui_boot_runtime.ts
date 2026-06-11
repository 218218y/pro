import type { AppContainer, TimeoutHandleLike, UiBootRuntimeServiceLike } from '../../../types';

import { setRuntimeSystemReady } from '../runtime/runtime_write_access.js';
import { getBrowserTimers } from '../runtime/api.js';
import { logViaPlatform } from '../runtime/platform_access.js';
import { setAutosaveAllowed } from '../runtime/autosave_access.js';
import {
  ensureUiBootRuntimeService,
  getUiBootRuntimeState,
  markUiBootDidInit,
  setUiBootBooting,
  setUiBootBuildScheduled,
} from '../runtime/ui_boot_state_access.js';

type BootReporter = (op: string, err: unknown) => void;

type RuntimeReadyMeta = {
  source: string;
};

type UiBootReadyTimersState = UiBootRuntimeServiceLike & {
  __readyTimersToken?: number;
  __systemReadyTimer?: TimeoutHandleLike | null;
  __clearBootingTimer?: TimeoutHandleLike | null;
};

const RUNTIME_READY_META: RuntimeReadyMeta = { source: 'ui/boot_main' };

function reportBootRuntimeSoft(report: BootReporter | undefined, op: string, err: unknown): void {
  try {
    report?.(op, err);
  } catch {
    // ignore reporter failures
  }
}

function getUiBootReadyTimersState(App: AppContainer): UiBootReadyTimersState {
  return ensureUiBootRuntimeService(App) as UiBootReadyTimersState;
}

function clearUiBootReadyTimers(App: AppContainer): void {
  const service = getUiBootReadyTimersState(App);
  const timers = getBrowserTimers(App);

  try {
    if (service.__systemReadyTimer != null) timers.clearTimeout(service.__systemReadyTimer);
  } catch {
    // ignore timer cleanup failures
  }
  try {
    if (service.__clearBootingTimer != null) timers.clearTimeout(service.__clearBootingTimer);
  } catch {
    // ignore timer cleanup failures
  }

  service.__systemReadyTimer = null;
  service.__clearBootingTimer = null;
  service.__readyTimersToken =
    typeof service.__readyTimersToken === 'number' ? service.__readyTimersToken + 1 : 1;
}

export function beginUiBootSession(App: AppContainer): boolean {
  getUiBootRuntimeState(App);
  if (!markUiBootDidInit(App)) return false;
  setUiBootBooting(App, true);
  setUiBootBuildScheduled(App, false, null);
  return true;
}

export function installUiBootReadyTimers(App: AppContainer, report?: BootReporter): void {
  try {
    setRuntimeSystemReady(App, false, RUNTIME_READY_META);
  } catch (err) {
    reportBootRuntimeSoft(report, 'runtime.setSystemReady(false)', err);
  }

  clearUiBootReadyTimers(App);
  const timers = getBrowserTimers(App);
  const service = getUiBootReadyTimersState(App);
  const token = service.__readyTimersToken || 0;

  service.__systemReadyTimer = timers.setTimeout(() => {
    if (service.__readyTimersToken !== token) return;
    service.__systemReadyTimer = null;
    try {
      setRuntimeSystemReady(App, true, RUNTIME_READY_META);
    } catch (err) {
      reportBootRuntimeSoft(report, 'runtime.setSystemReady(true)', err);
    }
    try {
      setAutosaveAllowed(App, true);
    } catch (err) {
      reportBootRuntimeSoft(report, 'autosave.allow=true', err);
    }
    try {
      logViaPlatform(App, 'System Ready. Autosave active.');
    } catch (err) {
      reportBootRuntimeSoft(report, 'util.log(systemReady)', err);
    }
  }, 1000);

  service.__clearBootingTimer = timers.setTimeout(() => {
    if (service.__readyTimersToken !== token) return;
    service.__clearBootingTimer = null;
    try {
      setUiBootBooting(App, false);
      setUiBootBuildScheduled(App, false, null);
    } catch (err) {
      reportBootRuntimeSoft(report, 'uiBootRuntime.clear', err);
    }
  }, 2500);
}

export function clearUiBootRuntimeState(App: AppContainer): void {
  try {
    clearUiBootReadyTimers(App);
  } catch {
    // ignore
  }
  try {
    setUiBootBooting(App, false);
  } catch {
    // ignore
  }
  try {
    setUiBootBuildScheduled(App, false, null);
  } catch {
    // ignore
  }
}
