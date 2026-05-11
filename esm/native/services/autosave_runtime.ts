import { logViaPlatform } from '../runtime/platform_access.js';
import { reportError } from '../runtime/errors.js';
import { getAutosaveServiceMaybe } from '../runtime/autosave_access.js';

import {
  canAutosaveRun,
  getAutosaveStorageKey,
  isAutosaveServiceLike,
  stampAutosaveInfoUi,
  writeAutosavePayloadToStorage,
} from './autosave_shared.js';
import { captureAutosaveSnapshot } from './autosave_snapshot.js';

import type { AppContainer, AutosaveServiceLike } from '../../../types';

export function commitAutosaveNow(App: AppContainer): boolean {
  if (!canAutosaveRun(App)) return false;

  const dataObj = captureAutosaveSnapshot(App);
  if (!dataObj) return false;

  dataObj.version = '2.1';
  dataObj.timestamp = Date.now();
  dataObj.dateString = new Date().toLocaleTimeString();

  const storageKey = getAutosaveStorageKey(App);
  const ok = writeAutosavePayloadToStorage(App, storageKey, dataObj);

  if (!ok) {
    reportError(
      App,
      new Error('Autosave storage write failed'),
      { where: 'services/autosave', op: 'commitAutosaveNow.writeStorage', storageKey, nonFatal: true },
      { consoleFallback: false }
    );
  }

  if (ok) {
    try {
      stampAutosaveInfoUi(App, dataObj);
    } catch {
      // ignore
    }
  }

  try {
    logViaPlatform(
      App,
      (ok ? '✅ Auto-saved at ' : '⚠️ Auto-save skipped (storage unavailable) at ') +
        String(dataObj.dateString || '')
    );
  } catch {
    // ignore
  }

  return ok;
}

export function getAutosaveService(App: AppContainer): AutosaveServiceLike | null {
  try {
    const svc = getAutosaveServiceMaybe(App);
    return isAutosaveServiceLike(svc) ? svc : null;
  } catch {
    return null;
  }
}
