import { logViaPlatform } from '../runtime/platform_access.js';
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

  const ok = writeAutosavePayloadToStorage(App, getAutosaveStorageKey(App), dataObj);

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
