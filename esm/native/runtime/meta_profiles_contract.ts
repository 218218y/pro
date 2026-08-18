// Canonical meta profile defaults/helpers shared across runtime accessors.
//
// Goal:
// - Keep default-source meta semantics aligned with kernel-installed helpers.
// - Avoid duplicating profile literals in multiple runtime helper modules.
// - Provide tiny pure helpers that never touch App/store/actions directly.

import type { ActionMetaLike, CanonicalActionMetaLike } from '../../../types/index.js';

import { mergeCanonicalActionMeta } from './action_meta_contract.js';

export const META_PROFILE_DEFAULTS_UI_ONLY = {
  noBuild: true,
  noAutosave: true,
  noPersist: true,
  noHistory: true,
  noCapture: true,
  uiOnly: true,
} satisfies CanonicalActionMetaLike;

export const META_PROFILE_DEFAULTS_RESTORE = {
  silent: true,
  noBuild: true,
  noAutosave: true,
  noPersist: true,
  noHistory: true,
  noCapture: true,
} satisfies CanonicalActionMetaLike;

export const META_PROFILE_DEFAULTS_INTERACTIVE = { silent: false } satisfies CanonicalActionMetaLike;
export const META_PROFILE_DEFAULTS_NO_HISTORY = {
  noHistory: true,
  noCapture: true,
} satisfies CanonicalActionMetaLike;
export const META_PROFILE_DEFAULTS_NO_BUILD = { noBuild: true } satisfies CanonicalActionMetaLike;
export const META_PROFILE_DEFAULTS_TRANSIENT = {
  noBuild: true,
  noAutosave: true,
  noPersist: true,
  noHistory: true,
  noCapture: true,
} satisfies CanonicalActionMetaLike;

export function mergeMetaProfileDefaults(
  meta: unknown,
  defaults?: CanonicalActionMetaLike,
  defaultSource?: string
): ActionMetaLike {
  return mergeCanonicalActionMeta(meta, defaults, defaultSource);
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
