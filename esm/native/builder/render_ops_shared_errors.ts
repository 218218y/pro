import { reportError, shouldFailFast } from '../runtime/api.js';

import type { AnyMap, AppContainer } from './render_ops_shared_contracts.js';

const __renderOpsErrorLastAt = new Map<string, number>();

function __renderOpsReportError(
  App: AppContainer | null | undefined,
  op: string,
  err: unknown,
  extra?: AnyMap,
  throttleMs = 10000
): void {
  const key = `render_ops:${op}`;
  const now = Date.now();
  const prev = __renderOpsErrorLastAt.get(key) || 0;
  if (now - prev < throttleMs) return;
  __renderOpsErrorLastAt.set(key, now);
  reportError(App || null, err, { where: 'builder/render_ops', op, ...(extra || {}) });
  console.warn('[WardrobePro][render_ops]', op, err);
}

export function __renderOpsHandleCatch(
  App: AppContainer | null | undefined,
  op: string,
  err: unknown,
  extra?: AnyMap,
  opts?: { throttleMs?: number; failFast?: boolean }
): void {
  __renderOpsReportError(App, op, err, extra, opts?.throttleMs ?? 10000);
  if (opts?.failFast !== false && shouldFailFast(App || null)) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}
