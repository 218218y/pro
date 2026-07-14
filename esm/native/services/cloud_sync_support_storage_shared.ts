import type { AppContainer } from '../../../types';

import { getStorageServiceMaybe } from '../runtime/storage_access.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support_feedback.js';
import { asRecord } from './cloud_sync_support_shared.js';

export type StorageLike = {
  KEYS?: { SAVED_MODELS?: string; SAVED_COLORS?: string };
  getString?(key: unknown): string | null;
  setString?(key: unknown, value: unknown): boolean;
  getJSON?<T>(key: unknown, defaultValue: T): T;
  setJSON?(key: unknown, value: unknown): boolean;
  remove?(key: unknown): boolean;
};

export function isStorageLike(v: unknown): v is StorageLike {
  const rec = asRecord(v);
  return (
    !!rec &&
    (typeof rec.getString === 'undefined' || typeof rec.getString === 'function') &&
    (typeof rec.setString === 'undefined' || typeof rec.setString === 'function') &&
    (typeof rec.getJSON === 'undefined' || typeof rec.getJSON === 'function') &&
    (typeof rec.setJSON === 'undefined' || typeof rec.setJSON === 'function') &&
    (typeof rec.remove === 'undefined' || typeof rec.remove === 'function')
  );
}

export function getStorage(App: AppContainer): StorageLike | null {
  try {
    const storage = getStorageServiceMaybe(App);
    return isStorageLike(storage) ? storage : null;
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'getStorage.read', e, { throttleMs: 8000 });
    return null;
  }
}
