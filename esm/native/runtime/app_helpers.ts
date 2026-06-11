// App helper utilities (Canonical-first, Pure ESM)
//
// Purpose:
// - Centralize small cross-layer helpers that frequently need to reach into App.actions.
// - Keep callsites off manual "probe App.actions.*" ladders.
// - Remain dependency-light and side-effect free.
//
// Notes:
// - Prefer using ActionMetaLike over loose meta record bags.
// - All helpers are best-effort (fail-soft) unless explicitly documented.

import type { ActionMetaLike, AppContainer } from '../../../types/index.js';

import { callMetaAction, hasMetaAction } from './actions_access_domains.js';
import { runHistoryBatchViaActions } from './actions_access_mutations.js';
import { stringifyViaPlatform } from './platform_access.js';
import { metaNoBuild } from './meta_profiles_access.js';

/** Best-effort string conversion via the canonical platform seam. */
export function appStr(App: AppContainer, v: unknown): string {
  return stringifyViaPlatform(App, v);
}

/**
 * Run a history batch when `App.actions.history.batch` is available.
 * Falls back to direct execution of `fn` when unavailable or if it throws.
 */
export function historyBatch(App: AppContainer, meta: ActionMetaLike, fn: () => unknown): unknown {
  try {
    return runHistoryBatchViaActions(App, meta, fn);
  } catch (_e) {
    return fn();
  }
}

/**
 * Best-effort "touch" of the history/dirty surface.
 * - Requires the canonical `App.actions.meta.touch(meta)` seam
 * - Does not fall back to generic root patch nudges
 */
export function historyTouch(App: AppContainer, source: string): void {
  const src = source || 'history:touch';
  const base: ActionMetaLike = { source: src, immediate: true };

  // Preserve legacy behavior: only apply the noBuild profile when the canonical surface exists.
  // (Some harnesses rely on a very small meta payload.)
  const meta: ActionMetaLike = hasMetaAction(App, 'noBuild') ? metaNoBuild(App, base, src) : base;

  try {
    if (hasMetaAction(App, 'touch')) {
      callMetaAction<(meta?: ActionMetaLike) => unknown>(App, 'touch', meta);
    }
  } catch (_e) {
    // ignore
  }
}
