import type { UnknownRecord } from '../../../types';

import { getDoorsRuntime } from './doors_access.js';
import { doorsRuntimeNow } from './doors_runtime_support_shared.js';
import type { SketchFreeBoxMotionScope } from './sketch_free_box_motion_identity.js';

export type SketchFreeBoxMotionState = {
  lastToggleTime: number;
  targetOpen: boolean;
  hasInternalDrawers: boolean;
  doorHoldUntil: number;
};

const RUNTIME_KEY = 'sketchFreeBoxMotionScopes';

function readRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function readFiniteNumber(value: unknown, defaultValue = 0): number {
  const n = typeof value === 'number' ? value : value != null ? Number(value) : NaN;
  return Number.isFinite(n) ? n : defaultValue;
}

function readBool(value: unknown, defaultValue = false): boolean {
  return typeof value === 'boolean' ? value : typeof value === 'undefined' ? defaultValue : !!value;
}

export function getSketchFreeBoxMotionStateKey(
  scope: SketchFreeBoxMotionScope | null | undefined
): string | null {
  if (!scope?.prefix) return null;
  const moduleKey = scope.moduleKey != null && String(scope.moduleKey) ? String(scope.moduleKey) : '_';
  const boxId = scope.boxId != null && String(scope.boxId) ? String(scope.boxId) : '_';
  return `${scope.prefix}|${moduleKey}|${boxId}`;
}

function getStateMap(App: unknown, create: boolean): UnknownRecord | null {
  try {
    const runtime = getDoorsRuntime<UnknownRecord>(App);
    const existing = readRecord(runtime[RUNTIME_KEY]);
    if (existing) return existing;
    if (!create) return null;
    const next: UnknownRecord = Object.create(null);
    runtime[RUNTIME_KEY] = next;
    return next;
  } catch {
    return null;
  }
}

export function readSketchFreeBoxMotionState(
  App: unknown,
  scope: SketchFreeBoxMotionScope | null | undefined
): SketchFreeBoxMotionState | null {
  const key = getSketchFreeBoxMotionStateKey(scope);
  if (!key) return null;
  const map = getStateMap(App, false);
  const rec = readRecord(map?.[key]);
  if (!rec) return null;
  return {
    lastToggleTime: readFiniteNumber(rec.lastToggleTime, 0),
    targetOpen: readBool(rec.targetOpen, false),
    hasInternalDrawers: readBool(rec.hasInternalDrawers, false),
    doorHoldUntil: readFiniteNumber(rec.doorHoldUntil, 0),
  };
}

export function recordSketchFreeBoxMotionToggle(
  App: unknown,
  scope: SketchFreeBoxMotionScope | null | undefined,
  targetOpen: boolean,
  opts?: { hasInternalDrawers?: boolean; delayMs?: number; now?: number }
): void {
  const key = getSketchFreeBoxMotionStateKey(scope);
  if (!key) return;
  const map = getStateMap(App, true);
  if (!map) return;
  const now = readFiniteNumber(opts?.now, doorsRuntimeNow());
  const delayMs = Math.max(0, readFiniteNumber(opts?.delayMs, 0));
  const hasInternalDrawers = !!opts?.hasInternalDrawers;
  map[key] = {
    lastToggleTime: now,
    targetOpen: !!targetOpen,
    hasInternalDrawers,
    doorHoldUntil: !targetOpen && hasInternalDrawers ? now + delayMs : 0,
  } satisfies SketchFreeBoxMotionState;
}

export function readSketchFreeBoxMotionTimeSinceToggle(
  App: unknown,
  scope: SketchFreeBoxMotionScope | null | undefined,
  fallbackMs: number,
  now?: number
): number {
  const state = readSketchFreeBoxMotionState(App, scope);
  if (!state || !state.lastToggleTime) return fallbackMs;
  const runtimeNow = readFiniteNumber(now, doorsRuntimeNow());
  return Math.max(0, runtimeNow - state.lastToggleTime);
}

export function shouldHoldSketchFreeBoxDoorsDuringClose(
  App: unknown,
  scope: SketchFreeBoxMotionScope | null | undefined,
  delayMs: number,
  now?: number
): boolean {
  const state = readSketchFreeBoxMotionState(App, scope);
  if (!state || state.targetOpen || !state.hasInternalDrawers) return false;
  const runtimeNow = readFiniteNumber(now, doorsRuntimeNow());
  if (state.doorHoldUntil > 0) return runtimeNow < state.doorHoldUntil;
  const elapsed = Math.max(0, runtimeNow - state.lastToggleTime);
  return elapsed < Math.max(0, readFiniteNumber(delayMs, 0));
}
