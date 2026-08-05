import { readRootState } from '../runtime/root_state_access.js';
import { ensureHistoryService, getHistorySystemMaybe } from '../runtime/history_system_access.js';
import { getBrowserTimers } from '../runtime/api.js';
import { reportServiceNonFatal } from './service_error_observability.js';

import type {
  ActionMetaLike,
  AppContainer,
  HistoryServiceLike,
  HistorySystemLike,
  TimeoutHandleLike,
  UnknownRecord,
} from '../../../types';

export function reportHistoryRuntimeNonFatal(App: AppContainer, op: string, error: unknown): void {
  reportServiceNonFatal(App, error, { where: 'native/services/history_runtime', op });
}

function reportHistorySharedNonFatal(
  App: AppContainer,
  op: string,
  error: unknown,
  consoleOutput = false
): void {
  reportServiceNonFatal(App, error, { where: 'native/services/history_shared', op }, { consoleOutput });
}

export function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function normalizePendingAction(v: unknown): ActionMetaLike | null {
  if (!isRecord(v)) return null;
  try {
    return Object.keys(v).length > 0 ? v : null;
  } catch {
    return null;
  }
}

export type HistoryRuntimeState = {
  timer: TimeoutHandleLike | null;
  gen: number;
  pendingAction: ActionMetaLike | null;
};

export type InstallableHistoryServiceLike = HistoryServiceLike & {
  hasPendingPush?: () => boolean;
  __runtimeState?: HistoryRuntimeState;
};

export function createHistoryRuntimeState(): HistoryRuntimeState {
  return {
    timer: null,
    gen: 0,
    pendingAction: null,
  };
}

export function readHistoryService(value: unknown): InstallableHistoryServiceLike | null {
  return isRecord(value) ? value : null;
}

export function isTimeoutHandle(value: unknown): value is TimeoutHandleLike {
  return value != null && (typeof value === 'number' || typeof value === 'object');
}

export function readTimeoutHandle(value: unknown): TimeoutHandleLike | null {
  return isTimeoutHandle(value) ? value : null;
}

export function ensureInstallableHistoryService(App: AppContainer): InstallableHistoryServiceLike | null {
  if (!App || typeof App !== 'object') return null;
  return readHistoryService(ensureHistoryService(App));
}

export function readHistoryRuntimeState(value: unknown): HistoryRuntimeState | null {
  const rec = isRecord(value) ? value : null;
  if (!rec) return null;
  return {
    timer: readTimeoutHandle(rec.timer),
    gen: typeof rec.gen === 'number' ? rec.gen : 0,
    pendingAction: normalizePendingAction(rec.pendingAction),
  };
}

export function ensureHistoryRuntimeState(App: AppContainer): HistoryRuntimeState | null {
  const svc = ensureInstallableHistoryService(App);
  if (!svc) return null;

  const existing = readHistoryRuntimeState(svc.__runtimeState);
  if (existing) {
    svc.__runtimeState = existing;
    return existing;
  }

  const next = createHistoryRuntimeState();
  svc.__runtimeState = next;
  return next;
}

export function getHistoryRuntimeStateMaybe(App: AppContainer): HistoryRuntimeState | null {
  const svc = ensureInstallableHistoryService(App);
  return svc ? readHistoryRuntimeState(svc.__runtimeState) : null;
}

export function isRestoring(App: AppContainer): boolean {
  try {
    const st = readRootState(App);
    if (st.runtime?.restoring === true) return true;
  } catch (error) {
    reportHistorySharedNonFatal(App, 'isRestoring.readRootState', error, true);
  }
  return false;
}

export function getHistorySystem(App: AppContainer): HistorySystemLike | null {
  return getHistorySystemMaybe(App);
}

export function hasPendingPush(App: AppContainer): boolean {
  const state = getHistoryRuntimeStateMaybe(App);
  return !!state && (state.timer != null || state.pendingAction != null);
}

export function clearHistoryTimer(App: AppContainer, state: HistoryRuntimeState): void {
  if (state.timer == null) return;

  try {
    const timers = getBrowserTimers(App);
    timers.clearTimeout(state.timer);
  } catch (error) {
    reportHistorySharedNonFatal(App, 'clearTimer.browser', error);
    try {
      clearTimeout(state.timer);
    } catch (globalError) {
      reportHistorySharedNonFatal(App, 'clearTimer.globalTimer', globalError, true);
    }
  }
  state.timer = null;
}
