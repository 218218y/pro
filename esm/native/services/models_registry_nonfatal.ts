import type { AppContainer } from '../../../types';

import { isObject } from './models_registry_contracts.js';
import { reportErrorViaPlatform } from '../runtime/platform_access.js';

const __modelsSoftSeen = new Map<string, number>();

export function _modelsReportNonFatal(
  App: AppContainer | null | undefined,
  op: string,
  err: unknown,
  throttleMs = 1500
): void {
  try {
    const now = Date.now();
    const eRec = isObject(err) ? err : null;
    const head =
      eRec && typeof eRec.stack === 'string'
        ? String(eRec.stack).split('\n')[0]
        : eRec && typeof eRec.message === 'string'
          ? String(eRec.message)
          : String(err);
    const key = `${String(op || 'models')}::${head}`;
    const prev = __modelsSoftSeen.get(key) || 0;
    if (prev && now - prev < throttleMs) return;
    __modelsSoftSeen.set(key, now);
    if (__modelsSoftSeen.size > 300) {
      for (const [k, ts] of __modelsSoftSeen) {
        if (now - ts > throttleMs * 4) __modelsSoftSeen.delete(k);
      }
    }
  } catch (_err) {
    try {
      console.warn('[WardrobePro][models]', 'reportNonFatal.throttle', _err);
    } catch {}
  }
  try {
    if (reportErrorViaPlatform(App, err, 'models.' + String(op || 'unknown'))) return;
  } catch (_err) {
    try {
      console.warn('[WardrobePro][models]', 'reportNonFatal.platform', _err);
    } catch {}
  }
  try {
    console.warn('[WardrobePro][models]', op, err);
  } catch {}
}
