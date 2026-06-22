// Mode write access helpers (canonical actions only)
//
// Goal:
// - Centralize the mode write seams.
// - Require the installed App.actions.mode.* surface.
// - Fail fast when boot/integration code provides an incomplete action contract.
//
// Policy:
// - Mode transitions are transient UI flow control (no history/autosave/persist/build by default).

import type {
  ActionMetaLike,
  ModeActionOptsLike,
  ModeActionsNamespaceLike,
  ModeSlicePatch,
} from '../../../types';
import { requireActionFn } from './actions_access_core.js';
import { metaTransient } from './meta_profiles_access.js';
import { asRecord } from './record.js';

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

type ModePatchAction = NonNullable<ModeActionsNamespaceLike['patch']>;
type ModeSetAction = NonNullable<ModeActionsNamespaceLike['set']>;

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
  if (!Object.keys(mdPatch).length) return undefined;
  const m = metaTransient(App, meta, 'mode:patch');
  return requireActionFn<ModePatchAction>(App, 'mode.patch', 'mode write access')(mdPatch, m);
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
  return requireActionFn<ModeSetAction>(App, 'mode.set', 'mode transition write access')(
    nextPrimary,
    cleanOpts,
    m
  );
}
