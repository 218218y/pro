import type { AppContainer } from '../../../types';

import {
  type ModelsRuntimeState,
  asListenersList,
  asModelsList,
  isModelsNormalizer,
  modelsRuntimeState,
} from './models_registry_contracts.js';
import { getAppModels } from './models_registry_storage_keys.js';

export function createModelsRuntimeState(): ModelsRuntimeState {
  return {
    normalizer: null,
    presets: [],
    loaded: false,
    all: [],
    listeners: [],
    revision: 0,
  };
}

function cloneModelsRuntimeStateFromSurface(surface: Record<string, unknown>): ModelsRuntimeState {
  return {
    normalizer: isModelsNormalizer(surface._normalizer) ? surface._normalizer : null,
    presets: Array.isArray(surface._presets) ? asModelsList(surface._presets) : [],
    loaded: !!surface._loaded,
    all: Array.isArray(surface._all) ? asModelsList(surface._all) : [],
    listeners: Array.isArray(surface._listeners) ? asListenersList(surface._listeners) : [],
    revision: Number.isFinite((surface as { __wpCompatRevision?: unknown }).__wpCompatRevision)
      ? Number((surface as { __wpCompatRevision?: unknown }).__wpCompatRevision)
      : 0,
  };
}

export function getModelsRuntimeStateForApp(App: AppContainer | null | undefined): ModelsRuntimeState {
  if (!App) return modelsRuntimeState;
  const models = getAppModels(App);
  const existing = models.__wpRuntimeState;
  if (existing) return existing;
  const next = cloneModelsRuntimeStateFromSurface(models);
  models.__wpRuntimeState = next;
  return next;
}

export function resetModelsRuntimeStateForApp(App: AppContainer | null | undefined): ModelsRuntimeState {
  const next = createModelsRuntimeState();
  if (!App) {
    modelsRuntimeState.normalizer = next.normalizer;
    modelsRuntimeState.presets = next.presets;
    modelsRuntimeState.loaded = next.loaded;
    modelsRuntimeState.all = next.all;
    modelsRuntimeState.listeners = next.listeners;
    modelsRuntimeState.revision = next.revision;
    return modelsRuntimeState;
  }
  const models = getAppModels(App);
  models.__wpRuntimeState = next;
  return next;
}

export function markModelsRuntimeStateDirty(state: ModelsRuntimeState): number {
  const nextRevision = Number.isFinite(state.revision) ? state.revision + 1 : 1;
  state.revision = nextRevision;
  return nextRevision;
}
