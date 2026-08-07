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
import { reportError } from './errors.js';
import { metaNoBuild } from './meta_profiles_access.js';

/**
 * Run a history batch when `App.actions.history.batch` is available.
 *
 * A direct fallback is safe only when the canonical batch surface fails before
 * invoking the callback. Once the callback has started it may already have
 * mutated canonical state, so re-running it would risk duplicate commits.
 */
export function historyBatch(App: AppContainer, meta: ActionMetaLike, fn: () => unknown): unknown {
  let callbackStarted = false;
  const guardedFn = () => {
    callbackStarted = true;
    return fn();
  };

  try {
    return runHistoryBatchViaActions(App, meta, guardedFn);
  } catch (error) {
    if (callbackStarted) throw error;
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

  // Preserve established behavior: only apply the noBuild profile when the canonical surface exists.
  // (Some harnesses rely on a very small meta payload.)
  const meta: ActionMetaLike = hasMetaAction(App, 'noBuild') ? metaNoBuild(App, base, src) : base;

  try {
    if (hasMetaAction(App, 'touch')) {
      callMetaAction<(meta?: ActionMetaLike) => unknown>(App, 'touch', meta);
    }
  } catch (error) {
    reportError(
      App,
      error,
      { where: 'appHelpers', op: 'historyTouch', fatal: false },
      { consoleOutput: false }
    );
  }
}
