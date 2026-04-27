import { readRuntimeScalarOrDefaultFromApp } from '../runtime/runtime_selectors.js';
import { getStorageKey, setStorageString } from '../runtime/storage_access.js';
import {
  ensureAutosaveService,
  getAutosaveServiceMaybe,
  readAutosaveInfoFromStorage,
} from '../runtime/autosave_access.js';
import { cloneProjectJson as cloneProjectJsonSafe } from '../io/project_payload_shared.js';
import { asRecord, createNullRecord } from '../runtime/record.js';
import { setUiScalarSoft } from '../runtime/ui_write_access.js';

import type {
  AppContainer,
  AutosaveServiceLike,
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
  idleFallbackTimer?: TimeoutHandleLike | null;
  clearTimer?: ((handle?: TimeoutHandleLike | null) => void) | null;
  clearIdleFallbackTimer?: ((handle?: TimeoutHandleLike | null) => void) | null;
};

const activeScheduleStates = new Set<AutosaveScheduleState>();

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
  state.idleFallbackTimer = null;
  state.clearTimer = null;
  state.clearIdleFallbackTimer = null;
  return state;
}

export function refreshAutosaveScheduleStateRegistration(state: AutosaveScheduleState): void {
  if (state.timer || state.idlePending || state.idleFallbackTimer) {
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
  return isAutosaveScheduleState(state) ? state : null;
}

export function ensureAutosaveScheduleState(App: AppContainer): AutosaveScheduleState {
  const service = ensureAutosaveService(App);
  const current = isAutosaveScheduleState(service.__scheduleState) ? service.__scheduleState : null;
  if (current) return current;
  const next = createAutosaveScheduleState();
  service.__scheduleState = next;
  return next;
}

export function clearAutosaveScheduleTimer(state: AutosaveScheduleState): void {
  const timer = state.timer;
  const idleFallbackTimer = state.idleFallbackTimer;

  if (timer) {
    try {
      state.clearTimer?.(timer);
    } catch {
      // ignore timer cleanup failures
    }
  }

  if (idleFallbackTimer) {
    try {
      state.clearIdleFallbackTimer?.(idleFallbackTimer);
    } catch {
      // ignore timer cleanup failures
    }
  }

  state.timer = null;
  state.timerDueAt = null;
  state.idleFallbackTimer = null;
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
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return cloneProjectJsonSafe(obj) as T;
  }
}

export function stampAutosaveInfoUi(App: AppContainer, info: AutosaveSnapshotLike): void {
  const out: UnknownRecord = {
    timestamp: typeof info.timestamp === 'number' ? info.timestamp : Date.now(),
    dateString: typeof info.dateString === 'string' ? info.dateString : '',
  };

  try {
    setUiScalarSoft(App, 'autosaveInfo', out, { source: 'autosave:info' });
  } catch {
    // ignore
  }
}

export function canAutosaveRun(App: AppContainer): boolean {
  try {
    const ready = !!readRuntimeScalarOrDefaultFromApp(App, 'systemReady', false);
    if (!ready) return false;

    const restoring = !!readRuntimeScalarOrDefaultFromApp(App, 'restoring', false);
    if (restoring) return false;
  } catch {
    return false;
  }

  return true;
}

export function getAutosaveStorageKey(App: AppContainer): string {
  return getStorageKey(App, 'AUTOSAVE_LATEST', 'wardrobe_autosave_latest');
}

export function writeAutosavePayloadToStorage(
  App: AppContainer,
  key: string,
  payload: AutosaveSnapshotLike
): boolean {
  try {
    return setStorageString(App, key, JSON.stringify(payload));
  } catch {
    return false;
  }
}

export function bootstrapAutosaveInfoUi(App: AppContainer): void {
  try {
    const info = readAutosaveInfoFromStorage(App);
    if (info) stampAutosaveInfoUi(App, info);
  } catch {
    // ignore
  }
}
