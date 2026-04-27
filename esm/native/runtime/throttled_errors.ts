// Throttled error reporting (Pure ESM)
//
// Stage 3: replace scattered *ReportNonFatal* helpers with a single canonical utility.
//
// Notes:
// - This is NOT a "swallow errors" API. It only handles reporting + throttling.
// - Callers decide whether to rethrow.

import { reportError, shouldFailFast, toError } from './errors.js';

import type { UnknownRecord } from '../../../types/index.js';

const __errAt = new Map<string, number>();

function _now(): number {
  try {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
    return Date.now();
  } catch {
    return Date.now();
  }
}

export type ThrottleOpts = {
  where: string;
  op: string;
  throttleMs?: number;
  reportMeta?: UnknownRecord;
  // If true: rethrow when store.runtime.failFast is enabled.
  failFast?: boolean;
  // Optional explicit key (defaults to `${where}:${op}`)
  key?: string;
};

export function reportErrorThrottled(App: unknown, err: unknown, opts: ThrottleOpts): void {
  const where = String(opts.where || '');
  const op = String(opts.op || '');
  const key = String(opts.key || `${where}:${op}`);

  const throttleMs =
    typeof opts.throttleMs === 'number' && Number.isFinite(opts.throttleMs)
      ? Math.max(0, opts.throttleMs)
      : 4000;

  const now = _now();
  const prev = __errAt.get(key) ?? -Infinity;
  if (throttleMs > 0 && now - prev < throttleMs) return;
  __errAt.set(key, now);

  reportError(App, err, {
    where,
    op,
    throttled: true,
    ...(opts.reportMeta && typeof opts.reportMeta === 'object' ? opts.reportMeta : null),
  });

  if (opts.failFast && shouldFailFast(App)) {
    throw err instanceof Error ? err : toError(err);
  }
}
