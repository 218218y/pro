import { readRuntimeScalarOrDefault, readRuntimeStateFromAppResult } from '../runtime/runtime_selectors.js';
import { getStorageKey, setStorageString } from '../runtime/storage_access.js';
import {
  ensureAutosaveService,
  getAutosaveServiceMaybe,
  readAutosaveInfoFromStorage,
} from '../runtime/autosave_access.js';
import { cloneProjectJson as cloneProjectJsonSafe } from '../../shared/project_json_clone.js';
import { asRecord, createNullRecord } from '../runtime/record.js';
import { setUiScalarSoft } from '../runtime/ui_write_access.js';
import { reportServiceNonFatal } from './service_error_observability.js';

import type {
  AppContainer,
  AutosaveServiceLike,
  AutosaveReadinessDiagnosticDetail,
  AutosaveSnapshotLike,
  TimeoutHandleLike,
  UnknownRecord,
} from '../../../types';

export type HistorySnapshotSourceLike = UnknownRecord & {
  getCurrentSnapshot?: () => string;
};

export type AutosaveScheduleState = UnknownRecord & {
  timer?: TimeoutHandleLike | null;
  timerDueAt?: number | null;
  idlePending?: boolean;
  idleToken?: number;
  idleTimeoutTimer?: TimeoutHandleLike | null;
  clearTimer?: ((handle?: TimeoutHandleLike | null) => void) | null;
  clearIdleTimeoutTimer?: ((handle?: TimeoutHandleLike | null) => void) | null;
};

export type AutosaveStorageWriteResult =
  { ok: true } | { ok: false; reason: 'storage-rejected' | 'storage-threw' };

const activeScheduleStates = new Set<AutosaveScheduleState>();
const autosaveScheduleOwners = new WeakMap<object, AppContainer>();

function reportAutosaveSharedNonFatal(
  App: AppContainer,
  op: string,
  error: unknown,
  consoleOutput = false
): void {
  reportServiceNonFatal(App, error, { where: 'native/services/autosave_shared', op }, { consoleOutput });
}

function reportAutosaveScheduleStateNonFatal(state: AutosaveScheduleState, op: string, error: unknown): void {
  const App = autosaveScheduleOwners.get(state);
  if (App) reportAutosaveSharedNonFatal(App, op, error);
}

function registerAutosaveScheduleOwner(state: AutosaveScheduleState, App: AppContainer): void {
  autosaveScheduleOwners.set(state, App);
}

export function isAutosaveSnapshotLike(value: unknown): value is AutosaveSnapshotLike {
  return !!asRecord(value);
}

export function isAutosaveServiceLike(value: unknown): value is AutosaveServiceLike {
  return !!asRecord(value);
}

export function isHistorySnapshotSourceLike(value: unknown): value is HistorySnapshotSourceLike {
  const rec = asRecord(value);
  return !!(rec && typeof rec.getCurrentSnapshot === 'function');
}

export function isAutosaveScheduleState(value: unknown): value is AutosaveScheduleState {
  return !!asRecord<AutosaveScheduleState>(value);
}

export function createAutosaveScheduleState(): AutosaveScheduleState {
  const state = createNullRecord<AutosaveScheduleState>();
  state.timer = null;
  state.timerDueAt = null;
  state.idlePending = false;
  state.idleToken = 0;
  state.idleTimeoutTimer = null;
  state.clearTimer = null;
  state.clearIdleTimeoutTimer = null;
  return state;
}

export function refreshAutosaveScheduleStateRegistration(state: AutosaveScheduleState): void {
  if (state.timer || state.idlePending || state.idleTimeoutTimer) {
    activeScheduleStates.add(state);
    return;
  }
  activeScheduleStates.delete(state);
}

export function getActiveAutosaveScheduleStates(): AutosaveScheduleState[] {
  return [...activeScheduleStates];
}

export function getAutosaveScheduleStateMaybe(App: AppContainer): AutosaveScheduleState | null {
  const service = getAutosaveServiceMaybe(App);
  const state = service ? service.__scheduleState : null;
  if (!isAutosaveScheduleState(state)) return null;
  registerAutosaveScheduleOwner(state, App);
  return state;
}

export function ensureAutosaveScheduleState(App: AppContainer): AutosaveScheduleState {
  const service = ensureAutosaveService(App);
  const current = isAutosaveScheduleState(service.__scheduleState) ? service.__scheduleState : null;
  if (current) {
    registerAutosaveScheduleOwner(current, App);
    return current;
  }
  const next = createAutosaveScheduleState();
  registerAutosaveScheduleOwner(next, App);
  service.__scheduleState = next;
  return next;
}

export function clearAutosaveScheduleTimer(state: AutosaveScheduleState): void {
  const timer = state.timer;
  const idleTimeoutTimer = state.idleTimeoutTimer;

  if (timer) {
    try {
      state.clearTimer?.(timer);
    } catch (error) {
      reportAutosaveScheduleStateNonFatal(state, 'clearTimer.callback', error);
    }
  }

  if (idleTimeoutTimer) {
    try {
      state.clearIdleTimeoutTimer?.(idleTimeoutTimer);
    } catch (error) {
      reportAutosaveScheduleStateNonFatal(state, 'clearIdleTimeoutTimer.callback', error);
    }
  }

  state.timer = null;
  state.timerDueAt = null;
  state.idleTimeoutTimer = null;
  refreshAutosaveScheduleStateRegistration(state);
}

export function cancelAutosaveScheduleState(state: AutosaveScheduleState): void {
  clearAutosaveScheduleTimer(state);
  state.idleToken = Number(state.idleToken || 0) + 1;
  state.idlePending = false;
  refreshAutosaveScheduleStateRegistration(state);
}

export function nextAutosaveIdleToken(state: AutosaveScheduleState): number {
  const next = Number(state.idleToken || 0) + 1;
  state.idleToken = next;
  state.idlePending = true;
  refreshAutosaveScheduleStateRegistration(state);
  return next;
}

export function isAutosaveIdleTokenLive(state: AutosaveScheduleState, token: number): boolean {
  return !!state.idlePending && Number(state.idleToken || 0) === token;
}

export function deepCloneJson<T>(obj: T): T {
  return cloneProjectJsonSafe(obj) as T;
}

export function stampAutosaveInfoUi(App: AppContainer, info: AutosaveSnapshotLike): void {
  const out: UnknownRecord = {
    timestamp: typeof info.timestamp === 'number' ? info.timestamp : Date.now(),
    dateString: typeof info.dateString === 'string' ? info.dateString : '',
  };

  try {
    setUiScalarSoft(App, 'autosaveInfo', out, { source: 'autosave:info' });
  } catch (error) {
    reportAutosaveSharedNonFatal(App, 'stampInfoUi', error);
  }
}

export type AutosaveReadinessResult = { ok: true } | { ok: false; detail: AutosaveReadinessDiagnosticDetail };

export function readAutosaveReadiness(App: AppContainer): AutosaveReadinessResult {
  try {
    const runtimeState = readRuntimeStateFromAppResult(App);
    if (runtimeState.ok === false) return { ok: false, detail: runtimeState.reason };

    const ready = !!readRuntimeScalarOrDefault(runtimeState.state, 'systemReady', false);
    if (!ready) return { ok: false, detail: 'system-not-ready' };

    const restoring = !!readRuntimeScalarOrDefault(runtimeState.state, 'restoring', false);
    if (restoring) return { ok: false, detail: 'restore-in-progress' };
  } catch (error) {
    reportAutosaveSharedNonFatal(App, 'readReadiness.runtimeState', error);
    return { ok: false, detail: 'runtime-state-unavailable' };
  }

  return { ok: true };
}

export function canAutosaveRun(App: AppContainer): boolean {
  return readAutosaveReadiness(App).ok;
}

export function getAutosaveStorageKey(App: AppContainer): string {
  return getStorageKey(App, 'AUTOSAVE_LATEST', 'wardrobe_autosave_latest');
}

export function writeAutosavePayloadToStorage(
  App: AppContainer,
  key: string,
  payload: AutosaveSnapshotLike
): AutosaveStorageWriteResult {
  try {
    return setStorageString(App, key, JSON.stringify(payload))
      ? { ok: true }
      : { ok: false, reason: 'storage-rejected' };
  } catch (error) {
    reportAutosaveSharedNonFatal(App, 'writeStorage.exception', error);
    return { ok: false, reason: 'storage-threw' };
  }
}

export function bootstrapAutosaveInfoUi(App: AppContainer): void {
  try {
    const info = readAutosaveInfoFromStorage(App);
    if (info) stampAutosaveInfoUi(App, info);
  } catch (error) {
    reportAutosaveSharedNonFatal(App, 'bootstrapInfo.readStorage', error);
  }
}
