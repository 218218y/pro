// State + browser/runtime seams for the doors service surface.
//
// Keeps mutable service-owned state, browser CSS sync, and render-touch helpers
// separate from the canonical runtime helper utilities.

import type {
  DoorsCaptureLocalOpenOptionsLike,
  DoorsReleaseEditHoldOptionsLike,
  DoorsSetOpenOptionsLike,
  DoorsSyncVisualsOptionsLike,
  UnknownRecord,
} from '../../../types';

import { getDoorsRuntime } from '../runtime/doors_access.js';
import { readRuntimeScalarOrDefaultFromApp } from '../runtime/runtime_selectors.js';
import { runPlatformActivityRenderTouch } from '../runtime/platform_access.js';
import { getBrowserMethodMaybe } from '../runtime/browser_surface_access.js';
import { type AppLike, type ValueRecord, isRecord, readRecord } from '../runtime/doors_runtime_support.js';

const __doorsRuntimeReportNonFatalSeen = new Map<string, number>();

export type DoorsSnapshot = {
  doors: Record<string, boolean>;
  drawers: Record<string, boolean> | null;
};

export type EditHoldState = {
  active: boolean;
  snapshot: DoorsSnapshot | null;
  includeDrawers: boolean;
};

export type DoorsRuntimeState = UnknownRecord & {
  open: boolean;
  lastToggleTime: number;
  closeDelayUntil: number;
  prevOpen: boolean;
  hardCloseUntil: number;
  suppressGlobalToggleUntil: number;
  editHold: EditHoldState;
  localOpenSnapshot?: DoorsSnapshot | null;
};

export type SetDoorsOptions = DoorsSetOpenOptionsLike;
export type SyncVisualsOptions = DoorsSyncVisualsOptionsLike;
export type HoldEditOptions = UnknownRecord & { includeDrawers?: boolean };
export type ReleaseEditHoldOptions = DoorsReleaseEditHoldOptionsLike;
export type CaptureLocalOpenOptions = DoorsCaptureLocalOpenOptionsLike;
export type DrawerId = string | number;

export function reportDoorsRuntimeNonFatal(op: string, err: unknown, throttleMs = 4000): void {
  const now = Date.now();
  let msg = 'unknown';
  if (typeof err === 'string') msg = err;
  else if (typeof err === 'number' || typeof err === 'boolean') msg = String(err);
  else if (err && typeof err === 'object') {
    const e = readRecord(err);
    const stack = typeof e?.stack === 'string' && e.stack ? e.stack : null;
    const message = typeof e?.message === 'string' && e.message ? e.message : null;
    if (stack) msg = stack.split('\n')[0] || stack;
    else if (message) msg = message;
  }
  const key = `${op}::${msg}`;
  const prev = __doorsRuntimeReportNonFatalSeen.get(key) || 0;
  if (throttleMs > 0 && prev && now - prev < throttleMs) return;
  __doorsRuntimeReportNonFatalSeen.set(key, now);
  if (__doorsRuntimeReportNonFatalSeen.size > 600) {
    const pruneOlderThan = Math.max(10000, throttleMs * 4);
    for (const [k, ts] of __doorsRuntimeReportNonFatalSeen) {
      if (now - ts > pruneOlderThan) __doorsRuntimeReportNonFatalSeen.delete(k);
    }
  }
  console.error(`[WardrobePro][doors_runtime] ${op}`, err);
}

export function ensureRecordSlot(host: ValueRecord, key: string): ValueRecord {
  const current = readRecord(host[key]);
  if (current) return current;
  const created: ValueRecord = {};
  host[key] = created;
  return created;
}

export function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isEditHoldState(value: unknown): value is EditHoldState {
  if (!isRecord(value)) return false;
  if (typeof value.active !== 'boolean') return false;
  if (typeof value.includeDrawers !== 'boolean') return false;
  if (typeof value.snapshot === 'undefined' || value.snapshot === null) return true;
  return isRecord(value.snapshot);
}

function isDoorsRuntimeState(value: unknown): value is DoorsRuntimeState {
  if (!isRecord(value)) return false;
  if (typeof value.open !== 'boolean') return false;
  if (!isFiniteNumber(value.lastToggleTime)) return false;
  if (!isFiniteNumber(value.closeDelayUntil)) return false;
  if (typeof value.prevOpen !== 'boolean') return false;
  if (!isFiniteNumber(value.hardCloseUntil)) return false;
  if (!isFiniteNumber(value.suppressGlobalToggleUntil)) return false;
  if (!isEditHoldState(value.editHold)) return false;
  if (typeof value.localOpenSnapshot === 'undefined' || value.localOpenSnapshot === null) return true;
  return isRecord(value.localOpenSnapshot);
}

export function createBooleanMap(): Record<string, boolean> {
  return {};
}

export function setDoorStatusCss(App: AppLike, isOpen: boolean): void {
  try {
    const fn = getBrowserMethodMaybe<[boolean], void>(App, 'setDoorStatusCss');
    if (typeof fn === 'function') fn(!!isOpen);
  } catch (_e) {
    reportDoorsRuntimeNonFatal('setDoorStatusCss', _e);
  }
}

export function ensureDoorsRuntimeDefaults(App: AppLike): DoorsRuntimeState {
  const runtime = getDoorsRuntime<DoorsRuntimeState>(App);

  if (typeof runtime.open !== 'boolean') runtime.open = false;
  if (!isFiniteNumber(runtime.lastToggleTime)) runtime.lastToggleTime = 0;
  if (!isFiniteNumber(runtime.closeDelayUntil)) runtime.closeDelayUntil = 0;
  if (typeof runtime.prevOpen !== 'boolean') runtime.prevOpen = false;
  if (!isFiniteNumber(runtime.hardCloseUntil)) runtime.hardCloseUntil = 0;
  if (!isFiniteNumber(runtime.suppressGlobalToggleUntil)) runtime.suppressGlobalToggleUntil = 0;

  if (!isRecord(runtime.editHold)) {
    runtime.editHold = { active: false, snapshot: null, includeDrawers: false };
  } else {
    if (typeof runtime.editHold.active !== 'boolean') runtime.editHold.active = false;
    if (typeof runtime.editHold.includeDrawers !== 'boolean') runtime.editHold.includeDrawers = false;
    if (typeof runtime.editHold.snapshot === 'undefined') runtime.editHold.snapshot = null;
  }

  if (typeof runtime.localOpenSnapshot === 'undefined') runtime.localOpenSnapshot = null;

  if (isDoorsRuntimeState(runtime)) return runtime;

  const defaultState: DoorsRuntimeState = {
    open: false,
    lastToggleTime: 0,
    closeDelayUntil: 0,
    prevOpen: false,
    hardCloseUntil: 0,
    suppressGlobalToggleUntil: 0,
    editHold: { active: false, snapshot: null, includeDrawers: false },
    localOpenSnapshot: null,
  };
  Object.assign(runtime, defaultState);
  return isDoorsRuntimeState(runtime) ? runtime : defaultState;
}

export function getDoorsOpen(App: AppLike): boolean {
  try {
    return !!readRuntimeScalarOrDefaultFromApp(App, 'doorsOpen', false);
  } catch (_e) {
    reportDoorsRuntimeNonFatal('getDoorsOpen.readRuntime', _e);
  }
  try {
    return !!ensureDoorsRuntimeDefaults(App).open;
  } catch {
    return false;
  }
}

export function getDoorsLastToggleTime(App: AppLike): number {
  try {
    const t = readRuntimeScalarOrDefaultFromApp(App, 'doorsLastToggleTime', 0);
    return typeof t === 'number' && Number.isFinite(t) ? t : 0;
  } catch (_e) {
    reportDoorsRuntimeNonFatal('getDoorsLastToggleTime.readRuntime', _e);
  }
  try {
    const t2 = ensureDoorsRuntimeDefaults(App).lastToggleTime;
    return typeof t2 === 'number' && Number.isFinite(t2) ? t2 : 0;
  } catch {
    return 0;
  }
}

export function touchDoorsRuntimeRender(App: AppLike): void {
  try {
    runPlatformActivityRenderTouch(App, {
      updateShadows: true,
      ensureRenderLoopAfterTrigger: true,
    });
  } catch (_e) {
    reportDoorsRuntimeNonFatal('touchDoorsRuntimeRender', _e);
  }
}

export function isGlobalClickMode(App: AppLike): boolean {
  try {
    return !!readRuntimeScalarOrDefaultFromApp(App, 'globalClickMode', true);
  } catch {
    return true;
  }
}
