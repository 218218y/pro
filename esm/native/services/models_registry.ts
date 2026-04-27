// Internal registry/state helpers for the Saved Models service.
// Keeps canonical owner/public surface in `models.ts` while moving heavy policy out of the owner.

import type {
  AppContainer,
  ModelsChangeListener,
  ModelsMergeResult,
  ModelsNormalizer,
  SavedModelLike,
} from '../../../types';

import {
  ensureModelsLoadedInternalImpl,
  exportUserModelsInternalImpl,
  getAllModelsInternalImpl,
  getModelByIdInternalImpl,
  mergeImportedModelsInternalImpl,
  offModelsChangeInternalImpl,
  onModelsChangeInternalImpl,
  setModelPresetsInternalImpl,
  setModelsNormalizerInternalImpl,
} from './models_registry_runtime.js';

import type {
  AppModelsState,
  HistorySystemLike,
  ModelsOpts,
  ModelsRuntimeState,
  MutableSavedModel,
  PdfDraftSnapshotLike,
  StorageLike,
  UtilLike,
} from './models_registry_contracts.js';

export type {
  AppModelsState,
  HistorySystemLike,
  ModelsOpts,
  ModelsRuntimeState,
  MutableSavedModel,
  PdfDraftSnapshotLike,
  StorageLike,
  UtilLike,
};

export {
  asMutableModelsList,
  asMutableSavedModel,
  cloneSavedModel,
  hasMeaningfulOrderPdfDraft,
  isModelsChangeListener,
  isModelsNormalizer,
  isObject,
  markModelAsCorePreset,
  markModelAsSavedModel,
  markModelAsUserPreset,
  modelsRuntimeState,
  normalizeModelsOpts,
  readModelId,
  readModelName,
  readUiPdfState,
  syncPresetFlags,
  _attachPdfEditorDraft,
  _cloneJSON,
  _modelsReportNonFatal,
  _normalizeList,
  _normalizeModel,
} from './models_registry_shared.js';

export {
  createModelsRuntimeState,
  getModelsRuntimeStateForApp,
  resetModelsRuntimeStateForApp,
} from './models_registry_state.js';

export {
  _getStoredHiddenPresets,
  _getStoredPresetOrder,
  _getStoredUserModels,
  _hydrateFromApp,
  _key,
  _keyHiddenPresets,
  _keyPresetOrder,
  _notify,
  _persistPresetOrder,
  _persistUserOnly,
  _setStoredHiddenPresets,
  _setStoredPresetOrder,
  _setStoredUserModels,
  getAppModels,
  getHistorySystem,
  getStorage,
  getUtil,
  syncModelsStateToApp,
} from './models_registry_storage.js';

export function setModelsNormalizerInternal(App: AppContainer, fn: ModelsNormalizer | null): void {
  setModelsNormalizerInternalImpl(App, fn);
}

export function setModelPresetsInternal(App: AppContainer, presetsArr: SavedModelLike[]): void {
  setModelPresetsInternalImpl(App, presetsArr);
}

export function ensureModelsLoadedInternal(App: AppContainer, opts?: ModelsOpts): SavedModelLike[] {
  return ensureModelsLoadedInternalImpl(App, opts);
}

export function getAllModelsInternal(App: AppContainer): SavedModelLike[] {
  return getAllModelsInternalImpl(App);
}

export function getModelByIdInternal(App: AppContainer, id: unknown): SavedModelLike | null {
  return getModelByIdInternalImpl(App, id);
}

export function exportUserModelsInternal(App: AppContainer): SavedModelLike[] {
  return exportUserModelsInternalImpl(App);
}

export function mergeImportedModelsInternal(App: AppContainer, list: SavedModelLike[]): ModelsMergeResult {
  return mergeImportedModelsInternalImpl(App, list);
}

export function onModelsChangeInternal(App: AppContainer, fn: ModelsChangeListener): void {
  onModelsChangeInternalImpl(App, fn);
}

export function offModelsChangeInternal(App: AppContainer, fn: ModelsChangeListener): void {
  offModelsChangeInternalImpl(App, fn);
}
