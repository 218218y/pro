// Canonical meta profile defaults/helpers shared across runtime accessors.
//
// Goal:
// - Keep fallback meta semantics aligned with kernel-installed helpers.
// - Avoid duplicating profile literals in multiple runtime helper modules.
// - Provide tiny pure helpers that never touch App/store/actions directly.

import type { ActionMetaLike } from '../../../types/index.js';

import { cloneRecord } from './record.js';

export const META_PROFILE_DEFAULTS_UI_ONLY: ActionMetaLike = {
  noBuild: true,
  noAutosave: true,
  noPersist: true,
  noHistory: true,
  noCapture: true,
  uiOnly: true,
};

export const META_PROFILE_DEFAULTS_RESTORE: ActionMetaLike = {
  silent: true,
  noBuild: true,
  noAutosave: true,
  noPersist: true,
  noHistory: true,
  noCapture: true,
};

export const META_PROFILE_DEFAULTS_INTERACTIVE: ActionMetaLike = { silent: false };
export const META_PROFILE_DEFAULTS_NO_HISTORY: ActionMetaLike = { noHistory: true, noCapture: true };
export const META_PROFILE_DEFAULTS_NO_BUILD: ActionMetaLike = { noBuild: true };
export const META_PROFILE_DEFAULTS_TRANSIENT: ActionMetaLike = {
  noBuild: true,
  noAutosave: true,
  noPersist: true,
  noHistory: true,
  noCapture: true,
};

export function mergeMetaProfileDefaults(
  meta: unknown,
  defaults?: ActionMetaLike,
  sourceFallback?: string
): ActionMetaLike {
  const out: ActionMetaLike = { ...cloneRecord(meta) };
  const defaultsRecord = cloneRecord(defaults);
  for (const key of Object.keys(defaultsRecord)) {
    if (typeof out[key] === 'undefined') out[key] = defaultsRecord[key];
  }
  if (sourceFallback && typeof out.source !== 'string') out.source = sourceFallback;
  return out;
}

export function buildMetaUiOnlyImmediate(source?: string): ActionMetaLike {
  return mergeMetaProfileDefaults(
    { immediate: true },
    META_PROFILE_DEFAULTS_UI_ONLY,
    source || 'meta:uiOnlyImmediate'
  );
}

export function buildMetaInteractiveImmediate(source?: string): ActionMetaLike {
  return mergeMetaProfileDefaults(
    { immediate: true },
    META_PROFILE_DEFAULTS_INTERACTIVE,
    source || 'meta:interactiveImmediate'
  );
}

export function buildMetaNoBuildImmediate(source?: string): ActionMetaLike {
  return mergeMetaProfileDefaults(
    { immediate: true },
    META_PROFILE_DEFAULTS_NO_BUILD,
    source || 'meta:noBuildImmediate'
  );
}

export function buildMetaNoHistoryImmediate(source?: string): ActionMetaLike {
  return mergeMetaProfileDefaults(
    { immediate: true },
    META_PROFILE_DEFAULTS_NO_HISTORY,
    source || 'meta:noHistoryImmediate'
  );
}

export function buildMetaNoHistoryForceBuildImmediate(source?: string): ActionMetaLike {
  const s = source || 'meta:noHistoryForceBuildImmediate';
  const defaults = mergeMetaProfileDefaults(undefined, META_PROFILE_DEFAULTS_NO_HISTORY, s);
  return mergeMetaProfileDefaults({ immediate: true, forceBuild: true }, defaults, s);
}

export function buildMetaSource(source: string): ActionMetaLike {
  return mergeMetaProfileDefaults(undefined, undefined, source || 'meta:src');
}

export function buildMetaSourceImmediate(source: string): ActionMetaLike {
  return mergeMetaProfileDefaults({ immediate: true }, undefined, source || 'meta:srcImmediate');
}
