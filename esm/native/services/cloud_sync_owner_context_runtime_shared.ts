import type {
  AppContainer,
  CloudSyncClipboardLike,
  CloudSyncPromptSinkLike,
  CloudSyncStorageValueStoreLike,
} from '../../../types';

import { getNavigatorMaybe, getWindowMaybe } from '../runtime/api.js';
import { asRecord } from '../runtime/record.js';

export type StorageLike = {
  KEYS?: { SAVED_MODELS?: string; SAVED_COLORS?: string };
  getString?(key: unknown): string | null;
  setString?(key: unknown, value: unknown): boolean;
  getJSON?<T>(key: unknown, defaultValue: T): T;
  setJSON?(key: unknown, value: unknown): boolean;
  remove?(key: unknown): boolean;
};

export type CloudSyncReportNonFatal = (
  app: AppContainer,
  op: string,
  error: unknown,
  opts?: { throttleMs?: number; noConsole?: boolean }
) => void;

export const CLOUD_SYNC_CLIENT_KEY = 'wp_cloud_sync_client_id';
export const CLOUD_SYNC_DIAG_LS_KEY = 'WP_CLOUDSYNC_DIAG';

export function isCloudSyncStorageLike(v: unknown): v is StorageLike {
  const rec = asRecord<StorageLike>(v);
  if (!rec) return false;
  return (
    (typeof rec.getString === 'undefined' || typeof rec.getString === 'function') &&
    (typeof rec.setString === 'undefined' || typeof rec.setString === 'function') &&
    (typeof rec.getJSON === 'undefined' || typeof rec.getJSON === 'function') &&
    (typeof rec.setJSON === 'undefined' || typeof rec.setJSON === 'function') &&
    (typeof rec.remove === 'undefined' || typeof rec.remove === 'function')
  );
}

export function resolveCloudSyncOwnerStorageKeys(storage: StorageLike): {
  keyModels: string;
  keyColors: string;
  keyColorOrder: string;
  keyPresetOrder: string;
  keyHiddenPresets: string;
} {
  const keyModels =
    storage.KEYS && storage.KEYS.SAVED_MODELS ? String(storage.KEYS.SAVED_MODELS) : 'wardrobeSavedModels';
  const keyColors =
    storage.KEYS && storage.KEYS.SAVED_COLORS ? String(storage.KEYS.SAVED_COLORS) : 'wardrobeSavedColors';
  return {
    keyModels,
    keyColors,
    keyColorOrder: `${keyColors}:order`,
    keyPresetOrder: `${keyModels}:presetOrder`,
    keyHiddenPresets: `${keyModels}:hiddenPresets`,
  };
}

export function getCloudSyncDiagStorageMaybe(App: AppContainer): CloudSyncStorageValueStoreLike | null {
  const ls = getWindowMaybe(App)?.localStorage || null;
  return ls && typeof ls.setItem === 'function' ? ls : null;
}

export function getCloudSyncClipboardMaybe(App: AppContainer): CloudSyncClipboardLike | null {
  const cb = getNavigatorMaybe(App)?.clipboard || null;
  return cb && typeof cb.writeText === 'function' ? cb : null;
}

export function getCloudSyncPromptSinkMaybe(App: AppContainer): CloudSyncPromptSinkLike | null {
  const w = getWindowMaybe(App);
  return w && typeof w.prompt === 'function' ? w : null;
}
