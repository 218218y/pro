import type { ActionMetaLike, AppContainer, TimeoutHandleLike } from '../../../types';

import { getBrowserTimers } from './api.js';
import { reportError } from './errors.js';
import { patchRuntime } from './runtime_write_access.js';

export type DimensionRuntimePatch = {
  wardrobeWidthM: number;
  wardrobeHeightM: number;
  wardrobeDepthM: number;
  wardrobeDoorsCount?: number;
};

export type DimensionRuntimeSyncResult = {
  scheduled: boolean;
  flushed: boolean;
};

type DimensionRuntimeSyncState = {
  timer: TimeoutHandleLike | undefined;
  token: number;
  patch: DimensionRuntimePatch | null;
  meta: ActionMetaLike | undefined;
};

const DIMENSION_RUNTIME_SYNC_DELAY_MS = 90;
const dimensionRuntimeSyncStates = new WeakMap<object, DimensionRuntimeSyncState>();

function reportDimensionRuntimeSyncFailure(App: unknown, op: string, error: unknown): void {
  reportError(
    App,
    error,
    { where: 'native/runtime/dimension_sync_coalescer', op, fatal: false },
    { consoleOutput: false }
  );
}

function createRuntimePatchRejectedError(): Error {
  return new Error('[dimension_sync] runtime.patch rejected the dimension synchronization');
}

export function isDimensionBurstActiveId(value: unknown): boolean {
  const id = typeof value === 'string' ? value.trim() : '';
  return id === 'width' || id === 'height' || id === 'depth' || id === 'doors';
}

function isObjectLike(value: unknown): value is object {
  return !!value && typeof value === 'object';
}

function clonePatch(patch: DimensionRuntimePatch): DimensionRuntimePatch {
  return { ...patch };
}

function cloneMeta(meta?: ActionMetaLike): ActionMetaLike | undefined {
  return meta ? { ...meta } : undefined;
}

function readDelayMs(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : DIMENSION_RUNTIME_SYNC_DELAY_MS;
}

function getSyncState(App: AppContainer): DimensionRuntimeSyncState {
  let state = dimensionRuntimeSyncStates.get(App);
  if (!state) {
    state = {
      timer: undefined,
      token: 0,
      patch: null,
      meta: undefined,
    };
    dimensionRuntimeSyncStates.set(App, state);
  }
  return state;
}

function clearSyncTimer(App: AppContainer, state: DimensionRuntimeSyncState): boolean {
  if (typeof state.timer === 'undefined') return true;
  const timer = state.timer;
  state.timer = undefined;
  try {
    getBrowserTimers(App).clearTimeout(timer);
    return true;
  } catch (error) {
    reportDimensionRuntimeSyncFailure(App, 'timer.clear', error);
    return false;
  }
}

function applyRuntimePatch(
  App: AppContainer,
  patch: DimensionRuntimePatch,
  meta: ActionMetaLike | undefined
): boolean {
  try {
    const result = patchRuntime(App, patch, meta);
    if (result === false) {
      reportDimensionRuntimeSyncFailure(App, 'runtimePatch.rejected', createRuntimePatchRejectedError());
      return false;
    }
    return true;
  } catch (error) {
    reportDimensionRuntimeSyncFailure(App, 'runtimePatch.ownerRejected', error);
    return false;
  }
}

function flushState(App: AppContainer, state: DimensionRuntimeSyncState): boolean {
  clearSyncTimer(App, state);
  const patch = state.patch;
  if (!patch) return false;

  const meta = state.meta;
  state.patch = null;
  state.meta = undefined;
  return applyRuntimePatch(App, patch, meta);
}

export function flushDimensionRuntimeSync(App: AppContainer): boolean {
  if (!isObjectLike(App)) return false;
  const state = dimensionRuntimeSyncStates.get(App);
  return state ? flushState(App, state) : false;
}

function flushDimensionRuntimeSyncToken(App: AppContainer, token: number): void {
  const state = dimensionRuntimeSyncStates.get(App);
  if (!state || state.token !== token) return;
  state.timer = undefined;
  void flushState(App, state);
}

export function syncDimensionRuntimePatch(
  App: AppContainer,
  patch: DimensionRuntimePatch,
  meta?: ActionMetaLike,
  opts?: { activeId?: unknown; delayMs?: number }
): DimensionRuntimeSyncResult {
  if (!isObjectLike(App)) {
    return { scheduled: false, flushed: applyRuntimePatch(App, patch, meta) };
  }

  const state = getSyncState(App);
  if (!isDimensionBurstActiveId(opts?.activeId)) {
    clearSyncTimer(App, state);
    state.patch = null;
    state.meta = undefined;
    return { scheduled: false, flushed: applyRuntimePatch(App, patch, meta) };
  }

  state.patch = clonePatch(patch);
  state.meta = cloneMeta(meta);
  state.token += 1;
  const token = state.token;
  clearSyncTimer(App, state);

  try {
    state.timer = getBrowserTimers(App).setTimeout(() => {
      flushDimensionRuntimeSyncToken(App, token);
    }, readDelayMs(opts?.delayMs));
    return { scheduled: true, flushed: false };
  } catch (error) {
    state.timer = undefined;
    reportDimensionRuntimeSyncFailure(App, 'timer.schedule', error);
    return { scheduled: false, flushed: flushState(App, state) };
  }
}
