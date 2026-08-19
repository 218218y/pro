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
import { _normalizeList, _normalizeModel } from './models_registry_normalization.js';
import {
  _getStoredModelsCollections,
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
    for (const preset of allPresets) {
      try {
        const pid = readModelId(preset);
        if (pid) byId.set(pid, preset);
      } catch (e) {
        _modelsReportNonFatal(App, 'ensureLoaded.order.map', e, 1500);
      }
    }

    const reordered: SavedModelLike[] = [];
    for (const orderEntry of order) {
      const orderedId = String(orderEntry || '').trim();
      if (!orderedId) continue;
      const preset = byId.get(orderedId);
      if (!preset) continue;
      reordered.push(preset);
      byId.delete(orderedId);
    }

    for (const preset of allPresets) {
      try {
        const pid = readModelId(preset);
        if (pid && byId.has(pid)) {
          reordered.push(preset);
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
    for (const model of list) {
      const id = readModelId(model);
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

  for (const record of stored) {
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
  const presets = asMutableModelsList(_normalizeList(state.presets, { App }));
  const corePresets: SavedModelLike[] = [];

  for (const preset of presets) {
    try {
      markModelAsCorePreset(preset);
    } catch (e) {
      _modelsReportNonFatal(App, 'ensureLoaded.corePreset', e, 1500);
    }
    const presetId = readModelId(preset);
    if (presetId && hidden.has(presetId)) continue;
    corePresets.push(preset);
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

  const corePresetIds = collectAvailablePresetIds(state.presets, []);
  const storedCollections = _getStoredModelsCollections(App, corePresetIds);
  const { userPresets, userModels } = splitStoredModels(App, storedCollections.savedModels);
  const hiddenPresetIds = new Set<string>(storedCollections.hiddenPresets);
  const presetOrder = storedCollections.presetOrder;
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
  for (const model of state.all) {
    if (model.id === id) return model;
  }
  return null;
}

export function exportUserModelsInternalImpl(App: AppContainer): SavedModelLike[] {
  ensureModelsLoadedInternalImpl(App, { silent: true });

  const state = getModelsRuntimeStateForApp(App);
  const user: SavedModelLike[] = [];
  for (const model of state.all) {
    if (!model.isPreset || model.isUserPreset) {
      const normalized = _normalizeModel(model, {
        App,
        op: 'exportUserModels',
        applyAppNormalizer: false,
      });
      if (normalized) user.push(normalized);
    }
  }

  for (const [index, userModel] of user.entries()) {
    try {
      const model = asMutableModelsList([userModel])[0];
      if (!model) continue;
      if (model.isPreset) markModelAsUserPreset(model);
      else markModelAsSavedModel(model);
      user[index] = model;
    } catch (e) {
      _modelsReportNonFatal(App, 'exportUserModels', e, 1500);
    }
  }

  return user;
}
