import type {
  AppContainer,
  ModelsCommandResult,
  ModelsDeleteTemporaryResult,
  ModelsLockResult,
  ModelsMoveDirection,
  SavedModelId,
  SavedModelLike,
} from '../../../types';

import { _modelsReportNonFatal } from './models_registry.js';
import { getModelsRuntimeStateForApp } from './models_registry_state.js';
import {
  findModelIndexById,
  isLockedModel,
  isPresetModel,
  isUserPresetModel,
  setLockedFlag,
} from './models_apply_state.js';
import {
  commitPresetOrderMutation,
  commitUserModelsMutation,
  ensureModelsCommandState,
} from './models_apply_ops_shared.js';

export function deleteModelByIdInternalImpl(App: AppContainer, id: SavedModelId): ModelsCommandResult {
  ensureModelsCommandState(App);
  if (!id) return { ok: false, reason: 'id' };

  const state = getModelsRuntimeStateForApp(App);
  const idx = findModelIndexById(App, id);
  if (idx === -1) return { ok: false, reason: 'missing' };

  const model = state.all[idx];
  if (isPresetModel(model) && !isUserPresetModel(model)) return { ok: false, reason: 'preset' };
  if (isLockedModel(model)) return { ok: false, reason: 'locked' };

  state.all.splice(idx, 1);
  commitUserModelsMutation(App);
  return { ok: true };
}

export function setModelLockedInternalImpl(
  App: AppContainer,
  id: SavedModelId,
  locked: boolean
): ModelsLockResult {
  ensureModelsCommandState(App);
  if (!id) return { ok: false, reason: 'id' };

  const want = !!locked;
  const state = getModelsRuntimeStateForApp(App);
  const idx = findModelIndexById(App, id);
  if (idx === -1) return { ok: false, reason: 'missing' };

  const model = state.all[idx];
  if (isPresetModel(model) && !isUserPresetModel(model)) return { ok: false, reason: 'preset' };

  try {
    setLockedFlag(model, want);
  } catch (e) {
    _modelsReportNonFatal(App, 'setModelLocked', e, 1500);
  }

  commitUserModelsMutation(App);
  return { ok: true, locked: want };
}

export function deleteTemporaryUserModelsInternalImpl(App: AppContainer): ModelsDeleteTemporaryResult {
  ensureModelsCommandState(App);

  const state = getModelsRuntimeStateForApp(App);
  let removed = 0;
  const next: SavedModelLike[] = [];
  for (let i = 0; i < state.all.length; i++) {
    const model = state.all[i];
    if (!model) continue;
    if (model.isPreset || isLockedModel(model)) next.push(model);
    else removed += 1;
  }

  if (removed > 0) {
    state.all.splice(0, state.all.length, ...next);
    commitUserModelsMutation(App);
  }

  return { ok: true, removed };
}

export function moveModelInternalImpl(
  App: AppContainer,
  id: SavedModelId,
  direction: ModelsMoveDirection
): ModelsCommandResult {
  ensureModelsCommandState(App);
  if (!id) return { ok: false, reason: 'id' };

  const state = getModelsRuntimeStateForApp(App);
  const idx = findModelIndexById(App, id);
  if (idx === -1) return { ok: false, reason: 'missing' };

  const model = state.all[idx];
  const isPreset = isPresetModel(model);
  if (!isPreset && isLockedModel(model)) return { ok: false, reason: 'locked' };

  if (direction === 'up') {
    if (idx <= 0) return { ok: false, reason: 'edge' };
    const previous = state.all[idx - 1];
    if (isPreset) {
      if (!isPresetModel(previous)) return { ok: false, reason: 'edge' };
    } else if (isPresetModel(previous)) {
      return { ok: false, reason: 'overPreset' };
    }
    [state.all[idx - 1], state.all[idx]] = [state.all[idx], state.all[idx - 1]];
  } else if (direction === 'down') {
    if (idx >= state.all.length - 1) return { ok: false, reason: 'edge' };
    const next = state.all[idx + 1];
    if (isPreset && !isPresetModel(next)) return { ok: false, reason: 'edge' };
    [state.all[idx + 1], state.all[idx]] = [state.all[idx], state.all[idx + 1]];
  } else {
    return { ok: false, reason: 'direction' };
  }

  if (isPreset) commitPresetOrderMutation(App);
  else commitUserModelsMutation(App);
  return { ok: true };
}
