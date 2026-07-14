import type { AppContainer, SavedModelLike } from '../../../types';

import {
  readCloudCollectionsEnvelopeViaServiceOrThrow,
  updateCloudCollectionsViaServiceOrThrow,
} from '../runtime/cloud_collections_access.js';
import {
  asMutableModelsList,
  asMutableSavedModel,
  markModelAsSavedModel,
  markModelAsUserPreset,
  readModelId,
} from './models_registry_contracts.js';
import { _modelsReportNonFatal } from './models_registry_nonfatal.js';
import { _normalizeList } from './models_registry_normalization.js';
import { getModelsRuntimeStateForApp } from './models_registry_state.js';

function normalizeIdList(ids: readonly unknown[]): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < ids.length; i++) {
    const id = String(ids[i] || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function filterAvailableIds(ids: string[], availableIds?: ReadonlySet<string> | null): string[] {
  if (!availableIds || availableIds.size <= 0) return ids.slice();
  const out: string[] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (availableIds.has(id)) out.push(id);
  }
  return out;
}

function stringifyComparable(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function persistCollectionsMutation(
  App: AppContainer,
  mutation: Parameters<typeof updateCloudCollectionsViaServiceOrThrow>[1]
): boolean {
  try {
    updateCloudCollectionsViaServiceOrThrow(App, mutation, 'models registry persistence');
    return true;
  } catch (e) {
    _modelsReportNonFatal(App, 'persistCollectionsMutation', e, 1500);
  }
  return false;
}

export function _getStoredHiddenPresets(
  App: AppContainer,
  availableIds?: ReadonlySet<string> | null
): string[] {
  try {
    const raw = readCloudCollectionsEnvelopeViaServiceOrThrow(
      App,
      'models hidden presets read'
    ).hiddenPresets;
    const normalized = filterAvailableIds(normalizeIdList(raw), availableIds);
    if (stringifyComparable(raw) !== stringifyComparable(normalized))
      persistCollectionsMutation(App, { hiddenPresets: normalized });
    return normalized;
  } catch (e) {
    _modelsReportNonFatal(App, 'getStoredHiddenPresets', e, 1500);
  }
  return [];
}

export function _setStoredHiddenPresets(App: AppContainer, ids: string[]): boolean {
  return persistCollectionsMutation(App, { hiddenPresets: normalizeIdList(ids) });
}

export function _getStoredPresetOrder(
  App: AppContainer,
  availableIds?: ReadonlySet<string> | null
): string[] {
  try {
    const raw = readCloudCollectionsEnvelopeViaServiceOrThrow(App, 'models preset order read').presetOrder;
    const normalized = filterAvailableIds(normalizeIdList(raw), availableIds);
    if (stringifyComparable(raw) !== stringifyComparable(normalized))
      persistCollectionsMutation(App, { presetOrder: normalized });
    return normalized;
  } catch (e) {
    _modelsReportNonFatal(App, 'getStoredPresetOrder', e, 1500);
  }
  return [];
}

export function _setStoredPresetOrder(App: AppContainer, ids: string[]): boolean {
  return persistCollectionsMutation(App, { presetOrder: normalizeIdList(ids) });
}

export function _persistPresetOrder(App: AppContainer): void {
  try {
    const state = getModelsRuntimeStateForApp(App);
    const ids: string[] = [];
    for (let i = 0; i < state.all.length; i++) {
      const model = state.all[i];
      if (!model || !model.isPreset) continue;
      const id = readModelId(model);
      if (id) ids.push(id);
    }
    _setStoredPresetOrder(App, ids);
  } catch (e) {
    _modelsReportNonFatal(App, 'persistPresetOrder', e, 1500);
  }
}

export function _getStoredUserModels(App: AppContainer): SavedModelLike[] {
  try {
    const raw = readCloudCollectionsEnvelopeViaServiceOrThrow(App, 'models saved models read').savedModels;
    const normalized = _normalizeList(raw);
    if (stringifyComparable(raw) !== stringifyComparable(normalized))
      persistCollectionsMutation(App, { savedModels: normalized });
    return normalized;
  } catch (e) {
    _modelsReportNonFatal(App, 'getStoredUserModels', e, 1500);
  }
  return [];
}

export function _setStoredUserModels(App: AppContainer, list: SavedModelLike[]): boolean {
  return persistCollectionsMutation(App, { savedModels: list });
}

export function _persistUserOnly(App: AppContainer): void {
  try {
    const state = getModelsRuntimeStateForApp(App);
    const userOnly: SavedModelLike[] = [];

    for (let i = 0; i < state.all.length; i++) {
      const model = asMutableSavedModel(state.all[i]);
      if (!model) continue;
      if (!model.isPreset || model.isUserPreset) userOnly.push(model);
    }

    const normalized = asMutableModelsList(_normalizeList(userOnly));
    for (let i = 0; i < normalized.length; i++) {
      const record = normalized[i];
      if (record.isPreset) {
        try {
          markModelAsUserPreset(record);
        } catch (e) {
          _modelsReportNonFatal(App, 'persistUserOnly.preset', e, 1500);
        }
      } else {
        try {
          markModelAsSavedModel(record);
        } catch (e) {
          _modelsReportNonFatal(App, 'persistUserOnly.saved', e, 1500);
        }
      }
    }

    _setStoredUserModels(App, normalized);
  } catch (e) {
    _modelsReportNonFatal(App, 'persistUserOnly', e, 1500);
  }
}
