// Guard helpers (Pure ESM)
//
// Explicit, intention-revealing wrappers for secondary side effects.
//
// Policy:
// - Use `guardVoid()` only for *secondary* side effects (logging, toast, cleanup)
//   that must never crash the caller.
// - For core logic, prefer letting errors throw and be handled by the nearest
//   meaningful boundary (builder scheduler / React error boundary).

import { reportError, shouldFailFast, toError } from './errors.js';

export type GuardMeta = Record<string, unknown> & {
  where?: string;
  op?: string;
  // If true: rethrow when store.runtime.failFast is enabled.
  // (Most callsites should leave this undefined and rely on shouldFailFast.)
  failFast?: boolean;
};

export function guard<T>(App: unknown, meta: GuardMeta, fn: (() => T) | null | undefined): T | undefined {
  if (typeof fn !== 'function') return undefined;
  try {
    return fn();
  } catch (e) {
    reportError(App, e, meta);

    const ff = !!meta && typeof meta.failFast === 'boolean' ? !!meta.failFast : false;
    if (ff && shouldFailFast(App)) {
      throw e instanceof Error ? e : toError(e);
    }

    return undefined;
  }
}

export function guardVoid(App: unknown, meta: GuardMeta, fn: (() => unknown) | null | undefined): void {
  void guard(App, meta, fn);
}
