import { logViaPlatform } from '../runtime/platform_access.js';
import { getAutosaveServiceMaybe } from '../runtime/autosave_access.js';

import {
  getAutosaveStorageKey,
  isAutosaveServiceLike,
  readAutosaveReadiness,
  stampAutosaveInfoUi,
  writeAutosavePayloadToStorage,
} from './autosave_shared.js';
import { captureAutosaveSnapshot } from './autosave_snapshot.js';
import { reportServiceNonFatal } from './service_error_observability.js';

import type { AppContainer, AutosaveOwnerRefreshResult, AutosaveServiceLike } from '../../../types';

function reportAutosaveRuntimeNonFatal(App: AppContainer, op: string, error: unknown): void {
  reportServiceNonFatal(
    App,
    error,
    { where: 'native/services/autosave_runtime', op },
    { consoleOutput: false }
  );
}

export function commitAutosaveNowResult(App: AppContainer): AutosaveOwnerRefreshResult {
  const readiness = readAutosaveReadiness(App);
  if (readiness.ok === false) {
    return { ok: false, reason: 'autosave-not-ready', detail: readiness.detail };
  }

  const dataObj = captureAutosaveSnapshot(App);
  if (!dataObj) {
    reportAutosaveRuntimeNonFatal(
      App,
      'commitAutosaveNow.snapshotUnavailable',
      new Error('Autosave snapshot is unavailable')
    );
    return { ok: false, reason: 'snapshot-unavailable' };
  }

  dataObj.timestamp = Date.now();
  dataObj.dateString = new Date().toLocaleTimeString();

  const storageKey = getAutosaveStorageKey(App);
  const writeResult = writeAutosavePayloadToStorage(App, storageKey, dataObj);

  if (writeResult.ok === false) {
    reportAutosaveRuntimeNonFatal(
      App,
      writeResult.reason === 'storage-threw'
        ? 'commitAutosaveNow.writeStorageException'
        : 'commitAutosaveNow.writeStorageRejected',
      new Error('Autosave storage write failed')
    );
  } else {
    stampAutosaveInfoUi(App, dataObj);
  }

  logViaPlatform(
    App,
    (writeResult.ok ? '✅ Auto-saved at ' : '⚠️ Auto-save skipped (storage unavailable) at ') +
      String(dataObj.dateString || '')
  );

  return writeResult.ok ? { ok: true } : { ok: false, reason: 'storage-write-failed' };
}

export function commitAutosaveNow(App: AppContainer): boolean {
  return commitAutosaveNowResult(App).ok;
}

export function getAutosaveService(App: AppContainer): AutosaveServiceLike | null {
  try {
    const svc = getAutosaveServiceMaybe(App);
    return isAutosaveServiceLike(svc) ? svc : null;
  } catch (error) {
    reportAutosaveRuntimeNonFatal(App, 'getAutosaveService.readOwner', error);
    return null;
  }
}
