import type { AppContainer, TimeoutHandleLike, UiBootRuntimeServiceLike } from '../../../types';

import { setRuntimeSystemReady } from '../runtime/runtime_write_access.js';
import { getBrowserTimers, markPerfPoint } from '../runtime/api.js';
import { logViaPlatform } from '../runtime/platform_access.js';
import { setAutosaveAllowed } from '../runtime/autosave_access.js';
import {
  ensureUiBootRuntimeService,
  getUiBootRuntimeState,
  markUiBootDidInit,
  resetUiBootDidInit,
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
    // Reporter isolation is best-effort by definition.
  }
}

function rejectedBootRuntimeWrite(op: string): Error {
  return new Error(`[WardrobePro][uiBootRuntime] ${op} was rejected by its canonical owner.`);
}

function getUiBootReadyTimersState(App: AppContainer): UiBootReadyTimersState {
  return ensureUiBootRuntimeService(App) as UiBootReadyTimersState;
}

function writeRuntimeSystemReady(App: AppContainer, on: boolean, report?: BootReporter): boolean {
  const op = `runtime.setSystemReady(${String(on)})`;
  try {
    const result = setRuntimeSystemReady(App, on, RUNTIME_READY_META);
    if (result === false) {
      reportBootRuntimeSoft(report, op, rejectedBootRuntimeWrite(op));
      return false;
    }
    return true;
  } catch (err) {
    reportBootRuntimeSoft(report, op, err);
    return false;
  }
}

function writeAutosaveAllowed(App: AppContainer, on: boolean, report?: BootReporter): boolean {
  const op = `autosave.allow=${String(on)}`;
  try {
    if (setAutosaveAllowed(App, on)) return true;
    reportBootRuntimeSoft(report, op, rejectedBootRuntimeWrite(op));
    return false;
  } catch (err) {
    reportBootRuntimeSoft(report, op, err);
    return false;
  }
}

function clearUiBootReadyTimers(App: AppContainer, report?: BootReporter): void {
  const service = getUiBootReadyTimersState(App);
  const timers = getBrowserTimers(App);

  if (service.__systemReadyTimer != null) {
    try {
      timers.clearTimeout(service.__systemReadyTimer);
    } catch (err) {
      reportBootRuntimeSoft(report, 'timers.clearSystemReady', err);
    }
  }
  if (service.__clearBootingTimer != null) {
    try {
      timers.clearTimeout(service.__clearBootingTimer);
    } catch (err) {
      reportBootRuntimeSoft(report, 'timers.clearBooting', err);
    }
  }

  service.__systemReadyTimer = null;
  service.__clearBootingTimer = null;
  service.__readyTimersToken =
    typeof service.__readyTimersToken === 'number' ? service.__readyTimersToken + 1 : 1;
}

function clearUiBootFlags(App: AppContainer, report?: BootReporter, resetDidInit = false): void {
  try {
    setUiBootBooting(App, false);
  } catch (err) {
    reportBootRuntimeSoft(report, 'uiBootRuntime.booting=false', err);
  }
  try {
    setUiBootBuildScheduled(App, false, null);
  } catch (err) {
    reportBootRuntimeSoft(report, 'uiBootRuntime.buildScheduled=false', err);
  }
  if (resetDidInit) {
    try {
      resetUiBootDidInit(App);
    } catch (err) {
      reportBootRuntimeSoft(report, 'uiBootRuntime.didInit=false', err);
    }
  }
}

export function beginUiBootSession(App: AppContainer): boolean {
  getUiBootRuntimeState(App);
  if (!markUiBootDidInit(App)) return false;
  try {
    setUiBootBooting(App, true);
    setUiBootBuildScheduled(App, false, null);
    return true;
  } catch (err) {
    // A session that could not publish its initial flags must remain retryable.
    resetUiBootDidInit(App);
    throw err;
  }
}

export function installUiBootReadyTimers(App: AppContainer, report?: BootReporter): void {
  writeRuntimeSystemReady(App, false, report);
  writeAutosaveAllowed(App, false, report);

  clearUiBootReadyTimers(App, report);
  const timers = getBrowserTimers(App);
  const service = getUiBootReadyTimersState(App);
  const token = service.__readyTimersToken || 0;

  service.__systemReadyTimer = timers.setTimeout(() => {
    if (service.__readyTimersToken !== token) return;
    service.__systemReadyTimer = null;
    if (!writeRuntimeSystemReady(App, true, report)) return;
    if (!writeAutosaveAllowed(App, true, report)) return;
    markPerfPoint(App, 'boot.milestone.autosave-ready');
    try {
      if (!logViaPlatform(App, 'System Ready. Autosave active.')) {
        reportBootRuntimeSoft(
          report,
          'util.log(systemReady)',
          rejectedBootRuntimeWrite('util.log(systemReady)')
        );
      }
    } catch (err) {
      reportBootRuntimeSoft(report, 'util.log(systemReady)', err);
    }
  }, 1000);

  service.__clearBootingTimer = timers.setTimeout(() => {
    if (service.__readyTimersToken !== token) return;
    service.__clearBootingTimer = null;
    clearUiBootFlags(App, report);
  }, 2500);
}

export function clearUiBootRuntimeState(App: AppContainer, report?: BootReporter): void {
  try {
    clearUiBootReadyTimers(App, report);
  } catch (err) {
    reportBootRuntimeSoft(report, 'timers.clearAll', err);
  }
  clearUiBootFlags(App, report);
}

export function abortUiBootSession(App: AppContainer, report?: BootReporter): void {
  try {
    clearUiBootReadyTimers(App, report);
  } catch (err) {
    reportBootRuntimeSoft(report, 'timers.abortClearAll', err);
  }
  clearUiBootFlags(App, report, true);
  writeRuntimeSystemReady(App, false, report);
  writeAutosaveAllowed(App, false, report);
}
