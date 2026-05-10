// Focused canvas-picking support owner for reporting/error/history-touch behavior.

import type { AppContainer } from '../../../types';
import { historyTouch } from '../runtime/app_helpers.js';
import { reportError, shouldFailFast } from '../runtime/api_assert_surface.js';

const __wpPickingWarnThrottle = new Map<string, number>();

export function __wp_toError(err: unknown, defaultMessage: string): Error {
  if (err instanceof Error) return err;
  try {
    return new Error(typeof err === 'string' ? err : String(err ?? defaultMessage));
  } catch {
    return new Error(defaultMessage);
  }
}

export function __wp_reportPickingIssue(
  App: AppContainer,
  err: unknown,
  meta: { op: string; where?: string; throttleMs?: number },
  opts: { failFast?: boolean } = {}
): void {
  const where = meta && meta.where ? String(meta.where) : 'canvasPicking';
  const op = meta && meta.op ? String(meta.op) : 'unknown';
  const throttleMs =
    meta && typeof meta.throttleMs === 'number' && Number.isFinite(meta.throttleMs)
      ? Number(meta.throttleMs)
      : 0;
  const key = `${where}:${op}`;
  const now = Date.now();

  if (throttleMs > 0) {
    const prev = __wpPickingWarnThrottle.get(key) || 0;
    if (now - prev < throttleMs) {
      if (opts.failFast || shouldFailFast(App)) throw __wp_toError(err, `[WardrobePro][${where}] ${op}`);
      return;
    }
    __wpPickingWarnThrottle.set(key, now);
  }

  reportError(App, err, { where, op, source: 'canvas_picking_core' });
  try {
    console.warn(`[WardrobePro][${where}] ${op}`, err);
  } catch {
    // ignore console failures
  }

  if (opts.failFast || shouldFailFast(App)) {
    throw __wp_toError(err, `[WardrobePro][${where}] ${op}`);
  }
}

export function __wp_commitHistoryTouch(App: AppContainer, source: string): void {
  try {
    historyTouch(App, source || 'canvasPicking:historyTouch');
  } catch (err) {
    __wp_reportPickingIssue(App, err, {
      where: 'canvasPicking',
      op: 'cellDims.historyTouch',
      throttleMs: 500,
    });
  }
}
