import type { AppContainer } from '../../../types';

import { isObject } from './models_registry_contracts.js';
import { reportServiceNonFatal } from './service_error_observability.js';

const __modelsSoftSeen = new Map<string, number>();

function readModelsErrorHead(error: unknown): string {
  try {
    const record = isObject(error) ? error : null;
    if (record && typeof record.stack === 'string')
      return String(record.stack).split('\n')[0] ?? String(record.stack);
    if (record && typeof record.message === 'string') return String(record.message);
    return String(error);
  } catch (headError) {
    return `unreadable models error (${String(typeof headError)})`;
  }
}

function shouldReportModelsNonFatal(op: string, error: unknown, throttleMs: number): boolean {
  const now = Date.now();
  const key = `${op}::${readModelsErrorHead(error)}`;
  const previous = __modelsSoftSeen.get(key) || 0;
  if (previous && now - previous < throttleMs) return false;

  __modelsSoftSeen.set(key, now);
  if (__modelsSoftSeen.size > 300) {
    for (const [seenKey, timestamp] of __modelsSoftSeen) {
      if (now - timestamp > throttleMs * 4) __modelsSoftSeen.delete(seenKey);
    }
  }
  return true;
}

export function _modelsReportNonFatal(
  App: AppContainer | null | undefined,
  op: string,
  err: unknown,
  throttleMs = 1500
): void {
  const normalizedOp = String(op || 'unknown');
  let shouldReport = true;
  try {
    shouldReport = shouldReportModelsNonFatal(normalizedOp, err, Math.max(0, throttleMs));
  } catch (throttleError) {
    reportServiceNonFatal(
      App,
      throttleError,
      { where: 'native/services/models_registry_nonfatal', op: 'throttleState' },
      { consoleOutput: false }
    );
  }
  if (!shouldReport) return;

  reportServiceNonFatal(App, err, {
    where: 'native/services/models_registry',
    op: normalizedOp,
  });
}
