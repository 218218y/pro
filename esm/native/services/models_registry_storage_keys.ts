import type { AppContainer } from '../../../types';

import { getHistorySystemMaybe } from '../runtime/history_system_access.js';
import { ensureModelsService } from '../runtime/models_access.js';
import { getStorageServiceMaybe } from '../runtime/storage_access.js';

import {
  type AppModelsState,
  type HistorySystemLike,
  type StorageLike,
  type UtilLike,
  isAppModelsState,
  isStorageLike,
  isUtilLike,
} from './models_registry_contracts.js';
import { _modelsReportNonFatal } from './models_registry_nonfatal.js';

export function getAppModels(App: AppContainer): AppModelsState {
  const models = ensureModelsService(App);
  if (isAppModelsState(models)) return models;
  return models;
}

export function getStorage(App: AppContainer): StorageLike | null {
  const storage = getStorageServiceMaybe(App);
  return isStorageLike(storage) ? storage : null;
}

export function getUtil(App: AppContainer): UtilLike | null {
  return isUtilLike(App.util) ? App.util : null;
}

export function getHistorySystem(App: AppContainer): HistorySystemLike | null {
  return getHistorySystemMaybe(App);
}

export function _key(App: AppContainer): string {
  try {
    const st = getStorage(App);
    const k = st && st.KEYS && st.KEYS.SAVED_MODELS;
    if (typeof k === 'string' && k.trim()) return k;
  } catch (e) {
    _modelsReportNonFatal(App, 'key', e, 1500);
  }
  return 'savedModels';
}

export function _keyPresetOrder(App: AppContainer): string {
  try {
    return _key(App) + ':presetOrder';
  } catch (e) {
    _modelsReportNonFatal(App, 'keyPresetOrder', e, 1500);
  }
  return 'savedModels:presetOrder';
}

export function _keyHiddenPresets(App: AppContainer): string {
  try {
    return _key(App) + ':hiddenPresets';
  } catch (e) {
    _modelsReportNonFatal(App, 'keyHiddenPresets', e, 1500);
  }
  return 'savedModels:hiddenPresets';
}
