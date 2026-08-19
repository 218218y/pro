import type { AppContainer, ModelsChangeListener, ModelsNormalizer, SavedModelLike } from '../../../types';

import { type ModelsRuntimeState, asListenersList, isModelsNormalizer } from './models_registry_contracts.js';
import { _modelsReportNonFatal } from './models_registry_nonfatal.js';
import { _cloneJSON } from './models_registry_normalization.js';
import { getAppModels } from './models_registry_storage_keys.js';
import { getModelsRuntimeStateForApp } from './models_registry_state.js';

type ModelsRuntimeMirrorSnapshot = {
  _normalizer: ModelsNormalizer | null;
  _presets: SavedModelLike[];
  _loaded: boolean;
  _all: SavedModelLike[];
  _listeners: ModelsChangeListener[];
};

function buildModelsRuntimeMirrorSnapshot(
  App: AppContainer,
  state: ModelsRuntimeState
): ModelsRuntimeMirrorSnapshot | null {
  const presets = _cloneJSON(state.presets, { App, op: 'syncModelsStateToApp.presets' });
  const all = _cloneJSON(state.all, { App, op: 'syncModelsStateToApp.all' });
  if (!presets || !all) return null;
  return {
    _normalizer: isModelsNormalizer(state.normalizer) ? state.normalizer : null,
    _presets: presets,
    _loaded: !!state.loaded,
    _all: all,
    _listeners: asListenersList(state.listeners),
  };
}

export function syncModelsStateToApp(App: AppContainer): void {
  try {
    const models = getAppModels(App);
    const state = getModelsRuntimeStateForApp(App);
    if (models.__wpRuntimeState === state && models.__wpRuntimeMirrorRevision === state.revision) return;
    const snapshot = buildModelsRuntimeMirrorSnapshot(App, state);
    if (!snapshot) return;
    models.__wpRuntimeState = state;
    models.__wpRuntimeMirrorRevision = state.revision;
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
  for (const listener of listeners) {
    const snapshot = _cloneJSON(state.all, {
      App: App ?? null,
      op: 'notify.listenerSnapshot',
    });
    if (!snapshot) return;
    try {
      listener(snapshot);
    } catch (e) {
      _modelsReportNonFatal(App ?? null, 'notify', e, 1500);
    }
  }
}
