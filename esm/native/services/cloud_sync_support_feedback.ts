import type { ActionMetaLike, AppContainer, UnknownRecord } from '../../../types';

import { getUiFeedback } from '../runtime/service_access.js';
import { metaRestore, metaUiOnly } from '../runtime/meta_profiles_access.js';
import { patchUiSoft } from '../runtime/ui_write_access.js';
import { getPlatformReportError } from '../runtime/platform_access.js';

const __cloudSyncCatchTs: Record<string, number> = Object.create(null);

export function _cloudSyncReportNonFatal(
  App: AppContainer | null | undefined,
  op: string,
  error: unknown,
  opts?: { throttleMs?: number; noConsole?: boolean }
): void {
  try {
    const now = Date.now();
    const throttleMs = Math.max(0, Number(opts && opts.throttleMs) || 0);
    if (throttleMs > 0) {
      const last = __cloudSyncCatchTs[op] || 0;
      if (now - last < throttleMs) return;
      __cloudSyncCatchTs[op] = now;
    }
  } catch {
    // ignore helper throttling errors
  }

  let reported = false;
  try {
    const rep = getPlatformReportError(App);
    if (rep) {
      rep(error, { where: 'services/cloud_sync', op, nonFatal: true });
      reported = true;
    }
  } catch {
    // ignore report surface failures
  }

  if (reported || (opts && opts.noConsole)) return;
  try {
    console.warn('[WardrobePro][cloud_sync][' + op + ']', error);
  } catch {
    // ignore console failures
  }
}

export function buildUiOnlyMeta(App: AppContainer, source: string): ActionMetaLike {
  return metaUiOnly(App, { immediate: true }, source);
}

export function buildRestoreMeta(App: AppContainer, source: string): ActionMetaLike {
  return metaRestore(App, { immediate: true }, source);
}

export function applyCloudSyncUiPatch(App: AppContainer, patch: UnknownRecord, meta: ActionMetaLike): void {
  patchUiSoft(App, patch, meta);
}

export function __wp_toast(App: AppContainer, message: string, type?: string): void {
  try {
    getUiFeedback(App).toast(message, type);
    return;
  } catch {
    // ignore
  }

  try {
    console.log('[toast]', type || 'info', message);
  } catch {
    // ignore
  }
}
