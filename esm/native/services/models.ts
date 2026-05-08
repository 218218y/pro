// Native ESM implementation of Saved Models service.
//
// Goals:
// - No `js/**` imports on the ESM path.
// - No IIFE / implicit globals.
// - Keep saved-model service behavior stable.
//
// This service persists user models via `App.services.storage` and applies models via `App.services.projectIO`.
// Canonical API surface is `App.services.models`.

import type {
  AppContainer,
  ModelsChangeListener,
  ModelsCommandResult,
  ModelsDeleteTemporaryResult,
  ModelsLoadOptions,
  ModelsLockResult,
  ModelsMergeResult,
  ModelsNormalizer,
  ModelsMoveDirection,
  ModelsSaveResult,
  ModelsServiceLike,
  ModelsTransferPosition,
  ModelsTransferTargetList,
  SavedModelId,
  SavedModelLike,
  SavedModelName,
} from '../../../types';

import {
  type ModelsOpts,
  _normalizeModel as _normalizeModelInternal,
  _normalizeList as _normalizeListInternal,
  normalizeModelsOpts,
  setModelsNormalizerInternal,
  setModelPresetsInternal,
  ensureModelsLoadedInternal,
  getAllModelsInternal,
  getModelByIdInternal,
  exportUserModelsInternal,
  mergeImportedModelsInternal,
  onModelsChangeInternal,
  offModelsChangeInternal,
} from './models_registry.js';
import {
  saveCurrentModelInternal,
  overwriteModelFromCurrentInternal,
  deleteModelByIdInternal,
  setModelLockedInternal,
  deleteTemporaryUserModelsInternal,
  moveModelInternal,
  transferModelInternal,
  applyModelInternal,
} from './models_apply_ops.js';
import { installModelsServiceSurface, type ModelsServiceOperations } from './models_surface_install.js';

type ModelsOptsLocal = ModelsLoadOptions;

function readModelsOpts(opts?: ModelsOptsLocal): ModelsOpts | undefined {
  return typeof opts === 'undefined' ? undefined : normalizeModelsOpts(opts);
}

function _normalizeModel(m: unknown): SavedModelLike | null {
  return _normalizeModelInternal(m);
}

function _normalizeList(list: unknown): SavedModelLike[] {
  return _normalizeListInternal(list);
}

export function setModelsNormalizer(App: AppContainer, fn: ModelsNormalizer | null): void {
  setModelsNormalizerInternal(App, fn);
}

export function setModelPresets(App: AppContainer, presetsArr: SavedModelLike[]): void {
  setModelPresetsInternal(App, presetsArr);
}

export function ensureModelsLoaded(App: AppContainer, opts?: ModelsOptsLocal): SavedModelLike[] {
  return ensureModelsLoadedInternal(App, readModelsOpts(opts));
}

export function getAllModels(App: AppContainer): SavedModelLike[] {
  return getAllModelsInternal(App);
}

export function getModelById(App: AppContainer, id: SavedModelId): SavedModelLike | null {
  return getModelByIdInternal(App, id);
}

export function exportUserModels(App: AppContainer): SavedModelLike[] {
  return exportUserModelsInternal(App);
}

export function mergeImportedModels(App: AppContainer, list: SavedModelLike[]): ModelsMergeResult {
  return mergeImportedModelsInternal(App, list);
}

export function saveCurrentModel(App: AppContainer, name: SavedModelName): ModelsSaveResult {
  return saveCurrentModelInternal(App, name);
}

export function overwriteModelFromCurrent(App: AppContainer, id: SavedModelId): ModelsCommandResult {
  return overwriteModelFromCurrentInternal(App, id);
}

export function deleteModelById(App: AppContainer, id: SavedModelId): ModelsCommandResult {
  return deleteModelByIdInternal(App, id);
}

function setModelLocked(App: AppContainer, id: SavedModelId, locked: boolean): ModelsLockResult {
  return setModelLockedInternal(App, id, locked);
}

function deleteTemporaryUserModels(App: AppContainer): ModelsDeleteTemporaryResult {
  return deleteTemporaryUserModelsInternal(App);
}

export function moveModel(
  App: AppContainer,
  id: SavedModelId,
  direction: ModelsMoveDirection
): ModelsCommandResult {
  return moveModelInternal(App, id, direction);
}

export function transferModel(
  App: AppContainer,
  id: SavedModelId,
  targetList: ModelsTransferTargetList,
  overId: SavedModelId | null,
  pos: ModelsTransferPosition
): ModelsCommandResult {
  return transferModelInternal(App, id, targetList, overId, pos);
}

export function applyModel(App: AppContainer, id: SavedModelId): ModelsCommandResult {
  return applyModelInternal(App, id);
}

export function onModelsChange(App: AppContainer, fn: ModelsChangeListener): void {
  return onModelsChangeInternal(App, fn);
}

export function offModelsChange(App: AppContainer, fn: ModelsChangeListener): void {
  return offModelsChangeInternal(App, fn);
}

const MODELS_SERVICE_OPERATIONS = {
  setModelsNormalizer,
  setModelPresets,
  ensureModelsLoaded,
  getAllModels,
  getModelById,
  saveCurrentModel,
  overwriteModelFromCurrent,
  deleteModelById,
  setModelLocked,
  deleteTemporaryUserModels,
  moveModel,
  transferModel,
  applyModel,
  exportUserModels,
  mergeImportedModels,
  onModelsChange,
  offModelsChange,
} satisfies ModelsServiceOperations;

export function installModelsService(App: AppContainer): ModelsServiceLike {
  if (!App || typeof App !== 'object') throw new Error('installModelsService(App): App is required');
  return installModelsServiceSurface(App, MODELS_SERVICE_OPERATIONS);
}
