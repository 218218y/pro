// Native UI modes controller (ESM)
// Canonical owner/public surface. Heavy mode option and transition policy lives in dedicated modules.

import type {
  ModeActionOptsLike,
  ModeStateLike,
  ModeTransitionOptsLike,
  UiModesControllerLike,
} from '../../../types';

import {
  type AppLike,
  getModeState,
  getModesMap,
  getPrimaryModeOptsValue,
  getPrimaryModeValue,
  buildModeActionOptsFingerprint,
  isModeActiveValue,
  isRecord,
} from './modes_shared.js';
import { applyModeOptsImpl } from './modes_mode_opts.js';
import { ensureUiModesRuntimeService, getStoreSubscriber } from '../services/api.js';
import {
  enterPrimaryModeImpl,
  exitPrimaryModeImpl,
  togglePrimaryModeImpl,
} from './modes_transition_policy.js';

type ModesControllerApi = Required<
  Pick<
    UiModesControllerLike,
    | 'apply'
    | 'getPrimaryMode'
    | 'getPrimaryModeOpts'
    | 'isModeActive'
    | 'enterPrimaryMode'
    | 'exitPrimaryMode'
    | 'togglePrimaryMode'
  >
> & {
  unsub: UiModesControllerLike['unsub'];
};

function getOptsRecord(value: unknown): ModeActionOptsLike {
  return isRecord(value) ? value : {};
}

function getEnterExitOpts(value: unknown): ModeTransitionOptsLike {
  return isRecord(value) ? value : {};
}

function isModesControllerApi(value: unknown): value is ModesControllerApi {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof Reflect.get(value, 'apply') === 'function' &&
    typeof Reflect.get(value, 'getPrimaryMode') === 'function' &&
    typeof Reflect.get(value, 'getPrimaryModeOpts') === 'function' &&
    typeof Reflect.get(value, 'isModeActive') === 'function' &&
    typeof Reflect.get(value, 'enterPrimaryMode') === 'function' &&
    typeof Reflect.get(value, 'exitPrimaryMode') === 'function' &&
    typeof Reflect.get(value, 'togglePrimaryMode') === 'function'
  );
}

function readCleanupUnsubscribe(value: unknown): (() => void) | null {
  if (!value || typeof value !== 'object') return null;
  const unsubscribe = Reflect.get(value, 'unsubscribe');
  return typeof unsubscribe === 'function' ? () => Reflect.apply(unsubscribe, value, []) : null;
}

function hasLiveCleanupHandle(value: unknown): boolean {
  return typeof value === 'function' || !!readCleanupUnsubscribe(value);
}

function callCleanupHandle(value: unknown): void {
  try {
    if (typeof value === 'function') {
      value();
      return;
    }
    readCleanupUnsubscribe(value)?.();
  } catch {
    // ignore
  }
}

function ensureModesControllerSurface(App: AppLike): ModesControllerApi {
  const runtime = ensureUiModesRuntimeService(App);
  const current = runtime.controller;
  const api: UiModesControllerLike = current && typeof current === 'object' ? current : {};
  if (runtime.controller !== api) runtime.controller = api;

  const NONE = getModesMap().NONE || 'none';
  let createdApply = false;

  if (typeof api.apply !== 'function') {
    createdApply = true;
    let lastKey = '';
    let lastPrimary = NONE;

    api.apply = () => {
      try {
        const ms: ModeStateLike = getModeState(App);
        const primary = (typeof ms.primary === 'string' ? ms.primary : NONE) || NONE;
        const opts = getOptsRecord(ms.opts);
        const key = primary + '|' + buildModeActionOptsFingerprint(opts);
        if (key === lastKey) return;
        const prev = lastPrimary;
        lastPrimary = primary;
        lastKey = key;

        onPrimaryModeChanged(App, prev, primary, opts);
      } catch (_e) {
        // ignore
      }
    };
  }

  if (typeof api.getPrimaryMode !== 'function') api.getPrimaryMode = () => getPrimaryMode(App);
  if (typeof api.getPrimaryModeOpts !== 'function') api.getPrimaryModeOpts = () => getPrimaryModeOpts(App);
  if (typeof api.isModeActive !== 'function') api.isModeActive = (mode: string) => isModeActive(App, mode);
  if (typeof api.enterPrimaryMode !== 'function') {
    api.enterPrimaryMode = (mode?: string, opts?: ModeTransitionOptsLike) =>
      enterPrimaryMode(App, mode, opts);
  }
  if (typeof api.exitPrimaryMode !== 'function') {
    api.exitPrimaryMode = (expectedMode?: string, opts?: ModeTransitionOptsLike) =>
      exitPrimaryMode(App, expectedMode, opts);
  }
  if (typeof api.togglePrimaryMode !== 'function') {
    api.togglePrimaryMode = (mode: string, opts?: ModeActionOptsLike) => togglePrimaryMode(App, mode, opts);
  }

  if (createdApply && hasLiveCleanupHandle(api.unsub)) {
    callCleanupHandle(api.unsub);
    api.unsub = null;
  }

  try {
    api.apply();
  } catch (_e) {
    // ignore
  }

  if (createdApply || !hasLiveCleanupHandle(api.unsub)) {
    try {
      const subscribe = getStoreSubscriber(App);
      api.unsub = subscribe
        ? subscribe(() => {
            if (typeof api.apply === 'function') api.apply();
          })
        : null;
    } catch (_e) {
      api.unsub = null;
    }
  }

  if (!isModesControllerApi(api)) {
    throw new Error('[WardrobePro] ui.modes controller surface could not be normalized.');
  }
  return api;
}

export function getPrimaryMode(App: AppLike): string {
  return getPrimaryModeValue(App);
}

export function getPrimaryModeOpts(App: AppLike): Record<string, unknown> {
  return getPrimaryModeOptsValue(App);
}

export function isModeActive(App: AppLike, mode: string): boolean {
  return isModeActiveValue(App, mode);
}

export function applyModeOpts(App: AppLike, mode: string, opts?: ModeActionOptsLike): void {
  applyModeOptsImpl(App, mode, opts);
}

export function onPrimaryModeChanged(App: AppLike, a: string, b?: unknown, c?: unknown): void {
  if (!App || typeof App !== 'object') return;

  const modes = getModesMap();
  const NONE = modes.NONE ?? 'none';

  let next: string | null = null;
  let opts: ModeActionOptsLike = {};

  // Signature supports both:
  // - (prev, next, opts)
  // - (next, opts)
  if (typeof b === 'string') {
    next = b;
    opts = getOptsRecord(c);
  } else {
    next = a;
    opts = getOptsRecord(b);
  }

  next = next || NONE;

  // Apply per-mode option side effects (tools/UI snapshot sync).
  applyModeOpts(App, next, opts);

  // No imperative render hook: primary_mode effects are store-driven.
}

export function togglePrimaryMode(App: AppLike, mode: string, opts?: ModeActionOptsLike): void {
  if (!App || typeof App !== 'object') return;
  togglePrimaryModeImpl(App, mode, getOptsRecord(opts));
}

export function enterPrimaryMode(App: AppLike, mode?: string, opts?: ModeTransitionOptsLike): void {
  if (!App || typeof App !== 'object') return;
  enterPrimaryModeImpl(App, mode, getEnterExitOpts(opts));
}

export function exitPrimaryMode(App: AppLike, expectedMode?: string, opts?: ModeTransitionOptsLike): void {
  if (!App || typeof App !== 'object') return;
  exitPrimaryModeImpl(App, expectedMode, getEnterExitOpts(opts), onPrimaryModeChanged);
}

export function installModesController(App: AppLike): ModesControllerApi | null {
  if (!App || typeof App !== 'object') return null;

  // Store-driven mode effects:
  // - When mode slice changes, applyModeOpts for the active mode.
  // - No UI install shims, global aliases, or ready-registry.
  try {
    const api = ensureModesControllerSurface(App);
    return isModesControllerApi(api) ? api : null;
  } catch (_e) {
    return null;
  }
}
