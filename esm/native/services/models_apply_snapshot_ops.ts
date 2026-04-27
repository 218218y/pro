import type {
  AppContainer,
  ModelsCommandResult,
  ModelsSaveResult,
  SavedModelId,
  SavedModelName,
} from '../../../types';

import {
  _modelsReportNonFatal,
  getModelByIdInternal,
  readModelId,
  readModelName,
} from './models_registry.js';
import { getModelsRuntimeStateForApp } from './models_registry_state.js';
import { buildProjectStructureFromModel, captureCurrentSnapshot } from './models_apply_project.js';
import {
  cloneNormalizedModel,
  findModelIndexById,
  isLockedModel,
  isPresetModel,
  setLockedFlag,
} from './models_apply_state.js';
import { commitUserModelsMutation, ensureModelsCommandState } from './models_apply_ops_shared.js';

export function saveCurrentModelInternalImpl(App: AppContainer, name: SavedModelName): ModelsSaveResult {
  ensureModelsCommandState(App);

  const nm = name != null ? String(name).trim() : '';
  if (!nm) return { ok: false, reason: 'name' };

  const snap = captureCurrentSnapshot(App);
  if (!snap?.settings) return { ok: false, reason: 'capture' };

  const state = getModelsRuntimeStateForApp(App);
  const modelData = cloneNormalizedModel(App, {
    ...snap,
    id: `model_${Date.now()}`,
    name: nm,
    isPreset: false,
  });
  if (!modelData) return { ok: false, reason: 'normalize' };

  state.all.push(modelData);
  commitUserModelsMutation(App);
  return { ok: true, id: modelData.id };
}

export function overwriteModelFromCurrentInternalImpl(
  App: AppContainer,
  id: SavedModelId
): ModelsCommandResult {
  ensureModelsCommandState(App);
  if (!id) return { ok: false, reason: 'id' };

  const state = getModelsRuntimeStateForApp(App);
  const idx = findModelIndexById(App, id);
  if (idx === -1) return { ok: false, reason: 'missing' };

  const prev = state.all[idx] || getModelByIdInternal(App, id);
  if (isPresetModel(prev)) return { ok: false, reason: 'preset' };
  if (isLockedModel(prev)) return { ok: false, reason: 'locked' };

  const snap = captureCurrentSnapshot(App);
  if (!snap?.settings || !prev) return { ok: false, reason: 'capture' };

  const keepLocked = isLockedModel(prev);
  const prevId = readModelId(prev);
  const prevName = readModelName(prev) || prevId;
  const modelData = cloneNormalizedModel(App, {
    ...snap,
    id: prevId,
    name: prevName,
    isPreset: false,
    locked: keepLocked,
  });
  if (!modelData) return { ok: false, reason: 'normalize' };

  try {
    setLockedFlag(modelData, keepLocked);
  } catch (e) {
    _modelsReportNonFatal(App, 'overwriteModelFromCurrent.locked', e, 1500);
  }

  state.all[idx] = modelData;
  commitUserModelsMutation(App);
  return { ok: true };
}

export function buildProjectStructureFromCurrentModel(
  App: AppContainer,
  id: SavedModelId
): ReturnType<typeof buildProjectStructureFromModel> | null {
  ensureModelsCommandState(App);
  const modelData = getModelByIdInternal(App, id);
  if (!modelData) return null;
  return buildProjectStructureFromModel(App, modelData);
}
