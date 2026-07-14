import type {
  AppContainer,
  ModelsChangeListener,
  ModelsMergeResult,
  ModelsNormalizer,
  SavedModelLike,
} from '../../../types';

import {
  asMutableModelsList,
  asMutableSavedModel,
  isModelsChangeListener,
  isModelsNormalizer,
  markModelAsSavedModel,
  readModelId,
  readModelName,
} from './models_registry_contracts.js';
import { _modelsReportNonFatal } from './models_registry_nonfatal.js';
import { _cloneJSON, _normalizeList } from './models_registry_normalization.js';
import { ensureModelsLoadedInternalImpl } from './models_registry_loading.js';
import { _hydrateFromApp, syncModelsStateToApp } from './models_registry_storage.js';
import { getModelsRuntimeStateForApp, markModelsRuntimeStateDirty } from './models_registry_state.js';
import {
  collectPersistedUserModels,
  runModelsCollectionsTransaction,
} from './models_collections_transaction.js';

export function normalizeNameKey(value: unknown): string {
  try {
    return (typeof value === 'string' ? value : '').toLowerCase().replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

export function createImportedModelId(): string {
  return `imported_model_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function areModelValuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!areModelValuesEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const aRec = a as Record<string, unknown>;
  const bRec = b as Record<string, unknown>;
  const aKeys = Object.keys(aRec);
  const bKeys = Object.keys(bRec);
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i += 1) {
    const key = aKeys[i];
    if (!Object.prototype.hasOwnProperty.call(bRec, key)) return false;
    if (!areModelValuesEqual(aRec[key], bRec[key])) return false;
  }
  return true;
}

function areModelsListsEqual(current: SavedModelLike[], next: SavedModelLike[]): boolean {
  if (current === next) return true;
  if (current.length !== next.length) return false;
  for (let i = 0; i < current.length; i += 1) {
    if (!areModelValuesEqual(current[i], next[i])) return false;
  }
  return true;
}

export function setModelsNormalizerInternalImpl(App: AppContainer, fn: ModelsNormalizer | null): void {
  _hydrateFromApp(App);

  const state = getModelsRuntimeStateForApp(App);
  const nextNormalizer = isModelsNormalizer(fn) ? fn : null;
  if (state.normalizer === nextNormalizer) return;
  state.normalizer = nextNormalizer;
  markModelsRuntimeStateDirty(state);
  syncModelsStateToApp(App);

  if (!state.loaded) return;
  try {
    ensureModelsLoadedInternalImpl(App, { forceRebuild: true, silent: false });
  } catch (e) {
    _modelsReportNonFatal(App, 'setModelsNormalizer.rebuild', e, 1500);
  }
}

export function setModelPresetsInternalImpl(App: AppContainer, presetsArr: SavedModelLike[]): void {
  _hydrateFromApp(App);

  const state = getModelsRuntimeStateForApp(App);
  const nextPresets = _normalizeList(_cloneJSON(presetsArr));
  for (let i = 0; i < nextPresets.length; i++) {
    try {
      nextPresets[i].isPreset = true;
    } catch (e) {
      _modelsReportNonFatal(App, 'setModelPresets.markPreset', e, 1500);
    }
  }
  if (areModelsListsEqual(state.presets, nextPresets)) return;
  state.presets = nextPresets;
  markModelsRuntimeStateDirty(state);
  syncModelsStateToApp(App);

  if (!state.loaded) return;
  try {
    ensureModelsLoadedInternalImpl(App, { forceRebuild: true, silent: false });
  } catch (e) {
    _modelsReportNonFatal(App, 'setModelPresets.rebuild', e, 1500);
  }
}

export async function mergeImportedModelsInternalImpl(
  App: AppContainer,
  list: SavedModelLike[]
): Promise<ModelsMergeResult> {
  ensureModelsLoadedInternalImpl(App, { silent: true });
  const incomingSource = _normalizeList(list, { preferLatestDuplicateIds: true, App });
  const transaction = await runModelsCollectionsTransaction<ModelsMergeResult>(App, snapshot => {
    const incoming = asMutableModelsList(_cloneJSON(incomingSource));
    const current = snapshot.saved;
    const byId = new Map<string, number>();
    const byName = new Map<string, number>();
    for (let i = 0; i < current.length; i++) {
      const model = current[i];
      const id = readModelId(model);
      if (id) byId.set(id, i);
      const normalizedName = normalizeNameKey(readModelName(model));
      if (normalizedName) byName.set(normalizedName, i);
    }

    let added = 0;
    let updated = 0;
    for (const model of incoming) {
      try {
        markModelAsSavedModel(model);
      } catch (error) {
        _modelsReportNonFatal(App, 'mergeImportedModels.flags', error, 1500);
      }
      const incomingId = readModelId(model);
      const incomingName = normalizeNameKey(readModelName(model));
      const existingIndex = incomingId
        ? (byId.get(incomingId) ?? -1)
        : incomingName
          ? (byName.get(incomingName) ?? -1)
          : -1;

      if (existingIndex >= 0) {
        const previous = asMutableSavedModel(current[existingIndex]);
        const previousNameKey = normalizeNameKey(readModelName(previous));
        const keepId = readModelId(previous) || incomingId || createImportedModelId();
        const nextLocked = typeof model.locked === 'boolean' ? !!model.locked : !!previous?.locked;
        model.id = keepId;
        if (nextLocked) model.locked = true;
        else delete model.locked;
        if (areModelValuesEqual(previous, model)) {
          byId.set(keepId, existingIndex);
          if (incomingName) byName.set(incomingName, existingIndex);
          continue;
        }
        current[existingIndex] = model;
        updated += 1;
        byId.set(keepId, existingIndex);
        if (
          previousNameKey &&
          previousNameKey !== incomingName &&
          byName.get(previousNameKey) === existingIndex
        ) {
          byName.delete(previousNameKey);
        }
        if (incomingName) byName.set(incomingName, existingIndex);
        continue;
      }

      if (!model.id) model.id = createImportedModelId();
      let nextId = readModelId(model);
      while (!nextId || byId.has(nextId)) {
        model.id = createImportedModelId();
        nextId = readModelId(model);
      }
      const insertAt = current.length;
      current.push(model);
      byId.set(nextId, insertAt);
      if (incomingName) byName.set(incomingName, insertAt);
      added += 1;
    }

    return {
      result: { added, updated },
      mutation:
        added > 0 || updated > 0
          ? { savedModels: collectPersistedUserModels(snapshot.presets, current) }
          : {},
    };
  });

  if (transaction.ok === false) {
    return {
      ok: false,
      reason: transaction.failure.reason,
      message: transaction.failure.message,
      added: 0,
      updated: 0,
    };
  }
  return transaction.value;
}

export function onModelsChangeInternalImpl(App: AppContainer, fn: ModelsChangeListener): void {
  _hydrateFromApp(App);
  if (!isModelsChangeListener(fn)) return;
  const state = getModelsRuntimeStateForApp(App);
  if (state.listeners.indexOf(fn) !== -1) return;
  state.listeners.push(fn);
  markModelsRuntimeStateDirty(state);
  syncModelsStateToApp(App);
}

export function offModelsChangeInternalImpl(App: AppContainer, fn: ModelsChangeListener): void {
  _hydrateFromApp(App);
  if (!isModelsChangeListener(fn)) return;
  const state = getModelsRuntimeStateForApp(App);
  const index = state.listeners.indexOf(fn);
  if (index < 0) return;
  state.listeners.splice(index, 1);
  markModelsRuntimeStateDirty(state);
  syncModelsStateToApp(App);
}
