import { getStoreActionFn } from './actions_access_domains.js';

/**
 * Canonical read-only seam for boot-installed store reactivity status.
 * UI/runtime code should not probe kernel internals directly.
 * Delete-pass: runtime helper reads actions.store.hasReactivityInstalled surface only.
 */
export function hasStoreReactivityInstalled(App: unknown): boolean {
  try {
    const fn = getStoreActionFn<() => unknown>(App, 'hasReactivityInstalled');
    return fn ? !!fn() : false;
  } catch {
    return false;
  }
}
