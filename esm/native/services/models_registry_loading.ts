import type { AppContainer, SavedModelLike } from '../../../types';

import {
  asMutableModelsList,
  markModelAsCorePreset,
  markModelAsSavedModel,
  markModelAsUserPreset,
  normalizeModelsOpts,
  readModelId,
} from './models_registry_contracts.js';
import { _modelsReportNonFatal } from './models_registry_nonfatal.js';
import { _cloneJSON, _normalizeList, _normalizeModel } from './models_registry_normalization.js';
import {
  _getStoredHiddenPresets,
  _getStoredPresetOrder,
  _getStoredUserModels,
  _hydrateFromApp,
  _notify,
  syncModelsStateToApp,
} from './models_registry_storage.js';
import { getModelsRuntimeStateForApp, markModelsRuntimeStateDirty } from './models_registry_state.js';

export function reorderPresetsByStoredOrder(
  App: AppContainer,
  allPresets: SavedModelLike[],
  order: string[]
): void {
  try {
    if (!order.length || allPresets.length <= 1) return;

    const byId = new Map<string, SavedModelLike>();
    for (let i = 0; i < allPresets.length; i++) {
      try {
        const pid = readModelId(allPresets[i]);
        if (pid) byId.set(pid, allPresets[i]);
      } catch (e) {
        _modelsReportNonFatal(App, 'ensureLoaded.order.map', e, 1500);
      }
    }

    const reordered: SavedModelLike[] = [];
    for (let i = 0; i < order.length; i++) {
      const orderedId = String(order[i] || '').trim();
      if (!orderedId) continue;
      const preset = byId.get(orderedId);
      if (!preset) continue;
      reordered.push(preset);
      byId.delete(orderedId);
    }

    for (let i = 0; i < allPresets.length; i++) {
      try {
        const pid = readModelId(allPresets[i]);
        if (pid && byId.has(pid)) {
          reordered.push(allPresets[i]);
          byId.delete(pid);
        }
      } catch (e) {
        _modelsReportNonFatal(App, 'ensureLoaded.order.append', e, 1500);
      }
    }

    allPresets.splice(0, allPresets.length, ...reordered);
  } catch (e) {
    _modelsReportNonFatal(App, 'ensureLoaded.order', e, 1500);
  }
}

export function collectAvailablePresetIds(
  corePresets: SavedModelLike[],
  userPresets: SavedModelLike[]
): Set<string> {
  const ids = new Set<string>();
  const addFrom = (list: SavedModelLike[]): void => {
    for (let i = 0; i < list.length; i++) {
      const id = readModelId(list[i]);
      if (id) ids.add(id);
    }
  };
  addFrom(corePresets);
  addFrom(userPresets);
  return ids;
}

export function splitStoredModels(
  App: AppContainer,
  storedModels: SavedModelLike[]
): { userPresets: SavedModelLike[]; userModels: SavedModelLike[] } {
  const stored = asMutableModelsList(_normalizeList(storedModels, { App }));
  const userPresets: SavedModelLike[] = [];
  const userModels: SavedModelLike[] = [];

  for (let i = 0; i < stored.length; i++) {
    const record = stored[i];
    if (!record) continue;
    if (record.isPreset) {
      try {
        markModelAsUserPreset(record);
      } catch (e) {
        _modelsReportNonFatal(App, 'ensureLoaded.userPreset', e, 1500);
      }
      userPresets.push(record);
      continue;
    }

    try {
      markModelAsSavedModel(record);
    } catch (e) {
      _modelsReportNonFatal(App, 'ensureLoaded.userModel', e, 1500);
    }
    userModels.push(record);
  }

  return { userPresets, userModels };
}

export function buildVisibleCorePresets(App: AppContainer, hidden: ReadonlySet<string>): SavedModelLike[] {
  const state = getModelsRuntimeStateForApp(App);
  const presets = asMutableModelsList(_normalizeList(_cloneJSON(state.presets), { App }));
  const corePresets: SavedModelLike[] = [];

  for (let i = 0; i < presets.length; i++) {
    try {
      markModelAsCorePreset(presets[i]);
    } catch (e) {
      _modelsReportNonFatal(App, 'ensureLoaded.corePreset', e, 1500);
    }
    const presetId = readModelId(presets[i]);
    if (presetId && hidden.has(presetId)) continue;
    corePresets.push(presets[i]);
  }

  return corePresets;
}

export function ensureModelsLoadedInternalImpl(
  App: AppContainer,
  opts?: { forceRebuild?: boolean; silent?: boolean }
): SavedModelLike[] {
  _hydrateFromApp(App);

  const state = getModelsRuntimeStateForApp(App);
  const safeOpts = normalizeModelsOpts(opts);
  if (state.loaded && !safeOpts.forceRebuild) return state.all.slice();

  const { userPresets, userModels } = splitStoredModels(App, _getStoredUserModels(App));
  const availablePresetIds = collectAvailablePresetIds(state.presets, userPresets);
  const hiddenPresetIds = new Set<string>(_getStoredHiddenPresets(App, availablePresetIds));
  const presetOrder = _getStoredPresetOrder(App, availablePresetIds);
  const allPresets = buildVisibleCorePresets(App, hiddenPresetIds).concat(userPresets);
  reorderPresetsByStoredOrder(App, allPresets, presetOrder);

  state.all = allPresets.concat(userModels);
  state.loaded = true;
  markModelsRuntimeStateDirty(state);
  syncModelsStateToApp(App);

  if (!safeOpts.silent) _notify(App);
  return state.all.slice();
}

export function getAllModelsInternalImpl(App: AppContainer): SavedModelLike[] {
  ensureModelsLoadedInternalImpl(App, { silent: true });
  return getModelsRuntimeStateForApp(App).all.slice();
}

export function getModelByIdInternalImpl(App: AppContainer, id: unknown): SavedModelLike | null {
  ensureModelsLoadedInternalImpl(App, { silent: true });
  if (!id) return null;

  const state = getModelsRuntimeStateForApp(App);
  for (let i = 0; i < state.all.length; i++) {
    if (state.all[i] && String(state.all[i].id) === String(id)) {
      return state.all[i];
    }
  }
  return null;
}

export function exportUserModelsInternalImpl(App: AppContainer): SavedModelLike[] {
  ensureModelsLoadedInternalImpl(App, { silent: true });

  const state = getModelsRuntimeStateForApp(App);
  const user: SavedModelLike[] = [];
  for (let i = 0; i < state.all.length; i++) {
    const model = state.all[i];
    if (model && (!model.isPreset || model.isUserPreset)) {
      const normalized = _normalizeModel(_cloneJSON(model));
      if (normalized) user.push(normalized);
    }
  }

  for (let i = 0; i < user.length; i++) {
    try {
      const model = asMutableModelsList([user[i]])[0];
      if (!model) continue;
      if (model.isPreset) markModelAsUserPreset(model);
      else markModelAsSavedModel(model);
      user[i] = model;
    } catch (e) {
      _modelsReportNonFatal(App, 'exportUserModels', e, 1500);
    }
  }

  return user;
}
