// Mode write access helpers (Canonical-first, Store-backed)
//
// Goal:
// - Centralize the mode write seams.
// - Prefer App.actions.mode.* surfaces when installed (state_api/kernel install).
// - Keep store-backed compatibility routes for minimal harnesses.
//
// Policy:
// - Mode transitions are transient UI flow control (no history/autosave/persist/build by default).
// - Delete-pass: avoid generic root actions.patch routing for mode updates.

import type {
  ActionMetaLike,
  ModeActionOptsLike,
  ModeActionsNamespaceLike,
  ModeSlicePatch,
} from '../../../types';
import { metaTransient } from './meta_profiles_access.js';
import {
  asRecord,
  getSliceNamespace,
  getWriteStore,
  patchSliceCanonical,
} from './slice_write_access.js';

type ModeWriteAppLike = {
  modes?: Record<string, unknown>;
};

function asModePatch(v: unknown): ModeSlicePatch {
  const rec = asRecord(v);
  return rec ? { ...rec } : {};
}

function isModeWriteAppLike(value: unknown): value is ModeWriteAppLike {
  return !!asRecord(value);
}

function getAppLike(App: unknown): ModeWriteAppLike | null {
  return isModeWriteAppLike(App) ? App : null;
}

function isModeActionsNamespaceLike(value: unknown): value is ModeActionsNamespaceLike {
  return !!asRecord(value);
}

function getModeNamespace(App: unknown): ModeActionsNamespaceLike | null {
  const ns = getSliceNamespace(App, 'mode');
  return isModeActionsNamespaceLike(ns) ? ns : null;
}

function normalizePrimary(App: unknown, primary: unknown): string {
  const modes = getAppLike(App)?.modes;
  const noneVal = modes && typeof modes.NONE === 'string' ? String(modes.NONE).trim() : '';
  const NONE = noneVal || 'none';

  if (primary == null) return NONE;
  if (typeof primary === 'string' || typeof primary === 'number' || typeof primary === 'boolean') {
    const s = String(primary);
    return s ? s : NONE;
  }
  return NONE;
}

function normalizeOpts(opts: unknown): ModeActionOptsLike {
  const rec = asRecord(opts);
  return rec ? { ...rec } : {};
}

export function patchMode(App: unknown, patch: unknown, meta?: ActionMetaLike): unknown {
  const mdPatch = asModePatch(patch);
  const m = metaTransient(App, meta, 'mode:patch');
  return patchSliceCanonical(App, 'mode', mdPatch, m, { storeWriter: 'setModePatch' });
}

export function setModePrimary(
  App: unknown,
  primary: unknown,
  opts?: ModeActionOptsLike,
  meta?: ActionMetaLike
): unknown {
  const m = metaTransient(App, meta, 'mode:set');

  const nextPrimary = normalizePrimary(App, primary);
  const cleanOpts = normalizeOpts(opts);
  const modeNs = getModeNamespace(App);

  if (typeof modeNs?.set === 'function') {
    return modeNs.set(nextPrimary, cleanOpts, m);
  }

  const store = getWriteStore(App);
  if (typeof store?.setModePatch === 'function') {
    return store.setModePatch({ primary: nextPrimary, opts: cleanOpts }, m);
  }

  return patchMode(App, { primary: nextPrimary, opts: cleanOpts }, m);
}
