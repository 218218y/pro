import type { ActionMetaLike, AppContainer, UnknownRecord } from '../../../types';

import { getUiFeedback } from '../runtime/service_access.js';
import { metaRestore, metaUiOnly } from '../runtime/meta_profiles_access.js';
import { patchUiSoft } from '../runtime/ui_write_access.js';
import { getPlatformReportError, getPlatformRoot, getPlatformService } from '../runtime/platform_access.js';

const __cloudSyncGlobalCatchTs: Record<string, number> = Object.create(null);
const __cloudSyncSurfaceCatchTs = new WeakMap<object, Record<string, number>>();

function getCloudSyncReportThrottleKey(App: AppContainer | null | undefined): object | null {
  try {
    const service = getPlatformService(App);
    if (service && typeof service.reportError === 'function') return service;
  } catch {
    // ignore service lookup failures
  }
  try {
    const root = getPlatformRoot(App);
    if (root && typeof root.reportError === 'function') return root;
  } catch {
    // ignore root lookup failures
  }
  return null;
}

function getCloudSyncReportThrottleBucket(key: object | null): Record<string, number> {
  if (!key) return __cloudSyncGlobalCatchTs;
  let bucket = __cloudSyncSurfaceCatchTs.get(key);
  if (!bucket) {
    bucket = Object.create(null) as Record<string, number>;
    __cloudSyncSurfaceCatchTs.set(key, bucket);
  }
  return bucket;
}

export function _cloudSyncReportNonFatal(
  App: AppContainer | null | undefined,
  op: string,
  error: unknown,
  opts?: { throttleMs?: number; noConsole?: boolean }
): void {
  let rep: ((error: unknown, ctx?: unknown) => unknown) | null = null;
  let throttleKey: object | null = null;
  try {
    throttleKey = getCloudSyncReportThrottleKey(App);
    rep = getPlatformReportError(App);
  } catch {
    rep = null;
  }

  try {
    const now = Date.now();
    const throttleMs = Math.max(0, Number(opts && opts.throttleMs) || 0);
    if (throttleMs > 0) {
      const bucket = getCloudSyncReportThrottleBucket(throttleKey);
      const last = bucket[op] || 0;
      if (now - last < throttleMs) return;
      bucket[op] = now;
    }
  } catch {
    // ignore helper throttling errors
  }

  let reported = false;
  try {
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
