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
import { buildProjectStructureFromModel, captureCurrentSnapshot } from './models_apply_project.js';
import { cloneNormalizedModel, isLockedModel, isPresetModel, setLockedFlag } from './models_apply_state.js';
import { ensureModelsCommandState } from './models_apply_ops_shared.js';
import { runModelsCollectionsTransaction } from './models_collections_transaction.js';

export async function saveCurrentModelInternalImpl(
  App: AppContainer,
  name: SavedModelName
): Promise<ModelsSaveResult> {
  ensureModelsCommandState(App);

  const nm = name != null ? String(name).trim() : '';
  if (!nm) return { ok: false, reason: 'name' };

  const snap = captureCurrentSnapshot(App);
  if (!snap?.settings) return { ok: false, reason: 'capture' };

  const modelData = cloneNormalizedModel(App, {
    ...snap,
    id: `model_${Date.now()}`,
    name: nm,
    isPreset: false,
  });
  if (!modelData) return { ok: false, reason: 'normalize' };

  const transaction = await runModelsCollectionsTransaction<ModelsSaveResult>(App, snapshot => ({
    result: { ok: true, id: modelData.id },
    mutation: { savedModels: snapshot.envelope.savedModels.concat(modelData) },
  }));
  if (transaction.ok === false) {
    return { ok: false, reason: transaction.failure.reason, message: transaction.failure.message };
  }
  return transaction.value;
}

export async function overwriteModelFromCurrentInternalImpl(
  App: AppContainer,
  id: SavedModelId
): Promise<ModelsCommandResult> {
  ensureModelsCommandState(App);
  if (!id) return { ok: false, reason: 'id' };

  const snap = captureCurrentSnapshot(App);
  if (!snap?.settings) return { ok: false, reason: 'capture' };

  const transaction = await runModelsCollectionsTransaction<ModelsCommandResult>(App, snapshot => {
    const idx = snapshot.envelope.savedModels.findIndex(model => readModelId(model) === id);
    if (idx < 0) return { result: { ok: false, reason: 'missing' }, mutation: {} };
    const prev = snapshot.envelope.savedModels[idx];
    if (isPresetModel(prev)) return { result: { ok: false, reason: 'preset' }, mutation: {} };
    if (isLockedModel(prev)) return { result: { ok: false, reason: 'locked' }, mutation: {} };

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
    if (!modelData) return { result: { ok: false, reason: 'normalize' }, mutation: {} };
    try {
      setLockedFlag(modelData, keepLocked);
    } catch (e) {
      _modelsReportNonFatal(App, 'overwriteModelFromCurrent.locked', e, 1500);
    }
    const savedModels = snapshot.envelope.savedModels.slice();
    savedModels[idx] = modelData;
    return { result: { ok: true }, mutation: { savedModels } };
  });
  if (transaction.ok === false) {
    return { ok: false, reason: transaction.failure.reason, message: transaction.failure.message };
  }
  return transaction.value;
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
