import type { ModelsLoadOptions, ModelsMergeResult, ModelsNormalizer, SavedModelLike } from '../../../types';

import { readMergeResult, readOneArgUnknownFn, readSavedModelList } from './models_access_shared.js';
import { getModelsServiceMaybe, getModelsServiceSourceMaybe } from './models_access_service.js';

export function ensureModelsLoadedViaService(App: unknown, opts?: ModelsLoadOptions): boolean {
  try {
    const svc = getModelsServiceMaybe(App);
    if (svc && typeof svc.ensureLoaded === 'function') {
      svc.ensureLoaded(opts);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function ensureModelsLoadedViaServiceOrThrow(
  App: unknown,
  opts?: ModelsLoadOptions,
  label = 'services.models.ensureLoaded'
): void {
  const source = getModelsServiceSourceMaybe(App);
  const ensureLoaded = source
    ? readOneArgUnknownFn<ModelsLoadOptions | undefined>(source.ensureLoaded)
    : null;
  if (!ensureLoaded) {
    throw new Error(`[WardrobePro] ${label} requires canonical services.models.ensureLoaded(opts).`);
  }
  ensureLoaded(opts);
}

export function exportUserModelsViaService(App: unknown): SavedModelLike[] {
  try {
    const svc = getModelsServiceMaybe(App);
    if (svc && typeof svc.exportUserModels === 'function') {
      return readSavedModelList(svc.exportUserModels());
    }
  } catch {
    // ignore
  }
  return [];
}

export function mergeImportedModelsViaService(App: unknown, list: SavedModelLike[]): ModelsMergeResult {
  try {
    const svc = getModelsServiceMaybe(App);
    if (svc && typeof svc.mergeImportedModels === 'function') {
      return readMergeResult(svc.mergeImportedModels(readSavedModelList(list)));
    }
  } catch {
    // ignore
  }
  return { added: 0, updated: 0 };
}

export function mergeImportedModelsViaServiceOrThrow(
  App: unknown,
  list: SavedModelLike[],
  label = 'services.models.mergeImportedModels'
): ModelsMergeResult {
  const source = getModelsServiceSourceMaybe(App);
  const mergeImportedModels = source
    ? readOneArgUnknownFn<SavedModelLike[]>(source.mergeImportedModels)
    : null;
  if (!mergeImportedModels) {
    throw new Error(`[WardrobePro] ${label} requires canonical services.models.mergeImportedModels(list).`);
  }
  return readMergeResult(mergeImportedModels(readSavedModelList(list)));
}

export function setModelNormalizerViaService(App: unknown, normalizer: ModelsNormalizer | null): boolean {
  try {
    const svc = getModelsServiceMaybe(App);
    if (svc && typeof svc.setNormalizer === 'function') {
      svc.setNormalizer(normalizer);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function setPresetModelsViaService(App: unknown, presets: SavedModelLike[]): boolean {
  try {
    const svc = getModelsServiceMaybe(App);
    if (svc && typeof svc.setPresets === 'function') {
      svc.setPresets(readSavedModelList(presets));
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}
