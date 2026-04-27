import type { AppContainer } from '../../../types';

import {
  type AppModelsState,
  type ModelsRuntimeState,
  asListenersList,
  asModelsList,
  isModelsNormalizer,
} from './models_registry_contracts.js';
import { _modelsReportNonFatal } from './models_registry_nonfatal.js';
import { getAppModels } from './models_registry_storage_keys.js';
import { getModelsRuntimeStateForApp } from './models_registry_state.js';

function buildModelsCompatibilitySnapshot(
  state: ModelsRuntimeState
): Pick<AppModelsState, '_normalizer' | '_presets' | '_loaded' | '_all' | '_listeners'> {
  return {
    _normalizer: isModelsNormalizer(state.normalizer) ? state.normalizer : null,
    _presets: asModelsList(state.presets),
    _loaded: !!state.loaded,
    _all: asModelsList(state.all),
    _listeners: asListenersList(state.listeners),
  };
}

export function syncModelsStateToApp(App: AppContainer): void {
  try {
    const models = getAppModels(App);
    const state = getModelsRuntimeStateForApp(App);
    if (models.__wpRuntimeState === state && models.__wpCompatRevision === state.revision) return;
    const snapshot = buildModelsCompatibilitySnapshot(state);
    models.__wpRuntimeState = state;
    models.__wpCompatRevision = state.revision;
    models._normalizer = snapshot._normalizer;
    models._presets = snapshot._presets;
    models._loaded = snapshot._loaded;
    models._all = snapshot._all;
    models._listeners = snapshot._listeners;
  } catch (e) {
    _modelsReportNonFatal(App, 'syncModelsStateToApp', e, 1500);
  }
}

export function _hydrateFromApp(App: AppContainer): void {
  try {
    syncModelsStateToApp(App);
  } catch (e) {
    _modelsReportNonFatal(App, 'hydrateFromApp', e, 1500);
  }
}

export function _notify(App?: AppContainer | null): void {
  const state = getModelsRuntimeStateForApp(App);
  const listeners = state.listeners.slice();
  const snapshot = asModelsList(state.all);
  for (let i = 0; i < listeners.length; i++) {
    try {
      listeners[i](snapshot);
    } catch (e) {
      _modelsReportNonFatal(App ?? null, 'notify', e, 1500);
    }
  }
}
