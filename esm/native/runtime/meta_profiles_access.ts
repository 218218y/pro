// Meta profile access helpers (Canonical-first)
//
// Goal:
// - Provide a single, stable way to build ActionMetaLike objects across layers.
// - Prefer App.actions.meta.* surfaces when installed.
// - Keep a small local defaults path so low-level tests/tools remain usable.
//
// Notes:
// - Always returns a NEW object (never mutates input).
// - Defaults are applied only when the caller did not specify a field.

import type { ActionMetaLike, MetaActionsNamespaceLike, UnknownRecord } from '../../../types';
import { asRecord as asUnknownRecord, cloneRecord } from './record.js';
import {
  META_PROFILE_DEFAULTS_INTERACTIVE as DEFAULTS_INTERACTIVE,
  META_PROFILE_DEFAULTS_NO_BUILD as DEFAULTS_NO_BUILD,
  META_PROFILE_DEFAULTS_NO_HISTORY as DEFAULTS_NO_HISTORY,
  META_PROFILE_DEFAULTS_RESTORE as DEFAULTS_RESTORE,
  META_PROFILE_DEFAULTS_TRANSIENT as DEFAULTS_TRANSIENT,
  META_PROFILE_DEFAULTS_UI_ONLY as DEFAULTS_UI_ONLY,
  mergeMetaProfileDefaults,
} from './meta_profiles_contract.js';
import { getMetaActions } from './actions_access_domains.js';
import { reportError } from './errors.js';

type MetaProfileDefaults = ActionMetaLike;
type MetaProfileCall = (meta?: ActionMetaLike, source?: string) => ActionMetaLike;

function mergeLocal(meta: unknown, defaults: MetaProfileDefaults, defaultSource?: string): ActionMetaLike {
  return mergeMetaProfileDefaults(meta, defaults, defaultSource);
}

function toMetaArg(meta: ActionMetaLike | UnknownRecord | undefined): ActionMetaLike | undefined {
  if (!meta) return undefined;
  return { ...cloneRecord(meta) };
}

function isMetaNamespaceLike(value: unknown): value is MetaActionsNamespaceLike {
  const rec = asUnknownRecord(value);
  return !!(
    rec &&
    typeof rec.uiOnly === 'function' &&
    typeof rec.restore === 'function' &&
    typeof rec.interactive === 'function' &&
    typeof rec.transient === 'function' &&
    typeof rec.merge === 'function'
  );
}

function metaNsFromApp(App: unknown): MetaActionsNamespaceLike | null {
  const metaNs = getMetaActions(App);
  return isMetaNamespaceLike(metaNs) ? metaNs : null;
}

function reportMetaProfileOwnerRejection(App: unknown, op: string, error: unknown): void {
  try {
    reportError(App, error, {
      where: 'native/runtime/meta_profiles_access',
      op,
      fatal: false,
    });
  } catch {
    // Reporting is best-effort; meta defaults must remain available during early boot/tests.
  }
}

function callMetaProfile(
  App: unknown,
  metaNs: MetaActionsNamespaceLike | null,
  fn: MetaProfileCall | undefined,
  meta: ActionMetaLike | UnknownRecord | undefined,
  source: string,
  localDefaults: MetaProfileDefaults
): ActionMetaLike {
  if (metaNs && typeof fn === 'function') {
    try {
      return fn(toMetaArg(meta), source);
    } catch (error) {
      reportMetaProfileOwnerRejection(App, `meta.${source || 'profile'}.ownerRejected`, error);
    }
  }

  return mergeLocal(meta, localDefaults, source);
}

export function metaMerge(
  App: unknown,
  meta?: ActionMetaLike | UnknownRecord,
  defaults?: ActionMetaLike,
  source?: string
): ActionMetaLike {
  const metaNs = metaNsFromApp(App);
  const src = source || 'meta:merge';
  const localDefaults: MetaProfileDefaults = defaults ? { ...cloneRecord(defaults) } : {};

  if (metaNs && typeof metaNs.merge === 'function') {
    try {
      return metaNs.merge(toMetaArg(meta), defaults, src);
    } catch (error) {
      reportMetaProfileOwnerRejection(App, `meta.${src || 'merge'}.ownerRejected`, error);
    }
  }

  return mergeLocal(meta, localDefaults, src);
}

export function metaUiOnly(
  App: unknown,
  meta?: ActionMetaLike | UnknownRecord,
  source?: string
): ActionMetaLike {
  const metaNs = metaNsFromApp(App);
  return callMetaProfile(App, metaNs, metaNs?.uiOnly, meta, source || 'meta:uiOnly', DEFAULTS_UI_ONLY);
}

export function metaRestore(
  App: unknown,
  meta?: ActionMetaLike | UnknownRecord,
  source?: string
): ActionMetaLike {
  const metaNs = metaNsFromApp(App);
  return callMetaProfile(App, metaNs, metaNs?.restore, meta, source || 'meta:restore', DEFAULTS_RESTORE);
}

export function metaTransient(
  App: unknown,
  meta?: ActionMetaLike | UnknownRecord,
  source?: string
): ActionMetaLike {
  const metaNs = metaNsFromApp(App);
  return callMetaProfile(
    App,
    metaNs,
    metaNs?.transient,
    meta,
    source || 'meta:transient',
    DEFAULTS_TRANSIENT
  );
}

export function metaNoHistory(
  App: unknown,
  meta?: ActionMetaLike | UnknownRecord,
  source?: string
): ActionMetaLike {
  return metaMerge(App, meta, DEFAULTS_NO_HISTORY, source || 'meta:noHistory');
}

export function metaNoBuild(
  App: unknown,
  meta?: ActionMetaLike | UnknownRecord,
  source?: string
): ActionMetaLike {
  return metaMerge(App, meta, DEFAULTS_NO_BUILD, source || 'meta:noBuild');
}

export function metaInteractive(
  App: unknown,
  meta?: ActionMetaLike | UnknownRecord,
  source?: string
): ActionMetaLike {
  return metaMerge(App, meta, DEFAULTS_INTERACTIVE, source || 'meta:interactive');
}
